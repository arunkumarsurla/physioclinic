"use client";

import { recordVisitAction } from "@/actions/visits";
import { ActionForm, Field, PatientPicker, SegmentedField } from "@/components/forms";

export function VisitForm({
  fixedPatientId, initialPatient, defaults, maxDate, submitLabel = "Save sitting", resetOnSuccess = true, cancelHref,
}: {
  /** Patient page: the patient is known. Daily register: omit and a search box is shown. */
  fixedPatientId?: string;
  initialPatient?: { id: string; text: string } | null;
  defaults: { date: string; attended: boolean; payment: number; note: string };
  maxDate: string;
  submitLabel?: string;
  resetOnSuccess?: boolean;
  cancelHref?: string;
}) {
  return (
    <ActionForm action={recordVisitAction} submitLabel={submitLabel} resetOnSuccess={resetOnSuccess} cancelHref={cancelHref}>
      {fixedPatientId ? <input type="hidden" name="patientId" value={fixedPatientId} /> : <PatientPicker initial={initialPatient ?? null} autoFocus />}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Date" name="date" type="date" defaultValue={defaults.date} max={maxDate} required />
        <SegmentedField label="Attended?" name="attended" defaultValue={defaults.attended ? "yes" : "no"} options={[{ value: "yes", label: "Attended" }, { value: "no", label: "Absent" }]} />
        <Field label="Payment received (₹)" name="payment" type="number" min={0} step="0.01" inputMode="decimal" defaultValue={defaults.payment || ""} placeholder="0" />
        <Field label="Note" name="note" defaultValue={defaults.note} maxLength={300} />
      </div>
      <p className="-mt-1 text-xs text-zinc-500">Saving again for the same patient and date updates that entry.</p>
    </ActionForm>
  );
}
