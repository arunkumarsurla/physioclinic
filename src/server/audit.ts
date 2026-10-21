import "server-only";
import { and, desc, eq, gte, ilike, lt, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { auditLogs } from "@/db/schema";
import { addDays } from "@/lib/dates";
import { likeEscape } from "@/lib/utils";

export type AuditFilters = { q?: string; entity?: string; userId?: string; from?: string; to?: string };

export async function listAudit(f: AuditFilters, page = 1, pageSize = 50) {
  const c: (SQL | undefined)[] = [];
  if (f.entity) c.push(eq(auditLogs.entity, f.entity));
  if (f.userId) c.push(eq(auditLogs.userId, f.userId));
  if (f.from) c.push(gte(auditLogs.createdAt, sql`(${f.from}::date)::timestamp AT TIME ZONE ${process.env.APP_TIMEZONE || "Asia/Kolkata"}`));
  if (f.to) c.push(lt(auditLogs.createdAt, sql`(${addDays(f.to, 1)}::date)::timestamp AT TIME ZONE ${process.env.APP_TIMEZONE || "Asia/Kolkata"}`));
  if (f.q?.trim()) {
    const like = `%${likeEscape(f.q.trim())}%`;
    c.push(or(ilike(auditLogs.summary, like), ilike(auditLogs.userName, like), ilike(auditLogs.entityId, like)));
  }
  const where = and(...c);
  const [rows, total, entities] = await Promise.all([
    db.select().from(auditLogs).where(where).orderBy(desc(auditLogs.createdAt)).limit(pageSize).offset((page - 1) * pageSize),
    db.select({ n: sql<number>`count(*)`.mapWith(Number) }).from(auditLogs).where(where),
    db.selectDistinct({ entity: auditLogs.entity }).from(auditLogs).orderBy(auditLogs.entity),
  ]);
  return { rows, total: total[0]?.n ?? 0, entities: entities.map((e) => e.entity), page, pageSize };
}
