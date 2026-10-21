"use client";

import { createExpenseAction, updateExpenseAction } from "@/actions/expenses";
import { ActionForm, Field, TextAreaField } from "@/components/forms";

export function ExpenseForm({ mode, defaults, maxDate, cancelHref }: {
  mode: "create" | "edit";
  defaults: { id?: string; date: string; title: string; amount: number | ""; notes: string };
  maxDate: string;
  cancelHref?: string;
}) {
  return (
    <ActionForm action={mode === "create" ? createExpenseAction : updateExpenseAction} submitLabel={mode === "create" ? "Add expense" : "Save changes"} resetOnSuccess={mode === "create"} cancelHref={cancelHref}>
      {defaults.id && <input type="hidden" name="id" value={defaults.id} />}
      <div className="grid gap-4 sm:grid-flow-dense sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Date" name="date" type="date" defaultValue={defaults.date} max={maxDate} required />
        <Field label="Expense (what was it for?)" name="title" defaultValue={defaults.title} required maxLength={150} className="sm:col-span-2" placeholder="Write your own…" />
        <Field label="Amount (₹)" name="amount" type="number" min={0.01} step="0.01" inputMode="decimal" defaultValue={defaults.amount} required />
      </div>
      <TextAreaField label="Notes (optional)" name="notes" defaultValue={defaults.notes} rows={2} maxLength={1000} />
    </ActionForm>
  );
}
