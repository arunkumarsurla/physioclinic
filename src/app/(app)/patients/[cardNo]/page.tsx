import Link from "next/link";
import { notFound } from "next/navigation";
import { archivePatientAction, restorePatientAction } from "@/actions/patients";
import { deleteVisitAction } from "@/actions/visits";
import { ConfirmAction } from "@/components/forms";
import { Badge, Card, Dl, Empty, MoneyCell, PageHeader, Stat, Table, td, tdr, th, thr, thead, tbody, btn, linkAction, StatGroup } from "@/components/ui";
import { VisitForm } from "@/components/visit-form";
import { WhatsAppLink } from "@/components/whatsapp";
import { can, requirePermission } from "@/lib/auth";
import { computeBilling } from "@/lib/billing";
import { fmtDate, todayISO, weekday } from "@/lib/dates";
import { inr } from "@/lib/money";
import { sp } from "@/lib/utils";
import { getPatientByCardNo, getPatientTotals, listPatientVisits } from "@/server/patients";
import { getSettings } from "@/server/settings";
import { waAllowed } from "@/server/whatsapp";

type Props = { params: Promise<{ cardNo: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params }: Props) {
  return { title: `Patient #${(await params).cardNo}` };
}

const yn = (v: boolean | null) => (v === true ? "Yes" : v === false ? "No" : null);

