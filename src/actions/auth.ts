"use server";

import { and, eq, gt, ne, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { loginAttempts, sessions, users } from "@/db/schema";
import { run, ActionError } from "@/lib/action";
import type { ActionState } from "@/lib/action-types";
import { audit, clientIp } from "@/lib/audit";
import { createSession, destroySession, getSession } from "@/lib/auth";
import { parseForm } from "@/lib/forms";
import { dummyHash, hashPassword, passwordProblem, verifyPassword } from "@/lib/password";

const MAX_FAILURES = 5;
const WINDOW_MINUTES = 15;

function safeNext(v: string | undefined): string {
  return v && v.startsWith("/") && !v.startsWith("//") && !v.startsWith("/login") ? v : "/";
}

export async function loginAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const { username, password, next } = parseForm(
      z.object({ username: z.string().trim().min(1, "Enter your username").max(100), password: z.string().min(1, "Enter your password").max(200), next: z.string().optional() }),
      fd,
    );
    const uname = username.toLowerCase();
    const ip = await clientIp();

    const failures = await db
      .select({ n: sql<number>`count(*)`.mapWith(Number) })
      .from(loginAttempts)
      .where(
        and(
          sql`lower(${loginAttempts.username}) = ${uname}`,
          eq(loginAttempts.success, false),
          gt(loginAttempts.createdAt, sql`now() - make_interval(mins => ${WINDOW_MINUTES})`),
        ),
      );
    if ((failures[0]?.n ?? 0) >= MAX_FAILURES) {
      return { error: `Too many failed attempts. Please wait ${WINDOW_MINUTES} minutes and try again.` };
    }

    const found = await db.select().from(users).where(sql`lower(${users.username}) = ${uname}`).limit(1);
    const user = found[0];
    // Always run a bcrypt compare so response time doesn't reveal whether the username exists.
    const valid = await verifyPassword(password, user?.passwordHash ?? (await dummyHash()));

    if (!user || !valid || !user.isActive) {
      await db.insert(loginAttempts).values({ username: uname, ip, success: false });
      if (user && valid && !user.isActive) return { error: "This account has been deactivated. Contact an administrator." };
      return { error: "Incorrect username or password." };
    }

    await db.insert(loginAttempts).values({ username: uname, ip, success: true });
    await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));
    await createSession(user.id);
    await audit({ id: user.id, name: user.name }, "LOGIN", "user", user.id, `${user.name} signed in`);
    redirect(safeNext(next));
  } catch (e) {
    if (e instanceof ActionError) return { error: e.message, fieldErrors: e.fieldErrors };
    if (typeof e === "object" && e && "digest" in e) throw e; // redirect
    console.error("login failed", e);
    return { error: "Could not sign in right now. Please try again." };
  }
}

export async function logoutAction() {
  const user = await getSession();
  if (user) await audit(user, "LOGOUT", "user", user.id, `${user.name} signed out`);
  await destroySession();
  redirect("/login");
}

export async function changePasswordAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return run(
    null,
    async (user) => {
      const { current, next, confirm } = parseForm(
        z.object({ current: z.string().min(1, "Enter your current password"), next: z.string().min(1, "Enter a new password"), confirm: z.string() }),
        fd,
      );
      if (next !== confirm) throw new ActionError("Please fix the highlighted fields.", { confirm: "Passwords do not match" });
      const problem = passwordProblem(next, user.username);
      if (problem) throw new ActionError("Please fix the highlighted fields.", { next: problem });

      const row = (await db.select({ hash: users.passwordHash }).from(users).where(eq(users.id, user.id)).limit(1))[0]!;
      if (!(await verifyPassword(current, row.hash))) throw new ActionError("Please fix the highlighted fields.", { current: "Current password is incorrect" });
      if (current === next) throw new ActionError("Please fix the highlighted fields.", { next: "Choose a different password from the current one" });

      await db.update(users).set({ passwordHash: await hashPassword(next), mustChangePassword: false, updatedAt: new Date() }).where(eq(users.id, user.id));
      // sign out every other device
      await db.delete(sessions).where(and(eq(sessions.userId, user.id), ne(sessions.id, user.sessionId)));
      await audit(user, "PASSWORD_CHANGE", "user", user.id, `${user.name} changed their password`);
      if (user.mustChangePassword) redirect("/");
      return { ok: true, message: "Password updated. Other devices have been signed out." };
    },
    { allowPasswordChange: true },
  );
}
