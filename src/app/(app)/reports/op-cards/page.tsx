import Link from "next/link";
import { Card, Empty, ExportLink, FInput, FilterBar, FilterField, PageHeader, Stat, Table, td, tdr, th, thr, thead, tbody, StatGroup } from "@/components/ui";
import { PrintButton } from "@/components/forms";
import { can, requirePermission } from "@/lib/auth";
import { dateParam, fmtDate, startOfMonth, todayISO } from "@/lib/dates";
import { inr } from "@/lib/money";
import { qs } from "@/lib/utils";
import { opCardsReport } from "@/server/reports";

export const metadata = { title: "OP cards issued" };

export default async function OpCards({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requirePermission("reports:view");
  const s = await searchParams;
  const today = todayISO();
  const from = dateParam(s.from, startOfMonth(today));
  const to = dateParam(s.to, today);
  const r = await opCardsReport({ from, to });
  return (
    <>
      <PageHeader title="OP cards issued" subtitle={`${fmtDate(from)} – ${fmtDate(to)}`} back={{ href: "/reports", label: "Reports" }} actions={<>{can(user, "reports:export") && <ExportLink href={`/api/export/op-cards${qs({ from, to })}`} />}<PrintButton /></>} />
      <FilterBar action="/reports/op-cards">
        <FilterField label="From"><FInput type="date" name="from" defaultValue={from} /></FilterField>
        <FilterField label="To"><FInput type="date" name="to" defaultValue={to} /></FilterField>
      </FilterBar>
      <StatGroup cols={3} className="mb-5"><Stat label="Cards issued" value={r.count} /><Stat label="Card fees" value={inr(r.amount)} tone="good" /><Stat label="Free cards" value={r.free} /></StatGroup>
      <Card flush>
        {r.rows.length === 0 ? <Empty>No cards issued in this period.</Empty> : (
          <Table>
            <thead className={thead}><tr><th className={th}>Date</th><th className={th}>Card</th><th className={th}>Patient</th><th className={th}>Phone</th><th className={th}>Referred by</th><th className={thr}>Fee</th></tr></thead>
            <tbody className={tbody}>
              {r.rows.map((p) => (
                <tr key={p.cardNo}>
                  <td data-label="Date" className={`${td} whitespace-nowrap`}>{fmtDate(p.date)}</td>
                  <td data-label="Card" className={`${td} tabular-nums`}><Link href={`/patients/${p.cardNo}`} className="font-medium text-brand-700 hover:underline">#{p.cardNo}</Link>{p.oldCardNo ? <span className="text-xs text-zinc-400"> (old #{p.oldCardNo})</span> : null}</td>
                  <td data-label="Patient" data-primary className={td}>{p.name}<div className="text-xs text-zinc-400">{p.address}</div></td>
                  <td data-label="Phone" className={td}>{p.phone}</td><td data-label="Referred by" className={td}>{p.referredBy}</td><td data-label="Fee" className={tdr}>{inr(p.cardFee)}</td>
                </tr>
              ))}
              <tr className="bg-zinc-50 font-semibold"><td data-primary className={td} colSpan={5}>Total</td><td data-label="Fee" className={tdr}>{inr(r.amount)}</td></tr>
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}
