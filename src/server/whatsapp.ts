import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { visits } from "@/db/schema";
import { can, type SessionUser } from "@/lib/auth";
import { computeBilling } from "@/lib/billing";
import { fmtDate } from "@/lib/dates";
import { inr } from "@/lib/money";
import type { ClinicSettings } from "@/lib/setting-defaults";
import {
  DEFAULT_WA_TEMPLATES,
  WA_NEEDS_MONEY,
  firstName,
  normalizePhone,
  renderTemplate,
  waLink,
  type WaKind,
} from "@/lib/whatsapp";
import { getPatientByCardNo, getPatientTotals } from "@/server/patients";

/** Can this user see WhatsApp buttons of this kind? (Also enforced again by the route.) */
export function waAllowed(user: SessionUser, settings: ClinicSettings, kind: WaKind): boolean {
  if (!settings.whatsappEnabled) return false;
  if (!can(user, "patients:view")) return false;
  return !WA_NEEDS_MONEY[kind] || can(user, "sittings:view");
}

const TEMPLATE_KEY = {
  general: "waTemplateGeneral",
  reminder: "waTemplateReminder",
  receipt: "waTemplateReceipt",
  dues: "waTemplateDues",
} as const satisfies Record<WaKind, keyof ClinicSettings>;

export type WaResult =
  | { ok: true; url: string; text: string; patient: { cardNo: number; name: string } }
  | { ok: false; status: number; error: string };

/**
 * Builds the WhatsApp link for one patient from *current* database figures,
 * so the amounts in the message are never stale or tampered with via the URL.
 */
export async function buildWhatsApp(
  user: SessionUser,
  settings: ClinicSettings,
  input: { cardNo: number; kind: WaKind; date?: string | null },
): Promise<WaResult> {
  const { kind } = input;
  if (!waAllowed(user, settings, kind)) return { ok: false, status: 403, error: "You don't have permission to send this message." };

  const p = await getPatientByCardNo(input.cardNo);
  if (!p) return { ok: false, status: 404, error: "Patient not found." };

  const phone = normalizePhone(p.phone, settings.whatsappCountryCode);
  if (!phone) return { ok: false, status: 422, error: `#${p.cardNo} ${p.name} has no valid mobile number on file. Add one by editing the patient.` };

  const vars: Record<string, string> = {
    name: p.name,
    first_name: firstName(p.name),
    clinic: settings.clinicName,
    clinic_phone: settings.clinicPhone,
    card_no: String(p.cardNo),
  };

  // Sitting counts and money figures are only filled in for users who may see sittings & payments.
  if (can(user, "sittings:view")) {
    const totals = await getPatientTotals(p.id);
    const b = computeBilling({ treatDays: p.treatDays, fee: p.fee, forDays: p.forDays }, totals.attended, totals.paid);
    vars.sittings = p.treatDays ? `${b.attended} of ${p.treatDays}` : String(b.attended);
    vars.paid = inr(b.paid);
    vars.due = inr(b.due);
    vars.balance_text = b.balance > 0 ? `Balance due: ${inr(b.balance)}.` : b.balance < 0 ? `Paid in advance: ${inr(-b.balance)}.` : "No balance pending.";
    if (kind === "dues" && b.due <= 0) {
      return { ok: false, status: 409, error: `#${p.cardNo} ${p.name} has no outstanding dues.` };
    }
  }

  if (kind === "receipt") {
    if (!input.date) return { ok: false, status: 400, error: "A date is required for a payment receipt." };
    const v = (
      await db
        .select({ payment: visits.payment })
        .from(visits)
        .where(and(eq(visits.patientId, p.id), eq(visits.visitDate, input.date)))
        .limit(1)
    )[0];
    if (!v || v.payment <= 0) return { ok: false, status: 409, error: `No payment recorded for #${p.cardNo} ${p.name} on ${fmtDate(input.date)}.` };
    vars.amount = inr(v.payment);
    vars.date = fmtDate(input.date);
  }

  const template = settings[TEMPLATE_KEY[kind]]?.trim() || DEFAULT_WA_TEMPLATES[kind];
  const text = renderTemplate(template, vars);
  return { ok: true, url: waLink(phone, text), text, patient: { cardNo: p.cardNo, name: p.name } };
}
