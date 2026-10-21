
/**
 * WhatsApp helpers (click-to-chat).
 *
 * The app never sends messages automatically and does not call the WhatsApp API.
 * It builds a https://wa.me/<number>?text=<message> URL.
 *
 * Staff open the URL in WhatsApp and manually press Send.
 *
 * This module is pure and can be used from server and client code.
 */

export type WaKind = "general" | "reminder" | "receipt" | "dues";

export const WA_KINDS: readonly WaKind[] = [
  "general",
  "reminder",
  "receipt",
  "dues",
];

export function isWaKind(value: unknown): value is WaKind {
  return (
    typeof value === "string" &&
    (WA_KINDS as readonly string[]).includes(value)
  );
}

export const WA_KIND_LABELS: Record<WaKind, string> = {
  general: "Message",
  reminder: "Sitting reminder",
  receipt: "Payment receipt",
  dues: "Dues reminder",
};

/**
 * Message types that include financial information require
 * permission to access sittings and payments.
 */
export const WA_NEEDS_MONEY: Record<WaKind, boolean> = {
  general: false,
  reminder: false,
  receipt: true,
  dues: true,
};

export const DEFAULT_WA_TEMPLATES: Record<WaKind, string> = {
  general: "Hello {first_name}, this is {clinic}.",

  reminder:
    "Hello {first_name}, this is a reminder from {clinic} for your next physiotherapy sitting. Please let us know if you need to reschedule.",

  receipt:
    "Dear {first_name}, thank you! We received {amount} on {date} at {clinic} (card #{card_no}). Total paid so far: {paid}. {balance_text}",

  dues:
    "Dear {first_name}, a gentle reminder from {clinic}: a balance of {due} is pending on your card #{card_no}. Kindly settle it at your next visit. Thank you.",
};

/**
 * Available placeholders displayed in Settings.
 */
export const WA_PLACEHOLDERS: { key: string; desc: string }[] = [
  { key: "{name}", desc: "Patient's full name" },
  { key: "{first_name}", desc: "First word of the name" },
  { key: "{clinic}", desc: "Clinic name" },
  { key: "{clinic_phone}", desc: "Clinic phone (from Settings)" },
  { key: "{card_no}", desc: "OP card number" },
  { key: "{sittings}", desc: "Sittings attended, e.g. 3 of 10" },
  { key: "{due}", desc: "Balance due, e.g. ₹1,200" },
  { key: "{paid}", desc: "Total paid so far" },
  { key: "{amount}", desc: "Payment on that day (receipts)" },
  { key: "{date}", desc: "Date of that payment (receipts)" },
  {
    key: "{balance_text}",
    desc: "Balance due, paid in advance, or no balance pending",
  },
];

/**
 * Replace supported placeholders in a template.
 *
 * Unknown placeholders remain unchanged so template mistakes
 * are visible to staff instead of disappearing silently.
 */
export function renderTemplate(
  template: string,
  vars: Record<string, string>
): string {
  const out = template.replace(
    /\{([a-z_]+)\}/g,
    (match: string, key: string) =>
      Object.hasOwn(vars, key) ? vars[key]! : match
  );

  return out
    .replace(/[ \t]{2,}/g, " ")
    .replace(/[ \t]+$/gm, "")
    .trim();
}

/**
 * Normalize a phone number into international digits-only format.
 *
 * Examples for India:
 *   9876543210       -> 919876543210
 *   +91 9876543210   -> 919876543210
 *   09876543210      -> 919876543210
 *
 * Multiple phone numbers can be separated by commas, slashes,
 * semicolons, pipes, newlines, "or", or repeated spaces.
 *
 * Indian landlines and invalid Indian mobile numbers are rejected.
 */
export function normalizePhone(
  raw: string | null | undefined,
  countryCode: string = "91"
): string | null {
  if (typeof raw !== "string" || !raw.trim()) {
    return null;
  }

  // Prevent "countryCode.replace is not a function".
  // The TypeScript type alone does not protect against bad runtime values.
  const country =
    typeof countryCode === "string"
      ? countryCode.replace(/\D/g, "") || "91"
      : "91";

  for (const part of raw.split(/[/,;|\n]|\bor\b|\s{2,}/i)) {
    const normalized = normalizeOne(part, country);

    if (normalized) {
      return normalized;
    }
  }

  // Handle two Indian 10-digit numbers separated by a single space.
  if (country === "91") {
    const allDigits = raw.replace(/\D/g, "");

    if (allDigits.length === 20) {
      return (
        normalizeOne(allDigits.slice(0, 10), country) ??
        normalizeOne(allDigits.slice(10), country)
      );
    }
  }

  return null;
}

/**
 * Normalize a single phone number.
 */
function normalizeOne(
  part: string,
  country: string
): string | null {
  const digits = part.replace(/\D/g, "");

  if (!digits) {
    return null;
  }

  // Explicit international numbers start with "+" or "00".
  const explicitIntl =
    /^\s*\+/.test(part) || digits.startsWith("00");

  if (explicitIntl) {
    const full = digits.replace(/^00/, "");

    // International E.164 number length: 8 to 15 digits here,
    // with a non-zero first digit.
    if (!/^[1-9]\d{7,14}$/.test(full)) {
      return null;
    }

    // Validate Indian mobile numbers when the international
    // number uses India's country code.
    if (country === "91" && full.startsWith("91")) {
      return isIndianMobile(full.slice(2)) ? full : null;
    }

    return full;
  }

  let national: string;

  // Indian-style number with a leading zero.
  if (digits.startsWith("0") && digits.length === 11) {
    national = digits.slice(1);
  } else if (
    digits.startsWith(country) &&
    digits.length === country.length + 10
  ) {
    // Number already contains the configured country code.
    national = digits.slice(country.length);
  } else if (digits.length === 10) {
    national = digits;
  } else {
    return null;
  }

  if (country === "91" && !isIndianMobile(national)) {
    return null;
  }

  return `${country}${national}`;
}

/**
 * Basic validation for Indian mobile numbers.
 */
function isIndianMobile(number: string): boolean {
  return /^[6-9]\d{9}$/.test(number);
}

/**
 * Generate a WhatsApp click-to-chat URL.
 *
 * The phone must be normalized using normalizePhone().
 */
export function waLink(phone: string, text: string): string {
  const normalizedPhone = normalizePhone(phone);

  if (!normalizedPhone) {
    throw new Error("Invalid WhatsApp phone number.");
  }

  return `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(text)}`;
}

/**
 * "Jane Mary Thomas" -> "Jane"
 */
export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || name;
}
