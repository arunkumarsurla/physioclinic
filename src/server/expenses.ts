import "server-only";
import { and, desc, eq, gte, ilike, lte, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { expenses } from "@/db/schema";
import { likeEscape } from "@/lib/utils";

export type ExpenseFilters = { from?: string; to?: string; q?: string };

function where(f: ExpenseFilters): SQL | undefined {
  const c: (SQL | undefined)[] = [];
  if (f.from) c.push(gte(expenses.expenseDate, f.from));
  if (f.to) c.push(lte(expenses.expenseDate, f.to));
  if (f.q?.trim()) {
    const like = `%${likeEscape(f.q.trim())}%`;
    c.push(or(ilike(expenses.title, like), ilike(expenses.notes, like)));
  }
  return and(...c);
}

export async function listExpenses(f: ExpenseFilters, page = 1, pageSize = 30) {
  const w = where(f);
  const [rows, totals] = await Promise.all([
    db
      .select({ id: expenses.id, date: expenses.expenseDate, title: expenses.title, amount: expenses.amount, notes: expenses.notes })
      .from(expenses)
      .where(w)
      .orderBy(desc(expenses.expenseDate), desc(expenses.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db
      .select({
        n: sql<number>`count(*)`.mapWith(Number),
        total: sql<number>`coalesce(sum(${expenses.amount}), 0)`.mapWith(Number),
      })
      .from(expenses)
      .where(w),
  ]);
  return { rows, total: totals[0]!.n, sum: totals[0]!.total, page, pageSize };
}

export async function getExpense(id: string) {
  const rows = await db.select().from(expenses).where(eq(expenses.id, id)).limit(1);
  return rows[0] ?? null;
}
