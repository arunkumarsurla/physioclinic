import { DEFAULT_WA_TEMPLATES } from "@/lib/whatsapp";

export type ClinicSettings = {
  clinicName: string;
  clinicAddress: string;
  clinicPhone: string;
  defaultCardFee: number;
  whatsappEnabled: boolean;
  whatsappCountryCode: string;
  waTemplateGeneral: string;
  waTemplateReminder: string;
  waTemplateReceipt: string;
  waTemplateDues: string;
};

export const SETTING_DEFAULTS: ClinicSettings = {
  clinicName: "Navajyothi Physiotherapy",
  clinicAddress: "",
  clinicPhone: "",
  defaultCardFee: 100,
  whatsappEnabled: true,
  whatsappCountryCode: "91",
  waTemplateGeneral: DEFAULT_WA_TEMPLATES.general,
  waTemplateReminder: DEFAULT_WA_TEMPLATES.reminder,
  waTemplateReceipt: DEFAULT_WA_TEMPLATES.receipt,
  waTemplateDues: DEFAULT_WA_TEMPLATES.dues,
};
