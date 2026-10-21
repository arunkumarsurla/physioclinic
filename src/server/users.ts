import "server-only";
import { and, asc, desc, eq, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { roles, sessions, users } from "@/db/schema";

export async function listUsers() {
  return db
    .select({
      id: users.id,
      username: users.username,
      name: users.name,
      email: users.email,
      phone: users.phone,
      isActive: users.isActive,
      lastLoginAt: users.lastLoginAt,
      createdAt: users.createdAt,
      roleId: roles.id,
      roleName: roles.name,
      roleKey: roles.key,
    })
    .from(users)
    .innerJoin(roles, eq(roles.id, users.roleId))
    .orderBy(desc(users.isActive), asc(users.name));
}

export async function getUser(id: string) {
  const rows = await db
    .select({
      id: users.id,
      username: users.username,
      name: users.name,
      email: users.email,
      phone: users.phone,
      isActive: users.isActive,
      mustChangePassword: users.mustChangePassword,
      lastLoginAt: users.lastLoginAt,
      createdAt: users.createdAt,
      roleId: roles.id,
      roleName: roles.name,
      roleKey: roles.key,
    })
    .from(users)
    .innerJoin(roles, eq(roles.id, users.roleId))
    .where(eq(users.id, id))
    .limit(1);
  return rows[0] ?? null;
}

export async function activeSessionCount(userId: string) {
  const r = await db
    .select({ n: sql<number>`count(*)`.mapWith(Number) })
    .from(sessions)
    .where(and(eq(sessions.userId, userId), sql`${sessions.expiresAt} > now()`));
  return r[0]?.n ?? 0;
}

/** Number of active users holding the Admin role, optionally excluding one user. */
export async function countActiveAdmins(excludeUserId?: string) {
  const r = await db
    .select({ n: sql<number>`count(*)`.mapWith(Number) })
    .from(users)
    .innerJoin(roles, eq(roles.id, users.roleId))
    .where(and(eq(roles.key, "admin"), eq(users.isActive, true), excludeUserId ? ne(users.id, excludeUserId) : undefined));
  return r[0]?.n ?? 0;
}
