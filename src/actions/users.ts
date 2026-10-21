"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { roles, sessions, users } from "@/db/schema";
import { ActionError, run } from "@/lib/action";
import type { ActionState } from "@/lib/action-types";
import { audit } from "@/lib/audit";
import { bool, optText, parseForm, reqText } from "@/lib/forms";
import { generatePassword, hashPassword, passwordProblem } from "@/lib/password";
import { countActiveAdmins, getUser } from "@/server/users";

const username = z.preprocess(
  (v) => (typeof v === "string" ? v.trim().toLowerCase() : v),
  z.string().regex(/^[a-z0-9._-]{3,40}$/, "3–40 characters: letters, numbers, dot, dash, underscore"),
) as unknown as z.ZodType<string>;

const profile = {
  name: reqText("Full name", 120),
  email: optText(150),
  phone: optText(40),
  roleId: z.string().uuid("Choose a role"),
};

function resolvePassword(raw: string | null | undefined, uname: string) {
  const given = (raw ?? "").trim();
  if (!given) return { password: generatePassword(), generated: true };
  const problem = passwordProblem(given, uname);
  if (problem) throw new ActionError("Please fix the highlighted fields.", { password: problem });
  return { password: given, generated: false };
}

export async function createUserAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  return run("users:manage", async (actor) => {
    const d = parseForm(z.object({ ...profile, username, password: optText(100), mustChangePassword: bool }), fd);
    if (!(await db.select({ id: roles.id }).from(roles).where(eq(roles.id, d.roleId)).limit(1)).length)
      throw new ActionError("Please fix the highlighted fields.", { roleId: "Role not found" });
    const { password, generated } = resolvePassword(d.password, d.username);
    const [row] = await db
      .insert(users)
      .values({ username: d.username, name: d.name, email: d.email, phone: d.phone, roleId: d.roleId, passwordHash: await hashPassword(password), mustChangePassword: d.mustChangePassword })
      .returning({ id: users.id });
    await audit(actor, "CREATE", "user", row!.id, `Created user ${d.username} (${d.name})`);
    revalidatePath("/", "layout");
    return {
      ok: true,
      message: `User created.\nUsername: ${d.username}\n${generated ? "Temporary password" : "Password"}: ${password}\nShare this securely – it will not be shown again.`,
    };
  });
}

export async function updateUserAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  return run("users:manage", async (actor) => {
    const id = z.string().uuid().parse(fd.get("id"));
    const target = await getUser(id);
    if (!target) throw new ActionError("User not found.");
    const d = parseForm(z.object({ ...profile, isActive: bool }), fd);
    const newRole = (await db.select().from(roles).where(eq(roles.id, d.roleId)).limit(1))[0];
    if (!newRole) throw new ActionError("Please fix the highlighted fields.", { roleId: "Role not found" });

    if (id === actor.id && !d.isActive) throw new ActionError("You cannot deactivate your own account.");
    const losesAdmin = target.roleKey === "admin" && target.isActive && (newRole.key !== "admin" || !d.isActive);
    if (losesAdmin && (await countActiveAdmins(id)) === 0) throw new ActionError("This is the last active administrator – at least one must remain.");

    await db.update(users).set({ name: d.name, email: d.email, phone: d.phone, roleId: d.roleId, isActive: d.isActive, updatedAt: new Date() }).where(eq(users.id, id));
    if (!d.isActive) await db.delete(sessions).where(eq(sessions.userId, id));
    const bits = [target.roleId !== d.roleId ? `role → ${newRole.name}` : null, target.isActive !== d.isActive ? (d.isActive ? "activated" : "deactivated") : null].filter(Boolean);
    await audit(actor, "UPDATE", "user", id, `Updated user ${target.username}${bits.length ? ` (${bits.join(", ")})` : ""}`);
    revalidatePath("/", "layout");
    return { ok: true, message: "User updated." };
  });
}

export async function resetPasswordAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  return run("users:manage", async (actor) => {
    const id = z.string().uuid().parse(fd.get("id"));
    const target = await getUser(id);
    if (!target) throw new ActionError("User not found.");
    const { password, generated } = resolvePassword(optText(100).parse(fd.get("password")), target.username);
    await db.update(users).set({ passwordHash: await hashPassword(password), mustChangePassword: true, updatedAt: new Date() }).where(eq(users.id, id));
    await db.delete(sessions).where(eq(sessions.userId, id));
    await audit(actor, "PASSWORD_RESET", "user", id, `Reset password for ${target.username}`);
    return {
      ok: true,
      message: `Password reset. ${target.username} will be asked to change it at next sign-in, and was signed out everywhere.\n${generated ? "Temporary password" : "Password"}: ${password}\nShare this securely – it will not be shown again.`,
    };
  });
}

export async function revokeSessionsAction(fd: FormData): Promise<ActionState> {
  return run("users:manage", async (actor) => {
    const id = z.string().uuid().parse(fd.get("id"));
    const target = await getUser(id);
    if (!target) throw new ActionError("User not found.");
    await db.delete(sessions).where(eq(sessions.userId, id));
    await audit(actor, "REVOKE_SESSIONS", "user", id, `Signed ${target.username} out of all devices`);
    revalidatePath("/", "layout");
  });
}
