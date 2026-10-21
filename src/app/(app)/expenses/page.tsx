import Link from "next/link";
import { deleteExpenseAction } from "@/actions/expenses";
import { ConfirmAction } from "@/components/forms";
import { ExpenseForm } from "@/components/expense-form";
import { Card, Empty, ExportLink, FInput, FilterBar, FilterField, PageHeader, Pagination, Stat, Table, td, tdr, th, thr, thead, tbody, linkAction, StatGroup } from "@/components/ui";
import { can, requirePermission } from "@/lib/auth";
import { dateParam, fmtDate, startOfMonth, todayISO } from "@/lib/dates";
import { inr } from "@/lib/money";
import { qs, sp, spInt } from "@/lib/utils";
import { listExpenses } from "@/server/expenses";

export const metadata = { title: "Expenses" };

export default async function Expenses({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requirePermission("expenses:view");
  const s = await searchParams;
  const today = todayISO();
  const from = dateParam(s.from, startOfMonth(today));
  const to = dateParam(s.to, today);
  const q = sp(s.q);
  const page = spInt(s.page, 1);
  const data = await listExpenses({ from, to, q }, page, 30);
  const params = { from, to, q };

  return (
    <>
      <PageHeader title="Expenses" subtitle={`${fmtDate(from)} – ${fmtDate(to)}`} actions={can(user, "reports:export") && <ExportLink href={`/api/export/expenses${qs(params)}`} />} />
      {can(user, "expenses:create") && (
        <Card title="Add an expense" className="mb-5">
          <ExpenseForm mode="create" maxDate={today} defaults={{ date: today, title: "", amount: "", notes: "" }} />
        </Card>
      )}
      <StatGroup cols={2} className="mb-5">
        <Stat label="Total expenses" value={inr(data.sum)} tone="bad" sub="for the period selected below" />
        <Stat label="Entries" value={data.total} sub={data.total ? `average ${inr(data.sum / data.total)}` : undefined} />
      </StatGroup>
      <FilterBar action="/expenses">
        <FilterField label="From"><FInput type="date" name="from" defaultValue={from} /></FilterField>
        <FilterField label="To"><FInput type="date" name="to" defaultValue={to} /></FilterField>
        <FilterField label="Search"><FInput name="q" defaultValue={q} placeholder="Expense or notes…" /></FilterField>
      </FilterBar>
      <Card flush>
        {data.rows.length === 0 ? <Empty>No expenses in this period.</Empty> : (
          <Table>
            <thead className={thead}><tr><th className={th}>Date</th><th className={th}>Expense</th><th className={th}>Notes</th><th className={thr}>Amount</th><th className={th}></th></tr></thead>
            <tbody className={tbody}>
              {data.rows.map((r) => (
                <tr key={r.id}>
                  <td data-label="Date" className={`${td} whitespace-nowrap`}>{fmtDate(r.date)}</td>
                  <td data-label="Expense" data-primary className={`${td} font-medium`}>{r.title}</td>
                  <td data-label="Notes" className={`${td} max-w-md whitespace-pre-line text-zinc-500`}>{r.notes}</td>
                  <td data-label="Amount" className={tdr}>{inr(r.amount)}</td>
                  <td className={`${td} no-print`}><span className="flex items-center justify-end gap-2">
                    {can(user, "expenses:edit") && <Link href={`/expenses/${r.id}`} className={linkAction}>Edit</Link>}
                    {can(user, "expenses:delete") && <ConfirmAction action={deleteExpenseAction} fields={{ id: r.id }} confirm={`Delete “${r.title}” (${inr(r.amount)})?`} label="Delete" successMessage="Expense deleted." />}
                  </span></td>
                </tr>
              ))}
              <tr className="bg-zinc-50 font-semibold"><td data-primary className={td} colSpan={3}>Total for the period ({data.total} entries)</td><td data-label="Amount" className={tdr}>{inr(data.sum)}</td><td /></tr>
            </tbody>
          </Table>
        )}
        <Pagination page={page} pageSize={data.pageSize} total={data.total} path="/expenses" params={params} />
      </Card>
    </>
  );
}
