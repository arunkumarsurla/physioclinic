import { Card, Empty, ExportLink, FInput, FilterBar, FilterField, PageHeader, Stat, Table, td, tdr, th, thr, thead, tbody, StatGroup } from "@/components/ui";
import { PrintButton } from "@/components/forms";
import { can, requirePermission } from "@/lib/auth";
import { dateParam, fmtMonth, startOfFinancialYear, todayISO } from "@/lib/dates";
import { inr } from "@/lib/money";
import { qs } from "@/lib/utils";
import { monthlySummary } from "@/server/reports";

export const metadata = { title: "Monthly summary" };

export default async function Monthly({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requirePermission("reports:view");
  const s = await searchParams;
  const today = todayISO();
  const from = dateParam(s.from, startOfFinancialYear(today));
  const to = dateParam(s.to, today);
  const { rows, totals } = await monthlySummary({ from, to });
  return (
    <>
      <PageHeader title="Monthly summary" subtitle="Defaults to the current financial year (April – March)." back={{ href: "/reports", label: "Reports" }} actions={<>{can(user, "reports:export") && <ExportLink href={`/api/export/monthly${qs({ from, to })}`} />}<PrintButton /></>} />
      <FilterBar action="/reports/monthly">
        <FilterField label="From"><FInput type="date" name="from" defaultValue={from} /></FilterField>
        <FilterField label="To"><FInput type="date" name="to" defaultValue={to} /></FilterField>
      </FilterBar>
      <StatGroup cols={4} className="mb-5">
        <Stat label="Income" value={inr(totals.income)} tone="good" /><Stat label="Expenses" value={inr(totals.expenses)} tone="bad" />
        <Stat label="Net" value={inr(totals.net)} tone={totals.net < 0 ? "bad" : "good"} /><Stat label="Sittings attended" value={totals.attendedSittings.toLocaleString("en-IN")} sub={`${totals.newPatients} new patients`} />
      </StatGroup>
      <Card flush>
        {rows.length === 0 ? <Empty>No data in this period.</Empty> : (
          <Table>
            <thead className={thead}><tr><th className={th}>Month</th><th className={thr}>New patients</th><th className={thr}>Sittings</th><th className={thr}>Card fees</th><th className={thr}>Treatment fees</th><th className={thr}>Income</th><th className={thr}>Expenses</th><th className={thr}>Net</th></tr></thead>
            <tbody className={tbody}>
              {rows.map((m) => (
                <tr key={m.month}>
                  <td data-label="Month" data-primary className={`${td} font-medium`}>{fmtMonth(m.month)}</td><td data-label="New patients" className={tdr}>{m.newPatients}</td><td data-label="Sittings" className={tdr}>{m.attendedSittings}</td>
                  <td data-label="Card fees" className={tdr}>{inr(m.cards)}</td><td data-label="Treatment fees" className={tdr}>{inr(m.sittings)}</td>
                  <td data-label="Income" className={tdr}>{inr(m.income)}</td><td data-label="Expenses" className={tdr}>{inr(m.expenses)}</td><td data-label="Net" className={`${tdr} font-medium ${m.net < 0 ? "text-red-700" : ""}`}>{inr(m.net)}</td>
                </tr>
              ))}
              <tr className="bg-zinc-50 font-semibold"><td data-label="Month" data-primary className={td}>Total</td><td data-label="New patients" className={tdr}>{totals.newPatients}</td><td data-label="Sittings" className={tdr}>{totals.attendedSittings}</td><td data-label="Card fees" className={tdr}>{inr(totals.cards)}</td><td data-label="Treatment fees" className={tdr}>{inr(totals.sittings)}</td><td data-label="Income" className={tdr}>{inr(totals.income)}</td><td data-label="Expenses" className={tdr}>{inr(totals.expenses)}</td><td data-label="Net" className={tdr}>{inr(totals.net)}</td></tr>
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}
