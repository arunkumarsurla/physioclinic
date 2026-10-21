import "server-only";
import { and, asc, desc, eq, ilike, isNotNull, isNull, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { patients, visits } from "@/db/schema";
import { likeEscape } from "@/lib/utils";

/** Per-patient attendance / payment totals. */
export function visitAgg() {
  return db
    .select({
      patientId: visits.patientId,
      attended: sql<number>`count(*) filter (where ${visits.attended})`.mapWith(Number).as("att_count"),
      paid: sql<number>`coalesce(sum(${visits.payment}), 0)`.mapWith(Number).as("paid_total"),
      lastVisit: sql<string | null>`max(${visits.visitDate}) filter (where ${visits.attended})`.as("last_visit"),
    })
    .from(visits)
    .groupBy(visits.patientId)
    .as("agg");
}

/**
 * Outstanding balance, in SQL – identical to computeBilling() in src/lib/billing.ts
 * (positive = patient owes, negative = paid in advance, 0 = no billing plan).
 */
export function balanceSql(attended: SQL, paid: SQL): SQL<number> {
  return sql<number>`(CASE
    WHEN ${patients.fee} > 0 AND ${patients.forDays} > 0 AND ${patients.treatDays} > 0 THEN
      LEAST(
        CEIL(${patients.treatDays}::numeric / ${patients.forDays}),
        GREATEST(CEIL(${attended}::numeric / ${patients.forDays}), CEIL(${paid}::numeric / ${patients.fee}))
      ) * ${patients.fee} - ${paid}
    ELSE 0 END)::float8`.mapWith(Number);
}

export type PatientListParams = {
  q?: string;
  status?: "active" | "archived" | "all";
  dues?: "all" | "due" | "advance";
  sort?: "card" | "name" | "recent" | "dues";
  page?: number;
  pageSize?: number;
};

export function searchCondition(q: string): SQL | undefined {
  const term = q.trim();
  if (!term) return undefined;
  const like = `%${likeEscape(term)}%`;
  const parts: (SQL | undefined)[] = [
    ilike(patients.name, like),
    ilike(patients.address, like),
    ilike(patients.phone, like),
    ilike(patients.referredBy, like),
  ];
  if (/^\d{1,9}$/.test(term)) {
    parts.push(eq(patients.cardNo, Number(term)), eq(patients.oldCardNo, Number(term)));
  }
  return or(...parts);
}

export async function listPatients(params: PatientListParams = {}) {
  const { q = "", status = "active", dues = "all", sort = "card", page = 1, pageSize = 25 } = params;
  const agg = visitAgg();
  const attended = sql`coalesce(${agg.attended}, 0)`;
  const paid = sql`coalesce(${agg.paid}, 0)`;
  const balance = balanceSql(attended, paid);

  const conds: (SQL | undefined)[] = [searchCondition(q)];
  if (status === "active") conds.push(isNull(patients.deletedAt));
  if (status === "archived") conds.push(isNotNull(patients.deletedAt));
  if (dues === "due") conds.push(sql`${balance} > 0`);
  if (dues === "advance") conds.push(sql`${balance} < 0`);
  const where = and(...conds);

  const order =
    sort === "name"
      ? [asc(sql`lower(${patients.name})`), desc(patients.cardNo)]
      : sort === "recent"
        ? [sql`${agg.lastVisit} DESC NULLS LAST`, desc(patients.cardNo)]
        : sort === "dues"
          ? [desc(balance), desc(patients.cardNo)]
          : [desc(patients.cardNo)];

  const [rows, totalRow] = await Promise.all([
    db
      .select({
        id: patients.id,
        cardNo: patients.cardNo,
        name: patients.name,
        address: patients.address,
        phone: patients.phone,
        age: patients.age,
        sex: patients.sex,
        registeredOn: patients.registeredOn,
        deletedAt: patients.deletedAt,
        treatDays: patients.treatDays,
        fee: patients.fee,
        forDays: patients.forDays,
        attended: sql<number>`coalesce(${agg.attended}, 0)`.mapWith(Number),
        paid: sql<number>`coalesce(${agg.paid}, 0)`.mapWith(Number),
        lastVisit: agg.lastVisit,
        balance,
      })
      .from(patients)
      .leftJoin(agg, eq(agg.patientId, patients.id))
      .where(where)
      .orderBy(...order)
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db
      .select({ n: sql<number>`count(*)`.mapWith(Number) })
      .from(patients)
      .leftJoin(agg, eq(agg.patientId, patients.id))
      .where(where),
  ]);

  return { rows, total: totalRow[0]?.n ?? 0, page, pageSize };
}

export async function getPatientByCardNo(cardNo: number) {
  if (!Number.isInteger(cardNo) || cardNo < 1 || cardNo > 2_000_000_000) return null;
  const rows = await db.select().from(patients).where(eq(patients.cardNo, cardNo)).limit(1);
  return rows[0] ?? null;
}

export async function getPatientTotals(patientId: string) {
  const rows = await db
    .select({
      attended: sql<number>`count(*) filter (where ${visits.attended})`.mapWith(Number),
      absent: sql<number>`count(*) filter (where not ${visits.attended})`.mapWith(Number),
      paid: sql<number>`coalesce(sum(${visits.payment}), 0)`.mapWith(Number),
      lastVisit: sql<string | null>`max(${visits.visitDate}) filter (where ${visits.attended})`,
    })
    .from(visits)
    .where(eq(visits.patientId, patientId));
  return rows[0] ?? { attended: 0, absent: 0, paid: 0, lastVisit: null };
}

export async function listPatientVisits(patientId: string) {
  return db
    .select({
      id: visits.id,
      date: visits.visitDate,
      attended: visits.attended,
      payment: visits.payment,
      note: visits.note,
    })
    .from(visits)
    .where(eq(visits.patientId, patientId))
    .orderBy(desc(visits.visitDate));
}
