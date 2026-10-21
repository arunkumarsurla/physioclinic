import Link from "next/link";
import { deleteVisitAction } from "@/actions/visits";
import { ConfirmAction } from "@/components/forms";
import { Badge, Card, Empty, FInput, FilterBar, FilterField, MoneyCell, PageHeader, Stat, Table, td, tdr, th, thr, thead, tbody, btn, linkAction, StatGroup } from "@/components/ui";
import { VisitForm } from "@/components/visit-form";
import { WhatsAppLink } from "@/components/whatsapp";
import { can, requirePermission } from "@/lib/auth";
import { addDays, dateParam, fmtDate, todayISO, weekday } from "@/lib/dates";
import { inr } from "@/lib/money";
import { sp } from "@/lib/utils";
import { getSettings } from "@/server/settings";
import { daySummary, getVisit, listVisitsOnDate } from "@/server/visits";
import { waAllowed } from "@/server/whatsapp";

export const metadata = { title: "Daily register" };

export default async function Register({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requirePermission("sittings:view");
  const s = await searchParams;
  const today = todayISO();
  const date = dateParam(s.date, today);
  const editId = sp(s.edit);
  const [rows, sum, editing, settings] = await Promise.all([
    listVisitsOnDate(date),
    daySummary(date),
    editId ? getVisit(editId) : null,
    getSettings(),
  ]);
  const canRecord = can(user, "sittings:record");
  const cc = settings.whatsappCountryCode;
  const waOn = waAllowed(user, settings, "dues"); // register needs sittings:view already, so money messages are allowed
  const editRow = editing && editing.v.visitDate === date ? editing : null;
  const nav = (d: string) => `/sittings?date=${d}`;

  return (
    <>
      <PageHeader title="Daily register" subtitle={`${weekday(date)}, ${fmtDate(date)}${date === today ? " (today)" : ""}`}
        actions={<><Link href={nav(addDays(date, -1))} className={btn("secondary")}>← Previous day</Link>{date < today && <Link href={nav(addDays(date, 1))} className={btn("secondary")}>Next day →</Link>}{date !== today && <Link href="/sittings" className={btn("secondary")}>Today</Link>}</>} />

      <StatGroup cols={4} className="mb-5">
        <Stat label="Attended" value={sum.attended} sub={sum.absent ? `${sum.absent} absent` : undefined} />
        <Stat label="Sitting payments" value={inr(sum.payments)} tone="good" />
        <Stat label="New cards" value={sum.newPatients} sub={sum.cardFees ? `${inr(sum.cardFees)}` : undefined} />
        <Stat label="Day's collection" value={inr(sum.payments + sum.cardFees)} />
      </StatGroup>

      {canRecord && (
        <Card title={editRow ? `Editing: #${editRow.cardNo} ${editRow.name}` : "Record a sitting"} className="mb-5">
          <VisitForm
            key={editRow?.v.id ?? `new-${date}`}
            initialPatient={editRow ? { id: editRow.v.patientId, text: `#${editRow.cardNo} · ${editRow.name}` } : null}
            maxDate={today}
            defaults={{ date, attended: editRow?.v.attended ?? true, payment: editRow?.v.payment ?? 0, note: editRow?.v.note ?? "" }}
            resetOnSuccess={!editRow}
            submitLabel={editRow ? "Update sitting" : "Save sitting"}
            cancelHref={editRow ? nav(date) : undefined}
          />
        </Card>
      )}

      <FilterBar action="/sittings">
        <FilterField label="Go to date"><FInput type="date" name="date" defaultValue={date} max={today} /></FilterField>
      </FilterBar>

      <Card title={`Entries for ${fmtDate(date)} (${rows.length})`} flush>
        {rows.length === 0 ? <Empty>Nothing recorded for this day.</Empty> : (
          <Table>
            <thead className={thead}><tr><th className={th}>Card</th><th className={th}>Patient</th><th className={th}>Status</th><th className={thr}>Payment</th><th className={thr}>Sittings so far</th><th className={thr}>Balance</th><th className={th}>Note</th><th className={th}></th></tr></thead>
            <tbody className={tbody}>
              {rows.map((r) => (
                <tr key={r.id} className={r.id === editId ? "bg-amber-50/60" : undefined}>
                  <td data-label="Card" className={`${td} tabular-nums`}><Link href={`/patients/${r.cardNo}`} className="font-medium text-brand-700 hover:underline">#{r.cardNo}</Link></td>
                  <td data-label="Patient" data-primary className={td}><Link href={`/patients/${r.cardNo}`} className="font-medium hover:underline">{r.name}</Link><div className="text-xs text-zinc-400">{r.address}</div></td>
                  <td data-label="Status" className={td}>{r.attended ? <Badge tone="green">Attended</Badge> : <Badge>Absent</Badge>}</td>
                  <td data-label="Payment" className={tdr}>{r.payment > 0 ? inr(r.payment) : <span className="text-zinc-300">—</span>}</td>
                  <td data-label="Sittings so far" className={tdr}>{r.totalAttended}</td>
                  <td data-label="Balance" className={tdr}>{r.balance > 0 ? <MoneyCell value={r.balance} tone="due" /> : r.balance < 0 ? <span className="text-sky-700">adv {Math.abs(r.balance).toLocaleString("en-IN")}</span> : <span className="text-zinc-300">—</span>}</td>
                  <td data-label="Note" className={td}>{r.note}</td>
                  <td className={`${td} no-print`}><span className="flex items-center justify-end gap-2">
                    {waOn && (r.payment > 0
                      ? <WhatsAppLink cardNo={r.cardNo} kind="receipt" phone={r.phone} countryCode={cc} date={date} variant="action" label="Receipt" />
                      : r.balance > 0
                        ? <WhatsAppLink cardNo={r.cardNo} kind="dues" phone={r.phone} countryCode={cc} variant="action" label="Dues" />
                        : !r.attended
                          ? <WhatsAppLink cardNo={r.cardNo} kind="reminder" phone={r.phone} countryCode={cc} variant="action" label="Reminder" />
                          : null)}
                    {canRecord && <Link href={`/sittings?date=${date}&edit=${r.id}`} className={linkAction}>Edit</Link>}
                    {can(user, "sittings:delete") && <ConfirmAction action={deleteVisitAction} fields={{ id: r.id }} confirm={`Delete this entry for #${r.cardNo} ${r.name}?`} label="Delete" successMessage="Sitting entry deleted." />}
                  </span></td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}
