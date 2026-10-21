import "server-only";
import { and, asc, desc, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import { expenses, patients, visits } from "@/db/schema";
import { balanceSql, searchCondition, visitAgg } from "@/server/patients";

const MAX_ROWS = 5000;

/** New OP cards issued between two dates. */
export async function opCardsReport(opts: { from: string; to: string }) {
  const where = and(gte(patients.registeredOn, opts.from), lte(patients.registeredOn, opts.to));
  const [rows, totals] = await Promise.all([
    db
      .select({
        cardNo: patients.cardNo,
        oldCardNo: patients.oldCardNo,
        date: patients.registeredOn,
        name: patients.name,
        address: patients.address,
        phone: patients.phone,
        referredBy: patients.referredBy,
        cardFee: patients.cardFee,
      })
      .from(patients)
      .where(where)
      .orderBy(asc(patients.registeredOn), asc(patients.cardNo))
      .limit(MAX_ROWS),
    db
      .select({
        n: sql<number>`count(*)`.mapWith(Number),
        amount: sql<number>`coalesce(sum(${patients.cardFee}), 0)`.mapWith(Number),
        free: sql<number>`count(*) filter (where ${patients.cardFee} = 0)`.mapWith(Number),
      })
      .from(patients)
      .where(where),
  ]);
  return { rows, count: totals[0]!.n, amount: totals[0]!.amount, free: totals[0]!.free };
}

/** Patients who owe money (balance > 0), biggest first. */
export async function duesReport(opts: { q?: string; min?: number } = {}) {
  const agg = visitAgg();
  const attended = sql`coalesce(${agg.attended}, 0)`;
  const paid = sql`coalesce(${agg.paid}, 0)`;
  const balance = balanceSql(attended, paid);
  const rows = await db
    .select({
      cardNo: patients.cardNo,
      name: patients.name,
      address: patients.address,
      phone: patients.phone,
      archived: sql<boolean>`${patients.deletedAt} is not null`,
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
    .where(and(searchCondition(opts.q ?? ""), sql`${balance} > ${opts.min ?? 0}`))
    .orderBy(desc(balance), asc(patients.cardNo));
  const total = rows.reduce((s, r) => s + r.balance, 0);
  return { rows, total };
}

/** Income (card fees + treatment payments) and expenses per month between two dates. */
export async function monthlySummary(opts: { from: string; to: string }) {
  const ym = (col: unknown) => sql<string>`to_char(${col}, 'YYYY-MM')`;
  const [cardRows, visitRows, expRows] = await Promise.all([
    db
      .select({ month: ym(patients.registeredOn), cards: sql<number>`coalesce(sum(${patients.cardFee}), 0)`.mapWith(Number), n: sql<number>`count(*)`.mapWith(Number) })
      .from(patients)
      .where(and(gte(patients.registeredOn, opts.from), lte(patients.registeredOn, opts.to)))
      .groupBy(ym(patients.registeredOn)),
    db
      .select({
        month: ym(visits.visitDate),
        payments: sql<number>`coalesce(sum(${visits.payment}), 0)`.mapWith(Number),
        sittings: sql<number>`count(*) filter (where ${visits.attended})`.mapWith(Number),
        patients: sql<number>`count(distinct ${visits.patientId}) filter (where ${visits.attended})`.mapWith(Number),
      })
      .from(visits)
      .where(and(gte(visits.visitDate, opts.from), lte(visits.visitDate, opts.to)))
      .groupBy(ym(visits.visitDate)),
    db
      .select({ month: ym(expenses.expenseDate), total: sql<number>`coalesce(sum(${expenses.amount}), 0)`.mapWith(Number) })
      .from(expenses)
      .where(and(gte(expenses.expenseDate, opts.from), lte(expenses.expenseDate, opts.to)))
      .groupBy(ym(expenses.expenseDate)),
  ]);

  const months = new Set<string>([...cardRows.map((m) => m.month), ...visitRows.map((m) => m.month), ...expRows.map((m) => m.month)]);
  const rows = [...months].sort().map((m) => {
    const c = cardRows.find((x) => x.month === m);
    const v = visitRows.find((x) => x.month === m);
    const e = expRows.find((x) => x.month === m);
    const cards = c?.cards ?? 0;
    const sittings = v?.payments ?? 0;
    const expensesTotal = e?.total ?? 0;
    return {
      month: m,
      newPatients: c?.n ?? 0,
      attendedSittings: v?.sittings ?? 0,
      uniquePatients: v?.patients ?? 0,
      cards,
      sittings,
      income: cards + sittings,
      expenses: expensesTotal,
      net: cards + sittings - expensesTotal,
    };
  });
  const sum = (k: keyof (typeof rows)[number]) => rows.reduce((t, r) => t + Number(r[k]), 0);
  return {
    rows,
    totals: {
      newPatients: sum("newPatients"),
      attendedSittings: sum("attendedSittings"),
      cards: sum("cards"),
      sittings: sum("sittings"),
      income: sum("income"),
      expenses: sum("expenses"),
      net: sum("net"),
    },
  };
}
