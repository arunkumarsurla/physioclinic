import "server-only";
import { cache } from "react";
import { db } from "@/db";
import { settings } from "@/db/schema";
import { sql } from "drizzle-orm";

import { SETTING_DEFAULTS, type ClinicSettings } from "@/lib/setting-defaults";
export type { ClinicSettings };

const KEYS: Record<keyof ClinicSettings, string> = {
  clinicName: "clinic_name",
  clinicAddress: "clinic_address",
  clinicPhone: "clinic_phone",
  defaultCardFee: "default_card_fee",
  whatsappEnabled: "whatsapp_enabled",
  whatsappCountryCode: "whatsapp_country_code",
  waTemplateGeneral: "wa_template_general",
  waTemplateReminder: "wa_template_reminder",
  waTemplateReceipt: "wa_template_receipt",
  waTemplateDues: "wa_template_dues",
};

export const getSettings = cache(async (): Promise<ClinicSettings> => {
  const rows = await db.select().from(settings);
  const map = new Map(rows.map((r) => [r.key, r.value]));
  const out = { ...SETTING_DEFAULTS } as Record<string, unknown>;
  for (const [prop, key] of Object.entries(KEYS)) {
    if (map.has(key)) out[prop] = map.get(key);
  }
  return out as ClinicSettings;
});

export async function saveSettings(values: Partial<ClinicSettings>) {
  const entries = Object.entries(values).filter(([, v]) => v !== undefined) as [keyof ClinicSettings, unknown][];
  for (const [prop, value] of entries) {
    await db
      .insert(settings)
      .values({ key: KEYS[prop], value })
      .onConflictDoUpdate({ target: settings.key, set: { value: sql`excluded.value`, updatedAt: new Date() } });
  }
}
