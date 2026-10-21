"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { expenses } from "@/db/schema";
import { ActionError, run } from "@/lib/action";
import type { ActionState } from "@/lib/action-types";
import { audit } from "@/lib/audit";
import { fmtDate, todayISO } from "@/lib/dates";
import { isoDate, optText, parseForm, reqText } from "@/lib/forms";
import { inr } from "@/lib/money";

const schema = z.object({
  date: isoDate("Date"),
  title: reqText("Expense", 150),
  amount: z.preprocess(
    (v) => Number(String(v ?? "").replace(/,/g, "")),
    z.number("Enter the amount").gt(0, "Amount must be greater than zero").max(100_000_000, "Amount is too large").refine((n) => Math.abs(n * 100 - Math.round(n * 100)) < 1e-6, "Use at most 2 decimal places"),
  ) as unknown as z.ZodType<number>,
  notes: optText(1000),
});

function parse(fd: FormData) {
  const d = parseForm(schema, fd);
  if (d.date > todayISO()) throw new ActionError("Please fix the highlighted fields.", { date: "Date cannot be in the future" });
  return d;
}

export async function createExpenseAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  return run("expenses:create", async (user) => {
    const d = parse(fd);
    const [row] = await db.insert(expenses).values({ expenseDate: d.date, title: d.title, amount: d.amount, notes: d.notes, createdBy: user.id }).returning({ id: expenses.id });
    await audit(user, "CREATE", "expense", row!.id, `Added expense ${inr(d.amount)} – ${d.title} (${fmtDate(d.date)})`);
    revalidatePath("/", "layout");
    return { ok: true, message: `Saved: ${d.title} – ${inr(d.amount)}` };
  });
}

export async function updateExpenseAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const res = await run("expenses:edit", async (user) => {
    const id = z.string().uuid().parse(fd.get("id"));
    const before = (await db.select().from(expenses).where(eq(expenses.id, id)).limit(1))[0];
    if (!before) throw new ActionError("Expense not found.");
    const d = parse(fd);
    await db.update(expenses).set({ expenseDate: d.date, title: d.title, amount: d.amount, notes: d.notes, updatedAt: new Date() }).where(eq(expenses.id, id));
    await audit(user, "UPDATE", "expense", id, `Edited expense – ${d.title} (${inr(d.amount)}, ${fmtDate(d.date)})`, {
      before: { date: before.expenseDate, title: before.title, amount: before.amount, notes: before.notes },
      after: d,
    });
    revalidatePath("/", "layout");
  });
  if (res.error) return res;
  redirect("/expenses");
}

export async function deleteExpenseAction(fd: FormData): Promise<ActionState> {
  return run("expenses:delete", async (user) => {
    const id = z.string().uuid().parse(fd.get("id"));
    const row = (await db.select().from(expenses).where(eq(expenses.id, id)).limit(1))[0];
    if (!row) throw new ActionError("Expense not found (already deleted?).");
    await db.delete(expenses).where(eq(expenses.id, id));
    await audit(user, "DELETE", "expense", id, `Deleted expense – ${row.title} (${inr(row.amount)}, ${fmtDate(row.expenseDate)})`, { ...row });
    revalidatePath("/", "layout");
  });
}
