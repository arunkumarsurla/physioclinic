import "server-only";
import { and, desc, eq, gte, gt, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import { expenses, patients, visits } from "@/db/schema";
import { addDays, startOfMonth } from "@/lib/dates";
import { balanceSql, visitAgg } from "@/server/patients";
import { daySummary } from "@/server/visits";

export async function getDashboard(today: string) {
  const monthStart = startOfMonth(today);
  const seriesFrom = addDays(today, -13);
  const agg = visitAgg();

  // FIX: raw SQL fields inside a subquery must have an alias
  const balance = sql<number>`${balanceSql(
    sql`coalesce(${agg.attended}, 0)`,
    sql`coalesce(${agg.paid}, 0)`,
  )}`.as("balance");

  const patientBalances = db
    .select({
      cardNo: patients.cardNo,
      name: patients.name,
      phone: patients.phone,
      balance,
    })
    .from(patients)
    .leftJoin(agg, eq(agg.patientId, patients.id))
    .as("patient_balances");

  const [day, cardsMonth, paysMonth, expMonth, cardSeries, paySeries, dueRows] = await Promise.all([
    daySummary(today),
    db
      .select({ n: sql<number>`coalesce(sum(${patients.cardFee}), 0)`.mapWith(Number) })
      .from(patients)
      .where(and(gte(patients.registeredOn, monthStart), lte(patients.registeredOn, today))),
    db
      .select({ n: sql<number>`coalesce(sum(${visits.payment}), 0)`.mapWith(Number) })
      .from(visits)
      .where(and(gte(visits.visitDate, monthStart), lte(visits.visitDate, today))),
    db
      .select({ n: sql<number>`coalesce(sum(${expenses.amount}), 0)`.mapWith(Number) })
      .from(expenses)
      .where(and(gte(expenses.expenseDate, monthStart), lte(expenses.expenseDate, today))),
    db
      .select({
        date: patients.registeredOn,
        amount: sql<number>`coalesce(sum(${patients.cardFee}), 0)`.mapWith(Number),
      })
      .from(patients)
      .where(and(gte(patients.registeredOn, seriesFrom), lte(patients.registeredOn, today)))
      .groupBy(patients.registeredOn),
    db
      .select({
        date: visits.visitDate,
        amount: sql<number>`coalesce(sum(${visits.payment}), 0)`.mapWith(Number),
      })
      .from(visits)
      .where(and(gte(visits.visitDate, seriesFrom), lte(visits.visitDate, today)))
      .groupBy(visits.visitDate),
    db
      .select({
        cardNo: patientBalances.cardNo,
        name: patientBalances.name,
        phone: patientBalances.phone,
        balance: patientBalances.balance,
        count: sql<number>`count(*) over ()`.mapWith(Number),
        total: sql<number>`coalesce(sum(${patientBalances.balance}) over (), 0)`.mapWith(Number),
      })
      .from(patientBalances)
      .where(gt(patientBalances.balance, 0))
      .orderBy(desc(patientBalances.balance))
      .limit(5),
  ]);

  const dues = dueRows[0]
    ? { count: dueRows[0].count, total: dueRows[0].total }
    : { count: 0, total: 0 };
  const topDues = dueRows.map(({ count: _count, total: _total, ...patient }) => patient);

  const byDate = new Map<string, number>();
  for (const r of [...cardSeries, ...paySeries]) {
    byDate.set(r.date, (byDate.get(r.date) ?? 0) + r.amount);
  }
  const last14 = Array.from({ length: 14 }, (_, i) => {
    const d = addDays(seriesFrom, i);
    return { date: d, amount: byDate.get(d) ?? 0 };
  });

  return {
    day,
    month: { income: cardsMonth[0]!.n + paysMonth[0]!.n, expenses: expMonth[0]!.n },
    last14,
    dues,
    topDues,
  };
}