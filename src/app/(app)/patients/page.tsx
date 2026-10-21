import Link from "next/link";
import { Badge, Card, Empty, ExportLink, FInput, FSelect, FilterBar, FilterField, MoneyCell, PageHeader, Pagination, Table, td, tdr, th, thr, thead, tbody, btn } from "@/components/ui";
import { WhatsAppLink } from "@/components/whatsapp";
import { can, requirePermission } from "@/lib/auth";
import { fmtDate } from "@/lib/dates";
import { qs, sp, spInt } from "@/lib/utils";
import { listPatients, type PatientListParams } from "@/server/patients";
import { getSettings } from "@/server/settings";
import { waAllowed } from "@/server/whatsapp";

export const metadata = { title: "Patients" };
type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function PatientsPage({ searchParams }: { searchParams: SP }) {
  const user = await requirePermission("patients:view");
  const s = await searchParams;
  const showMoney = can(user, "sittings:view");
  const q = sp(s.q);
  const status = (["active", "archived", "all"].includes(sp(s.status)) ? sp(s.status) : "active") as NonNullable<PatientListParams["status"]>;
  const dues = (showMoney && ["due", "advance"].includes(sp(s.dues)) ? sp(s.dues) : "all") as NonNullable<PatientListParams["dues"]>;
  const sort = (["card", "name", "recent", "dues"].includes(sp(s.sort)) ? sp(s.sort) : "card") as NonNullable<PatientListParams["sort"]>;
  const page = spInt(s.page, 1);
  const [{ rows, total, pageSize }, settings] = await Promise.all([
    listPatients({ q, status, dues, sort: !showMoney && sort === "dues" ? "card" : sort, page, pageSize: 25 }),
    getSettings(),
  ]);
  const waOn = waAllowed(user, settings, "general");
  const params = { q, status: status === "active" ? "" : status, dues: dues === "all" ? "" : dues, sort: sort === "card" ? "" : sort };

  return (
    <>
      <PageHeader
        title="Patients"
        subtitle={`${total.toLocaleString("en-IN")} ${status === "archived" ? "archived" : ""} patient${total === 1 ? "" : "s"}${q ? ` matching “${q}”` : ""}`}
        actions={
          <>
            {can(user, "reports:export") && <ExportLink href={`/api/export/patients${qs(params)}`} />}
            {can(user, "patients:create") && <Link href="/patients/new" className={btn("primary")}>+ New patient</Link>}
          </>
        }
      />
      <FilterBar action="/patients">
        <FilterField label="Search" className="sm:col-span-2 lg:col-span-1 lg:w-72"><FInput name="q" defaultValue={q} placeholder="Name, card no., phone, address…" /></FilterField>
        <FilterField label="Status"><FSelect name="status" defaultValue={status}><option value="active">Active</option><option value="archived">Archived</option><option value="all">All</option></FSelect></FilterField>
        {showMoney && <FilterField label="Balance"><FSelect name="dues" defaultValue={dues}><option value="all">Any</option><option value="due">Owes money</option><option value="advance">Paid in advance</option></FSelect></FilterField>}
        <FilterField label="Sort by"><FSelect name="sort" defaultValue={sort}><option value="card">Newest card</option><option value="name">Name A–Z</option><option value="recent">Last visit</option>{showMoney && <option value="dues">Highest dues</option>}</FSelect></FilterField>
      </FilterBar>

      <Card flush>
        {rows.length === 0 ? <Empty>No patients found.</Empty> : (
          <Table>
            <thead className={thead}>
              <tr>
                <th className={th}>Card</th><th className={th}>Patient</th><th className={th}>Phone</th><th className={th}>Age / Sex</th>
                <th className={thr}>Sittings</th><th className={th}>Last visit</th>{showMoney && <th className={thr}>Balance</th>}
              </tr>
            </thead>
            <tbody className={tbody}>
              {rows.map((p) => (
                <tr key={p.id} className="hover:bg-zinc-50/60">
                  <td data-label="Card" className={`${td} font-medium tabular-nums`}><Link href={`/patients/${p.cardNo}`} className="text-brand-700 hover:underline">#{p.cardNo}</Link></td>
                  <td data-label="Patient" data-primary className={td}>
                    <Link href={`/patients/${p.cardNo}`} className="font-medium hover:underline">{p.name}</Link> {p.deletedAt && <Badge tone="gray">archived</Badge>}
                    <div className="max-w-xs truncate text-xs text-zinc-400">{p.address}</div>
                  </td>
                  <td data-label="Phone" className={td}>{p.phone ?? <span className="text-zinc-300">—</span>}{waOn && <WhatsAppLink cardNo={p.cardNo} kind="general" phone={p.phone} countryCode={settings.whatsappCountryCode} variant="icon" />}</td>
                  <td data-label="Age / Sex" className={td}>{[p.age, p.sex ? p.sex[0] + p.sex.slice(1).toLowerCase() : null].filter(Boolean).join(" / ") || <span className="text-zinc-300">—</span>}</td>
                  <td data-label="Sittings" className={tdr}>{p.attended}{p.treatDays ? <span className="text-zinc-400"> / {p.treatDays}</span> : null}</td>
                  <td data-label="Last visit" className={`${td} whitespace-nowrap`}>{fmtDate(p.lastVisit)}</td>
                  {showMoney && <td data-label="Balance" className={tdr}>{p.balance > 0 ? <MoneyCell value={p.balance} tone="due" /> : p.balance < 0 ? <span className="text-sky-700">adv {Math.abs(p.balance).toLocaleString("en-IN")}</span> : <span className="text-zinc-300">—</span>}</td>}
                </tr>
              ))}
            </tbody>
          </Table>
        )}
        <Pagination page={page} pageSize={pageSize} total={total} path="/patients" params={params} />
      </Card>
    </>
  );
}
