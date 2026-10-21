"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { roles, users } from "@/db/schema";
import { ActionError, run } from "@/lib/action";
import type { ActionState } from "@/lib/action-types";
import { audit } from "@/lib/audit";
import { optText, parseForm, reqText } from "@/lib/forms";
import { normalizePermissions } from "@/lib/permissions";

const schema = z.object({
  name: reqText("Role name", 60),
  description: optText(200),
  permissions: z.preprocess((v) => (v == null ? [] : Array.isArray(v) ? v : [v]), z.array(z.string())) as unknown as z.ZodType<string[]>,
});

export async function createRoleAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const res = await run("roles:manage", async (actor) => {
    const d = parseForm(schema, fd);
    const permissions = normalizePermissions(d.permissions);
    const [row] = await db.insert(roles).values({ name: d.name, description: d.description, permissions }).returning({ id: roles.id });
    await audit(actor, "CREATE", "role", row!.id, `Created role ${d.name} (${permissions.length} permissions)`, { permissions });
    revalidatePath("/", "layout");
  });
  if (res.error) return res;
  redirect("/roles");
}

export async function updateRoleAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const res = await run("roles:manage", async (actor) => {
    const id = z.string().uuid().parse(fd.get("id"));
    const role = (await db.select().from(roles).where(eq(roles.id, id)).limit(1))[0];
    if (!role) throw new ActionError("Role not found.");
    if (role.key === "admin") throw new ActionError("The Admin role always has every permission and cannot be edited.");
    const d = parseForm(schema, fd);
    const permissions = normalizePermissions(d.permissions);
    await db.update(roles).set({ name: d.name, description: d.description, permissions, updatedAt: new Date() }).where(eq(roles.id, id));
    await audit(actor, "UPDATE", "role", id, `Updated role ${d.name} (${permissions.length} permissions)`, { before: role.permissions, after: permissions });
    revalidatePath("/", "layout");
  });
  if (res.error) return res;
  redirect("/roles");
}

export async function deleteRoleAction(fd: FormData): Promise<ActionState> {
  return run("roles:manage", async (actor) => {
    const id = z.string().uuid().parse(fd.get("id"));
    const role = (await db.select().from(roles).where(eq(roles.id, id)).limit(1))[0];
    if (!role) throw new ActionError("Role not found.");
    if (role.isSystem) throw new ActionError("Built-in roles cannot be deleted.");
    const inUse = await db.select({ id: users.id }).from(users).where(eq(users.roleId, id)).limit(1);
    if (inUse.length) throw new ActionError("This role is assigned to users. Move them to another role first.");
    await db.delete(roles).where(eq(roles.id, id));
    await audit(actor, "DELETE", "role", id, `Deleted role ${role.name}`);
    revalidatePath("/", "layout");
  });
}
