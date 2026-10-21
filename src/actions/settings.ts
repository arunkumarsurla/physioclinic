"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { run } from "@/lib/action";
import type { ActionState } from "@/lib/action-types";
import { audit } from "@/lib/audit";
import { bool, moneyOr0, optText, parseForm, reqText } from "@/lib/forms";
import { DEFAULT_WA_TEMPLATES } from "@/lib/whatsapp";
import { saveSettings } from "@/server/settings";

/** "+91" / "91" -> "91" (1-3 digits) */
const countryCode = z.preprocess(
  (v) => (typeof v === "string" ? v.trim().replace(/^\+/, "") : v),
  z.string().regex(/^\d{1,3}$/, "Digits only, e.g. 91 for India"),
) as unknown as z.ZodType<string>;

export async function saveSettingsAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  return run("settings:manage", async (user) => {
    const d = parseForm(
      z.object({
        clinicName: reqText("Clinic name", 120),
        clinicAddress: optText(300),
        clinicPhone: optText(60),
        defaultCardFee: moneyOr0(100000),
        whatsappEnabled: bool,
        whatsappCountryCode: countryCode,
        waTemplateGeneral: optText(1000),
        waTemplateReminder: optText(1000),
        waTemplateReceipt: optText(1000),
        waTemplateDues: optText(1000),
      }),
      fd,
    );
    await saveSettings({
      ...d,
      clinicAddress: d.clinicAddress ?? "",
      clinicPhone: d.clinicPhone ?? "",
      // a blank template means "go back to the built-in wording"
      waTemplateGeneral: d.waTemplateGeneral ?? DEFAULT_WA_TEMPLATES.general,
      waTemplateReminder: d.waTemplateReminder ?? DEFAULT_WA_TEMPLATES.reminder,
      waTemplateReceipt: d.waTemplateReceipt ?? DEFAULT_WA_TEMPLATES.receipt,
      waTemplateDues: d.waTemplateDues ?? DEFAULT_WA_TEMPLATES.dues,
    });
    await audit(user, "UPDATE", "settings", null, "Updated clinic settings", { ...d });
    revalidatePath("/", "layout");
    return { ok: true, message: "Settings saved." };
  });
}