export default async function PatientPage({ params, searchParams }: Props) {
  const user = await requirePermission("patients:view");
  const p = await getPatientByCardNo(Number((await params).cardNo));
  if (!p) notFound();
  const editDate = sp((await searchParams).edit);

  const showSittings = can(user, "sittings:view");
  const showClinical = can(user, "clinical:view");
  const [totals, visits] = showSittings ? await Promise.all([getPatientTotals(p.id), listPatientVisits(p.id)]) : [null, []];
  const billing = totals ? computeBilling({ treatDays: p.treatDays, fee: p.fee, forDays: p.forDays }, totals.attended, totals.paid) : null;
  const today = todayISO();
  const editing = visits.find((v) => v.date === editDate);
  // sitting number for each attended visit (oldest = 1)
  const attendedAsc = visits.filter((v) => v.attended).map((v) => v.date).sort();
  const sittingNo = new Map(attendedAsc.map((d, i) => [d, i + 1]));
  const archived = !!p.deletedAt;
  const settings = await getSettings();
  const cc = settings.whatsappCountryCode;
  const waGeneral = waAllowed(user, settings, "general");
  const waMoney = waAllowed(user, settings, "dues");

  const clinicalNotes = [
    ["Complaints", p.complaints],
    ["Examination", p.examination],
    ["History", p.history],
    ["Investigation", p.investigation],
    ["Diagnosis", p.diagnosis],
    ["Advice", p.advice],
    ["Avoid", p.avoid],
  ] as const;

  return (
    <>
      <PageHeader
        title={`#${p.cardNo} · ${p.name}`}
        back={{ href: "/patients", label: "Patients" }}
        subtitle={<>{archived && <Badge tone="gray">archived</Badge>} Registered {fmtDate(p.registeredOn)}{p.oldCardNo ? ` · previous card #${p.oldCardNo}` : ""}</>}
        actions={
          <>
            <Link href={`/patients/${p.cardNo}/print`} className={btn("secondary")}>Print OP card</Link>
            {can(user, "patients:edit") && <Link href={`/patients/${p.cardNo}/edit`} className={btn("secondary")}>Edit</Link>}
            {can(user, "patients:delete") && (archived
              ? <ConfirmAction action={restorePatientAction} fields={{ id: p.id }} confirm="Restore this patient?" label="Restore" variant="secondary" size="md" />
              : <ConfirmAction action={archivePatientAction} fields={{ id: p.id }} confirm="Archive this patient? They will be hidden from the active list, but all payments stay in the books." label="Archive" size="md" />)}
          </>
        }
      />

      {billing && totals && (
        <StatGroup cols={4} className="mb-5">
          <Stat label="Sittings attended" value={<>{totals.attended}{p.treatDays ? <span className="text-base font-normal text-zinc-400"> / {p.treatDays}</span> : null}</>} sub={billing.beyondPlan ? "⚠ beyond the planned sittings" : p.treatDays ? `${billing.remainingSittings} remaining` : "no plan set"} tone={billing.beyondPlan ? "warn" : undefined} />
          <Stat label="Total paid" value={inr(billing.paid)} sub={p.cardFee ? `+ ${inr(p.cardFee)} card fee` : undefined} />
          <Stat label="Billed so far" value={inr(billing.billed)} sub={billing.configured ? `${billing.billedTerms} of ${billing.totalTerms} terms · ${inr(p.fee)} per ${p.forDays} sitting${p.forDays === 1 ? "" : "s"}` : "billing plan not set"} />
          <Stat label={billing.balance < 0 ? "Paid in advance" : "Balance due"} value={inr(Math.abs(billing.balance))} tone={billing.balance > 0 ? "warn" : billing.balance < 0 ? "good" : undefined} />
        </StatGroup>
      )}

      {waGeneral && (
        <Card title="WhatsApp" className="mb-5" actions={!p.phone && can(user, "patients:edit") ? <Link href={`/patients/${p.cardNo}/edit`} className={linkAction}>Add phone number</Link> : undefined}>
          {p.phone ? (
            <div className="flex flex-wrap items-center gap-2">
              <WhatsAppLink cardNo={p.cardNo} kind="general" phone={p.phone} countryCode={cc} />
              <WhatsAppLink cardNo={p.cardNo} kind="reminder" phone={p.phone} countryCode={cc} />
              {waMoney && billing && billing.due > 0 && <WhatsAppLink cardNo={p.cardNo} kind="dues" phone={p.phone} countryCode={cc} label={`Dues reminder · ${inr(billing.due)}`} />}
            </div>
          ) : <p className="text-sm text-zinc-500">No phone number on file for this patient.</p>}
          <p className="mt-2 text-xs text-zinc-500">Opens WhatsApp with the message ready to send. Wording can be changed in Settings.</p>
        </Card>
      )}

      <Card title="Details" className="mb-5">
        <Dl items={[
          ["Phone", p.phone], ["Age / Sex", [p.age, p.sex ? p.sex[0] + p.sex.slice(1).toLowerCase() : null].filter(Boolean).join(" / ")], ["Weight", p.weightKg ? `${p.weightKg} kg` : null],
          ["Address", p.address], ["Referred by", p.referredBy], ["Hypertension", [yn(p.htn), p.bpReading ? `(BP ${p.bpReading})` : null].filter(Boolean).join(" ")],
          ["Diabetes", yn(p.dm)], ["Card fee", p.cardFee ? inr(p.cardFee) : "Free"],
          ["Plan", p.fee && p.forDays ? `${inr(p.fee)} for ${p.forDays} sitting${p.forDays === 1 ? "" : "s"} · ${p.treatDays} planned` : null],
        ]} />
      </Card>

      {showClinical && (
        <Card title="Clinical notes" className="mb-5">
          {clinicalNotes.some(([, v]) => v) ? (
            <dl className="space-y-4">
              {clinicalNotes.map(([label, value]) =>
                value ? (
                  <div key={label}>
                    <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                      {label}
                    </dt>
                    <dd className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-zinc-800">
                      {value}
                    </dd>
                  </div>
                ) : null,
              )}
            </dl>
          ) : (
            <p className="text-sm text-zinc-500">No clinical notes recorded.</p>
          )}
        </Card>
      )}

      {showSittings && billing && (
        <>
          {billing.terms.length > 0 && p.forDays > 1 && (
            <Card title="Billing terms" className="mt-5" flush>
              <Table>
                <thead className={thead}><tr><th className={th}>Term</th><th className={thr}>Sittings</th><th className={thr}>Fee</th><th className={thr}>Paid</th><th className={thr}>Balance</th></tr></thead>
                <tbody className={tbody}>
                  {billing.terms.map((t) => (
                    <tr key={t.no}>
                      <td data-label="Term" data-primary className={td}>Term {t.no}</td>
                      <td data-label="Sittings" className={tdr}>{t.attended} / {t.sittings}</td>
                      <td data-label="Fee" className={tdr}>{inr(t.fee)}</td>
                      <td data-label="Paid" className={tdr}>{inr(t.paid)}</td>
                      <td data-label="Balance" className={tdr}><MoneyCell value={t.balance} tone={t.balance > 0 ? "due" : undefined} /></td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card>
          )}

          <Card title={editing ? `Editing sitting of ${fmtDate(editing.date)}` : "Record sitting / payment"} className="mt-5">
            {archived ? <p className="text-sm text-zinc-500">Restore this patient to record new sittings.</p> : can(user, "sittings:record") ? (
              <VisitForm
                key={editing?.id ?? "new"}
                fixedPatientId={p.id}
                maxDate={today}
                defaults={{ date: editing?.date ?? today, attended: editing?.attended ?? true, payment: editing?.payment ?? 0, note: editing?.note ?? "" }}
                resetOnSuccess={!editing}
                submitLabel={editing ? "Update sitting" : "Save sitting"}
                cancelHref={editing ? `/patients/${p.cardNo}` : undefined}
              />
            ) : <p className="text-sm text-zinc-500">You can view sittings but not record them.</p>}
          </Card>

          <Card title={`Sittings & payments (${visits.length})`} className="mt-5" flush>
            {visits.length === 0 ? <Empty>No sittings recorded yet.</Empty> : (
              <Table>
                <thead className={thead}><tr><th className={th}>Date</th><th className={th}>#</th><th className={th}>Status</th><th className={thr}>Payment</th><th className={th}>Note</th><th className={th}></th></tr></thead>
                <tbody className={tbody}>
                  {visits.map((v) => (
                    <tr key={v.id} className={v.date === editDate ? "bg-amber-50/60" : undefined}>
                      <td data-label="Date" data-primary className={`${td} whitespace-nowrap`}>{fmtDate(v.date)} <span className="text-xs text-zinc-400">{weekday(v.date)}</span></td>
                      <td data-label="#" className={`${td} tabular-nums text-zinc-500`}>{sittingNo.get(v.date) ?? ""}</td>
                      <td data-label="Status" className={td}>{v.attended ? <Badge tone="green">Attended</Badge> : <Badge tone="gray">Absent</Badge>}</td>
                      <td data-label="Payment" className={tdr}>{v.payment > 0 ? inr(v.payment) : <span className="text-zinc-300">—</span>}</td>
                      <td data-label="Note" className={td}>{v.note}</td>
                      <td className={`${td} no-print`}>
                        <span className="flex items-center justify-end gap-2">
                          {waMoney && v.payment > 0 && <WhatsAppLink cardNo={p.cardNo} kind="receipt" phone={p.phone} countryCode={cc} date={v.date} variant="action" label="Receipt" />}
                          {can(user, "sittings:record") && !archived && <Link href={`/patients/${p.cardNo}?edit=${v.date}`} scroll className={linkAction}>Edit</Link>}
                          {can(user, "sittings:delete") && <ConfirmAction action={deleteVisitAction} fields={{ id: v.id }} confirm={`Delete the sitting of ${fmtDate(v.date)}${v.payment > 0 ? ` and its payment of ${inr(v.payment)}` : ""}?`} label="Delete" />}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card>
        </>
      )}
    </>
  );
}