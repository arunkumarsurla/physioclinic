import "server-only";
import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import { expenses, patients, visits } from "@/db/schema";
import { addDays, startOfMonth } from "@/lib/dates";
import { balanceSql, visitAgg } from "@/server/patients";
import { daySummary } from "@/server/visits";

export async function getDashboard(today: string) {
  const monthStart = startOfMonth(today);
  const seriesFrom = addDays(today, -13);
  const agg = visitAgg();
  const balance = balanceSql(sql`coalesce(${agg.attended}, 0)`, sql`coalesce(${agg.paid}, 0)`);

  const [day, cardsMonth, paysMonth, expMonth, cardSeries, paySeries, dues, topDues] = await Promise.all([
    daySummary(today),
    db.select({ n: sql<number>`coalesce(sum(${patients.cardFee}), 0)`.mapWith(Number) }).from(patients).where(and(gte(patients.registeredOn, monthStart), lte(patients.registeredOn, today))),
    db.select({ n: sql<number>`coalesce(sum(${visits.payment}), 0)`.mapWith(Number) }).from(visits).where(and(gte(visits.visitDate, monthStart), lte(visits.visitDate, today))),
    db.select({ n: sql<number>`coalesce(sum(${expenses.amount}), 0)`.mapWith(Number) }).from(expenses).where(and(gte(expenses.expenseDate, monthStart), lte(expenses.expenseDate, today))),
    db.select({ date: patients.registeredOn, amount: sql<number>`coalesce(sum(${patients.cardFee}), 0)`.mapWith(Number) }).from(patients).where(and(gte(patients.registeredOn, seriesFrom), lte(patients.registeredOn, today))).groupBy(patients.registeredOn),
    db.select({ date: visits.visitDate, amount: sql<number>`coalesce(sum(${visits.payment}), 0)`.mapWith(Number) }).from(visits).where(and(gte(visits.visitDate, seriesFrom), lte(visits.visitDate, today))).groupBy(visits.visitDate),
    db
      .select({
        count: sql<number>`count(*) filter (where ${balance} > 0)`.mapWith(Number),
        total: sql<number>`coalesce(sum(${balance}) filter (where ${balance} > 0), 0)`.mapWith(Number),
      })
      .from(patients)
      .leftJoin(agg, eq(agg.patientId, patients.id)),
    db
      .select({ cardNo: patients.cardNo, name: patients.name, phone: patients.phone, balance })
      .from(patients)
      .leftJoin(agg, eq(agg.patientId, patients.id))
      .orderBy(desc(balance))
      .limit(5),
  ]);

  const byDate = new Map<string, number>();
  for (const r of [...cardSeries, ...paySeries]) byDate.set(r.date, (byDate.get(r.date) ?? 0) + r.amount);
  const last14 = Array.from({ length: 14 }, (_, i) => {
    const d = addDays(seriesFrom, i);
    return { date: d, amount: byDate.get(d) ?? 0 };
  });

  return {
    day,
    month: { income: cardsMonth[0]!.n + paysMonth[0]!.n, expenses: expMonth[0]!.n },
    last14,
    dues: dues[0]!,
    topDues: topDues.filter((t) => t.balance > 0),
  };
}
