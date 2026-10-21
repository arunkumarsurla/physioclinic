import { notFound } from "next/navigation";
import { z } from "zod";
import { ExpenseForm } from "@/components/expense-form";
import { Card, PageHeader } from "@/components/ui";
import { requirePermission } from "@/lib/auth";
import { todayISO } from "@/lib/dates";
import { getExpense } from "@/server/expenses";

export const metadata = { title: "Edit expense" };

export default async function EditExpense({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("expenses:edit");
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const e = await getExpense(id);
  if (!e) notFound();
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Edit expense" back={{ href: "/expenses", label: "Expenses" }} />
      <Card><ExpenseForm mode="edit" maxDate={todayISO()} cancelHref="/expenses" defaults={{ id: e.id, date: e.expenseDate, title: e.title, amount: e.amount, notes: e.notes ?? "" }} /></Card>
    </div>
  );
}
