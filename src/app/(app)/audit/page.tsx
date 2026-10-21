import { Badge, Card, Empty, FInput, FSelect, FilterBar, FilterField, PageHeader, Pagination, Table, td, th, thead, tbody } from "@/components/ui";
import { requirePermission } from "@/lib/auth";
import { dateParam, fmtDateTime, isISODate } from "@/lib/dates";
import { sp, spInt } from "@/lib/utils";
import { listAudit } from "@/server/audit";

export const metadata = { title: "Audit log" };

const tone = (a: string) => (a === "DELETE" ? "red" : a === "CREATE" || a === "IMPORT" ? "green" : a.includes("PASSWORD") || a === "REVOKE_SESSIONS" ? "amber" : "gray") as "red" | "green" | "amber" | "gray";

export default async function AuditPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requirePermission("audit:view");
  const s = await searchParams;
  const q = sp(s.q), entity = sp(s.entity), page = spInt(s.page, 1);
  const from = isISODate(sp(s.from)) ? dateParam(s.from, "") : "";
  const to = isISODate(sp(s.to)) ? dateParam(s.to, "") : "";
  const d = await listAudit({ q, entity, from: from || undefined, to: to || undefined }, page, 50);
  return (
    <>
      <PageHeader title="Audit log" subtitle="Who did what, and when. Entries cannot be edited from the app." />
      <FilterBar action="/audit">
        <FilterField label="Search"><FInput name="q" defaultValue={q} placeholder="Name, summary, id…" /></FilterField>
        <FilterField label="Area"><FSelect name="entity" defaultValue={entity}><option value="">All</option>{d.entities.map((e) => <option key={e} value={e}>{e}</option>)}</FSelect></FilterField>
        <FilterField label="From"><FInput type="date" name="from" defaultValue={from} /></FilterField>
        <FilterField label="To"><FInput type="date" name="to" defaultValue={to} /></FilterField>
      </FilterBar>
      <Card flush>
        {d.rows.length === 0 ? <Empty>No matching activity.</Empty> : (
          <Table>
            <thead className={thead}><tr><th className={th}>When</th><th className={th}>Who</th><th className={th}>Action</th><th className={th}>What</th><th className={th}>IP</th></tr></thead>
            <tbody className={tbody}>
              {d.rows.map((r) => (
                <tr key={r.id}>
                  <td data-label="When" className={`${td} whitespace-nowrap text-zinc-500`}>{fmtDateTime(r.createdAt)}</td>
                  <td data-label="Who" className={td}>{r.userName ?? <span className="text-zinc-400">system</span>}</td>
                  <td data-label="Action" className={td}><Badge tone={tone(r.action)}>{r.action}</Badge> <span className="text-xs text-zinc-400">{r.entity}</span></td>
                  <td data-label="What" data-primary className={`${td} max-w-xl`}>{r.summary}{r.meta && Object.keys(r.meta).length > 0 && <details className="mt-0.5"><summary className="cursor-pointer text-xs text-zinc-400">details</summary><pre className="mt-1 max-h-40 overflow-auto rounded bg-zinc-50 p-2 text-[11px]">{JSON.stringify(r.meta, null, 1)}</pre></details>}</td>
                  <td data-label="IP" className={`${td} text-xs text-zinc-400`}>{r.ip}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
        <Pagination page={page} pageSize={d.pageSize} total={d.total} path="/audit" params={{ q, entity, from, to }} />
      </Card>
    </>
  );
}
