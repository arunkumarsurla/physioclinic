import Link from "next/link";
import { Badge, Card, Empty, ExportLink, FInput, FilterBar, FilterField, PageHeader, Stat, Table, td, tdr, th, thr, thead, tbody, StatGroup } from "@/components/ui";
import { PrintButton } from "@/components/forms";
import { WhatsAppLink } from "@/components/whatsapp";
import { can, requirePermission } from "@/lib/auth";
import { fmtDate } from "@/lib/dates";
import { inr } from "@/lib/money";
import { qs, sp } from "@/lib/utils";
import { duesReport } from "@/server/reports";
import { getSettings } from "@/server/settings";
import { waAllowed } from "@/server/whatsapp";

export const metadata = { title: "Outstanding dues" };

export default async function Dues({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requirePermission("reports:view");
  const s = await searchParams;
  const q = sp(s.q);
  const min = Math.max(0, Number(sp(s.min)) || 0);
  const r = await duesReport({ q, min });
  const settings = await getSettings();
  const waDues = waAllowed(user, settings, "dues");
  return (
    <>
      <PageHeader title="Outstanding dues" subtitle="Balance = fee of every term started or paid towards, minus everything paid." back={{ href: "/reports", label: "Reports" }}
        actions={<>{can(user, "reports:export") && <ExportLink href={`/api/export/dues${qs({ q, min })}`} />}<PrintButton /></>} />
      <FilterBar action="/reports/dues">
        <FilterField label="Search"><FInput name="q" defaultValue={q} placeholder="Name, card, phone…" /></FilterField>
        <FilterField label="Dues above (₹)"><FInput name="min" type="number" min={0} defaultValue={min || ""} className="lg:w-32" /></FilterField>
      </FilterBar>
      <StatGroup cols={2} className="mb-5"><Stat label="Patients owing" value={r.rows.length} /><Stat label="Total outstanding" value={inr(r.total)} tone="warn" /></StatGroup>
      <Card flush>
        {r.rows.length === 0 ? <Empty>No outstanding dues 🎉</Empty> : (
          <Table>
            <thead className={thead}><tr><th className={th}>Card</th><th className={th}>Patient</th><th className={th}>Phone</th><th className={thr}>Sittings</th><th className={th}>Last visit</th><th className={thr}>Paid</th><th className={thr}>Due</th></tr></thead>
            <tbody className={tbody}>
              {r.rows.map((p) => (
                <tr key={p.cardNo}>
                  <td data-label="Card" className={`${td} tabular-nums`}><Link href={`/patients/${p.cardNo}`} className="font-medium text-brand-700 hover:underline">#{p.cardNo}</Link></td>
                  <td data-label="Patient" data-primary className={td}>{p.name} {p.archived && <Badge>archived</Badge>}<div className="text-xs text-zinc-400">{p.address}</div></td>
                  <td data-label="Phone" className={td}>{p.phone}{waDues && <WhatsAppLink cardNo={p.cardNo} kind="dues" phone={p.phone} countryCode={settings.whatsappCountryCode} variant="action" label="Remind" />}</td>
                  <td data-label="Sittings" className={tdr}>{p.attended}{p.treatDays ? <span className="text-zinc-400"> / {p.treatDays}</span> : null}</td>
                  <td data-label="Last visit" className={`${td} whitespace-nowrap`}>{fmtDate(p.lastVisit)}</td>
                  <td data-label="Paid" className={tdr}>{inr(p.paid)}</td>
                  <td data-label="Due" className={`${tdr} font-medium text-amber-700`}>{inr(p.balance)}</td>
                </tr>
              ))}
              <tr className="bg-zinc-50 font-semibold"><td data-primary className={td} colSpan={6}>Total</td><td data-label="Due" className={tdr}>{inr(r.total)}</td></tr>
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}
