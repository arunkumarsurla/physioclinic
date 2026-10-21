import "server-only";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { patients, visits } from "@/db/schema";
import { balanceSql, visitAgg } from "@/server/patients";

/** Everything recorded for one calendar day (the "daily register"). */
export async function listVisitsOnDate(date: string) {
  const agg = visitAgg();
  const attended = sql`coalesce(${agg.attended}, 0)`;
  const paid = sql`coalesce(${agg.paid}, 0)`;
  return db
    .select({
      id: visits.id,
      patientId: patients.id,
      cardNo: patients.cardNo,
      name: patients.name,
      address: patients.address,
      phone: patients.phone,
      attended: visits.attended,
      payment: visits.payment,
      note: visits.note,
      totalAttended: sql<number>`coalesce(${agg.attended}, 0)`.mapWith(Number),
      balance: balanceSql(attended, paid),
    })
    .from(visits)
    .innerJoin(patients, eq(patients.id, visits.patientId))
    .leftJoin(agg, eq(agg.patientId, patients.id))
    .where(eq(visits.visitDate, date))
    .orderBy(asc(visits.createdAt));
}

export async function daySummary(date: string) {
  const [v, c] = await Promise.all([
    db
      .select({
        attended: sql<number>`count(*) filter (where ${visits.attended})`.mapWith(Number),
        absent: sql<number>`count(*) filter (where not ${visits.attended})`.mapWith(Number),
        payments: sql<number>`coalesce(sum(${visits.payment}), 0)`.mapWith(Number),
      })
      .from(visits)
      .where(eq(visits.visitDate, date)),
    db
      .select({
        cards: sql<number>`count(*) filter (where ${patients.cardFee} > 0)`.mapWith(Number),
        newPatients: sql<number>`count(*)`.mapWith(Number),
        cardFees: sql<number>`coalesce(sum(${patients.cardFee}), 0)`.mapWith(Number),
      })
      .from(patients)
      .where(eq(patients.registeredOn, date)),
  ]);
  return { ...v[0]!, ...c[0]! };
}

export async function getVisit(id: string) {
  const rows = await db
    .select({ v: visits, cardNo: patients.cardNo, name: patients.name })
    .from(visits)
    .innerJoin(patients, eq(patients.id, visits.patientId))
    .where(eq(visits.id, id))
    .limit(1);
  return rows[0] ?? null;
}

export async function upsertVisit(input: {
  patientId: string;
  date: string;
  attended: boolean;
  payment: number;
  note: string | null;
  userId: string;
}) {
  const existing = await db
    .select({ id: visits.id, attended: visits.attended, payment: visits.payment })
    .from(visits)
    .where(and(eq(visits.patientId, input.patientId), eq(visits.visitDate, input.date)))
    .limit(1);

  const rows = await db
    .insert(visits)
    .values({
      patientId: input.patientId,
      visitDate: input.date,
      attended: input.attended,
      payment: input.payment,
      note: input.note,
      recordedBy: input.userId,
    })
    .onConflictDoUpdate({
      target: [visits.patientId, visits.visitDate],
      set: {
        attended: input.attended,
        payment: input.payment,
        note: input.note,
        recordedBy: input.userId,
        updatedAt: new Date(),
      },
    })
    .returning({ id: visits.id });
  return { id: rows[0]!.id, previous: existing[0] ?? null };
}

export async function recentVisitsForPatient(patientId: string, limit = 5) {
  return db
    .select({ date: visits.visitDate, attended: visits.attended, payment: visits.payment })
    .from(visits)
    .where(eq(visits.patientId, patientId))
    .orderBy(desc(visits.visitDate))
    .limit(limit);
}
