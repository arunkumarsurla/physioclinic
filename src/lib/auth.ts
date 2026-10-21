import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, lt } from "drizzle-orm";
import { db } from "@/db";
import { roles, sessions, users } from "@/db/schema";
import { ALL_PERMISSIONS, isPermissionKey, type PermissionKey } from "@/lib/permissions";
import { clientIp } from "@/lib/audit";

export const SESSION_COOKIE = "clinic_session";
const SESSION_HOURS = Math.max(1, Number(process.env.SESSION_HOURS) || 12);
const TOUCH_AFTER_MS = 10 * 60 * 1000;

export type SessionUser = {
  id: string;
  sessionId: string;
  username: string;
  name: string;
  email: string | null;
  roleId: string;
  roleKey: string | null;
  roleName: string;
  permissions: PermissionKey[];
  mustChangePassword: boolean;
};

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_HOURS * 3600_000);
  const h = await headers();
  await db.insert(sessions).values({
    userId,
    tokenHash: sha256(token),
    expiresAt,
    ip: await clientIp(),
    userAgent: (h.get("user-agent") ?? "").slice(0, 300) || null,
  });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
  // opportunistic cleanup of expired sessions
  await db.delete(sessions).where(lt(sessions.expiresAt, new Date())).catch(() => {});
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await db.delete(sessions).where(eq(sessions.tokenHash, sha256(token))).catch(() => {});
  jar.delete(SESSION_COOKIE);
}

/** Current user (or null). Cached for the duration of one request. */
export const getSession = cache(async (): Promise<SessionUser | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const rows = await db
    .select({ s: sessions, u: users, r: roles })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .innerJoin(roles, eq(roles.id, users.roleId))
    .where(and(eq(sessions.tokenHash, sha256(token)), gt(sessions.expiresAt, new Date())))
    .limit(1);
  const row = rows[0];
  if (!row || !row.u.isActive) return null;

  if (Date.now() - row.s.lastSeenAt.getTime() > TOUCH_AFTER_MS) {
    await db.update(sessions).set({ lastSeenAt: new Date() }).where(eq(sessions.id, row.s.id)).catch(() => {});
  }

  const permissions: PermissionKey[] =
    row.r.key === "admin" ? [...ALL_PERMISSIONS] : row.r.permissions.filter(isPermissionKey);

  return {
    id: row.u.id,
    sessionId: row.s.id,
    username: row.u.username,
    name: row.u.name,
    email: row.u.email,
    roleId: row.r.id,
    roleKey: row.r.key,
    roleName: row.r.name,
    permissions,
    mustChangePassword: row.u.mustChangePassword,
  };
});

export const can = (user: Pick<SessionUser, "permissions">, perm: PermissionKey) => user.permissions.includes(perm);
export const canAny = (user: Pick<SessionUser, "permissions">, perms: PermissionKey[]) =>
  perms.some((p) => user.permissions.includes(p));

/** For pages / layouts: redirects to /login when signed out. */
export async function requireUser(opts?: { allowPasswordChange?: boolean }): Promise<SessionUser> {
  const user = await getSession();
  if (!user) redirect("/login");
  if (user.mustChangePassword && !opts?.allowPasswordChange) redirect("/account/password");
  return user;
}

/** For pages: signed in AND holds the permission, otherwise /forbidden. */
export async function requirePermission(perm: PermissionKey | PermissionKey[]): Promise<SessionUser> {
  const user = await requireUser();
  const needed = Array.isArray(perm) ? perm : [perm];
  if (!needed.some((p) => can(user, p))) redirect("/forbidden");
  return user;
}
