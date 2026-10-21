"use client";

import { createPatientAction, updatePatientAction } from "@/actions/patients";
import { ActionForm, Field, SegmentedField, SelectField, TextAreaField } from "@/components/forms";

export type PatientDefaults = {
  id?: string;
  name?: string; address?: string | null; phone?: string | null; age?: number | null; sex?: string | null; weightKg?: number | null;
  htn?: boolean | null; bpReading?: string | null; dm?: boolean | null; referredBy?: string | null; oldCardNo?: number | null;
  registeredOn: string; cardFee: number; treatDays?: number; fee?: number; forDays?: number;
  complaints?: string | null; examination?: string | null; history?: string | null; investigation?: string | null;
  diagnosis?: string | null; advice?: string | null; avoid?: string | null;
};

const tri = (v: boolean | null | undefined) => (v === true ? "yes" : v === false ? "no" : "");
const triOpts = [{ value: "", label: "Not set" }, { value: "no", label: "No" }, { value: "yes", label: "Yes" }];

export function PatientForm({ mode, defaults, canClinical, cancelHref, maxDate }: { mode: "create" | "edit"; defaults: PatientDefaults; canClinical: boolean; cancelHref: string; maxDate: string }) {
  const d = defaults;
  return (
    <ActionForm action={mode === "create" ? createPatientAction : updatePatientAction} submitLabel={mode === "create" ? "Register patient" : "Save changes"} cancelHref={cancelHref} className="space-y-8" stickyActions>
      {d.id && <input type="hidden" name="id" value={d.id} />}

      <fieldset className="space-y-4">
        <legend className="mb-3 text-base font-semibold text-zinc-900">Patient</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name" name="name" defaultValue={d.name} required maxLength={150} autoFocus={mode === "create"} />
          <Field label="Phone" name="phone" defaultValue={d.phone ?? ""} maxLength={40} inputMode="tel" />
        </div>
        <Field label="Address" name="address" defaultValue={d.address ?? ""} maxLength={300} />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Age" name="age" type="number" min={0} max={130} defaultValue={d.age ?? ""} />
          <SelectField label="Sex" name="sex" defaultValue={d.sex ?? ""} options={[{ value: "", label: "—" }, { value: "MALE", label: "Male" }, { value: "FEMALE", label: "Female" }, { value: "OTHER", label: "Other" }]} />
          <Field label="Weight (kg)" name="weightKg" type="number" min={0} max={500} defaultValue={d.weightKg ?? ""} />
          <Field label="Referred by" name="referredBy" defaultValue={d.referredBy ?? ""} maxLength={150} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <SegmentedField label="Hypertension (HTN)" name="htn" defaultValue={tri(d.htn)} options={triOpts} />
          <SegmentedField label="Diabetes (DM)" name="dm" defaultValue={tri(d.dm)} options={triOpts} />
          <Field label="BP reading" name="bpReading" defaultValue={d.bpReading ?? ""} maxLength={40} placeholder="e.g. 130/90" />
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="mb-3 text-base font-semibold text-zinc-900">Card &amp; treatment plan</legend>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Registered on" name="registeredOn" type="date" defaultValue={d.registeredOn} max={mode === "create" ? maxDate : undefined} required />
          <Field label="Card fee paid (₹)" name="cardFee" type="number" min={0} step="0.01" defaultValue={d.cardFee} />
          <Field label="Previous card no." name="oldCardNo" type="number" min={1} defaultValue={d.oldCardNo ?? ""} hint="If an older card exists" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Total sittings planned" name="treatDays" type="number" min={0} defaultValue={d.treatDays || ""} hint="e.g. 30" />
          <Field label="Fee per term (₹)" name="fee" type="number" min={0} step="0.01" defaultValue={d.fee || ""} hint="e.g. 1800" />
          <Field label="Sittings covered by that fee" name="forDays" type="number" min={0} defaultValue={d.forDays || ""} hint="e.g. 7 → ‘₹1800 for 7 sittings’" />
        </div>
      </fieldset>

      {canClinical && (
        <fieldset className="space-y-4">
          <legend className="mb-3 text-base font-semibold text-zinc-900">Clinical notes</legend>
          <div className="grid gap-4 md:grid-cols-2">
            <TextAreaField label="Complaints" name="complaints" defaultValue={d.complaints ?? ""} />
            <TextAreaField label="Examination" name="examination" defaultValue={d.examination ?? ""} />
            <TextAreaField label="History" name="history" defaultValue={d.history ?? ""} />
            <TextAreaField label="Investigation" name="investigation" defaultValue={d.investigation ?? ""} />
            <TextAreaField label="Diagnosis" name="diagnosis" defaultValue={d.diagnosis ?? ""} />
            <TextAreaField label="Advice" name="advice" defaultValue={d.advice ?? ""} />
          </div>
          <TextAreaField label="Avoid" name="avoid" defaultValue={d.avoid ?? ""} rows={2} />
        </fieldset>
      )}
    </ActionForm>
  );
}
