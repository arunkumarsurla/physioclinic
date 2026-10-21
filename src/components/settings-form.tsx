"use client";

import { saveSettingsAction } from "@/actions/settings";
import { ActionForm, Field, TextAreaField, ToggleField } from "@/components/forms";
import type { ClinicSettings } from "@/lib/setting-defaults";
import { WA_PLACEHOLDERS } from "@/lib/whatsapp";

export function SettingsForm({ settings }: { settings: ClinicSettings }) {
  return (
    <ActionForm action={saveSettingsAction} submitLabel="Save settings">
      <Field label="Clinic name" name="clinicName" defaultValue={settings.clinicName} required maxLength={120} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Phone" name="clinicPhone" defaultValue={settings.clinicPhone} />
        <Field label="Address" name="clinicAddress" defaultValue={settings.clinicAddress} />
      </div>
      <Field label="Default new-card fee (₹)" name="defaultCardFee" type="number" min={0} step="0.01" defaultValue={settings.defaultCardFee} hint="Pre-filled when registering a patient" />

      <div className="space-y-4 border-t border-zinc-100 pt-5">
        <div>
          <h3 className="text-sm font-semibold text-zinc-800">WhatsApp messages</h3>
          <p className="mt-0.5 text-xs text-zinc-500">
            Buttons open WhatsApp with the message already typed; staff press Send from the clinic&apos;s own WhatsApp. Nothing is sent automatically.
          </p>
        </div>
        <ToggleField label="Show WhatsApp buttons" name="whatsappEnabled" defaultChecked={settings.whatsappEnabled} hint="Turn off to hide every WhatsApp button in the app" className="-mx-3" />
        <Field label="Country code" name="whatsappCountryCode" defaultValue={settings.whatsappCountryCode} required maxLength={4} inputMode="numeric" hint="Added to 10-digit phone numbers. 91 = India" className="sm:max-w-40" />
        <TextAreaField label="General message" name="waTemplateGeneral" defaultValue={settings.waTemplateGeneral} rows={2} maxLength={1000} />
        <TextAreaField label="Sitting reminder" name="waTemplateReminder" defaultValue={settings.waTemplateReminder} rows={3} maxLength={1000} />
        <TextAreaField label="Payment receipt" name="waTemplateReceipt" defaultValue={settings.waTemplateReceipt} rows={3} maxLength={1000} />
        <TextAreaField label="Dues reminder" name="waTemplateDues" defaultValue={settings.waTemplateDues} rows={3} maxLength={1000} hint="Clear a box and save to restore the original wording." />
        <details className="rounded-lg bg-zinc-50 px-3 py-2 text-xs text-zinc-600">
          <summary className="cursor-pointer font-medium text-zinc-700">Placeholders you can use</summary>
          <dl className="mt-2 grid gap-x-4 gap-y-1 sm:grid-cols-2">
            {WA_PLACEHOLDERS.map((p) => (
              <div key={p.key} className="flex gap-2">
                <dt className="font-mono text-[11px] text-brand-800">{p.key}</dt>
                <dd>{p.desc}</dd>
              </div>
            ))}
          </dl>
        </details>
      </div>
    </ActionForm>
  );
}
