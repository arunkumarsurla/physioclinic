import { notFound } from "next/navigation";
import { PrintButton } from "@/components/forms";
import { PageHeader } from "@/components/ui";
import { can, requirePermission } from "@/lib/auth";
import { fmtDate } from "@/lib/dates";
import { inr } from "@/lib/money";
import { getPatientByCardNo } from "@/server/patients";
import { getSettings } from "@/server/settings";

export const metadata = { title: "OP card" };
const yn = (v: boolean | null) => (v === true ? "Yes" : v === false ? "No" : "");

export default async function PrintCard({ params }: { params: Promise<{ cardNo: string }> }) {
  const user = await requirePermission("patients:view");
  const { cardNo } = await params;
  const [p, s] = await Promise.all([getPatientByCardNo(Number(cardNo)), getSettings()]);
  if (!p) notFound();
  const clinical = can(user, "clinical:view");
  const Row = ({ k, v }: { k: string; v?: string | number | null }) => (
    <div className="flex gap-2 border-b border-zinc-200 py-1.5"><span className="w-32 shrink-0 text-xs uppercase tracking-wide text-zinc-500">{k}</span><span className="whitespace-pre-line">{v ?? ""}</span></div>
  );
  return (
    <div className="mx-auto max-w-3xl">
      <div className="no-print"><PageHeader title="OP card" back={{ href: `/patients/${p.cardNo}`, label: "Patient" }} actions={<PrintButton label="Print" />} /></div>
      <div className="rounded-xl border border-zinc-200 bg-white p-5 sm:p-8 print-card">
        <div className="mb-4 border-b-2 border-zinc-800 pb-3 text-center">
          <div className="text-xl font-semibold">{s.clinicName}</div>
          {(s.clinicAddress || s.clinicPhone) && <div className="text-xs text-zinc-600">{[s.clinicAddress, s.clinicPhone].filter(Boolean).join(" · ")}</div>}
          <div className="mt-1 text-sm font-medium uppercase tracking-widest">Outpatient Card</div>
        </div>
        <div className="grid gap-x-8 sm:grid-cols-2">
          <Row k="Card no." v={`#${p.cardNo}`} /><Row k="Date" v={fmtDate(p.registeredOn)} />
          <Row k="Name" v={p.name} /><Row k="Phone" v={p.phone} />
          <Row k="Age / Sex" v={[p.age, p.sex].filter(Boolean).join(" / ")} /><Row k="Weight" v={p.weightKg ? `${p.weightKg} kg` : ""} />
          <Row k="HTN / DM" v={`${yn(p.htn) || "—"} / ${yn(p.dm) || "—"}${p.bpReading ? `  (BP ${p.bpReading})` : ""}`} /><Row k="Referred by" v={p.referredBy} />
        </div>
        <Row k="Address" v={p.address} />
        {p.fee > 0 && <Row k="Treatment plan" v={`${p.treatDays} sittings · ${inr(p.fee)} for ${p.forDays} sitting${p.forDays === 1 ? "" : "s"}`} />}
        {clinical && (<>
          <Row k="Complaints" v={p.complaints} /><Row k="Examination" v={p.examination} /><Row k="History" v={p.history} />
          <Row k="Investigation" v={p.investigation} /><Row k="Diagnosis" v={p.diagnosis} /><Row k="Advice" v={p.advice} /><Row k="Avoid" v={p.avoid} />
        </>)}
        <div className="mt-16 flex justify-between text-xs text-zinc-500"><span>Patient signature</span><span>Physiotherapist</span></div>
      </div>
    </div>
  );
}
