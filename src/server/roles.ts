import "server-only";
import { asc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { roles, users } from "@/db/schema";

export async function listRoles() {
  return db
    .select({
      id: roles.id,
      key: roles.key,
      name: roles.name,
      description: roles.description,
      permissions: roles.permissions,
      isSystem: roles.isSystem,
      userCount: sql<number>`(select count(*) from ${users} where ${users.roleId} = ${roles.id})`.mapWith(Number),
    })
    .from(roles)
    .orderBy(sql`${roles.key} = 'admin' desc`, asc(roles.name));
}

export async function getRole(id: string) {
  const rows = await db.select().from(roles).where(eq(roles.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function roleOptions() {
  return db.select({ id: roles.id, name: roles.name, key: roles.key }).from(roles).orderBy(sql`${roles.key} = 'admin' desc`, asc(roles.name));
}
