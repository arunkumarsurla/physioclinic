import { z } from "zod";
import { ActionError } from "@/lib/action";
import { isISODate } from "@/lib/dates";

/** Optional text: '' / missing -> null, otherwise trimmed. */
export const optText = (max = 500) =>
  z.preprocess(
    (v) => (typeof v === "string" ? v.trim() : v ?? ""),
    z
      .string()
      .max(max, `Must be ${max} characters or fewer`)
      .transform((v) => (v === "" ? null : v)),
  ) as unknown as z.ZodType<string | null>;

export const reqText = (label: string, max = 200) =>
  z.preprocess(
    (v) => (typeof v === "string" ? v.trim() : v ?? ""),
    z.string().min(1, `${label} is required`).max(max, `Must be ${max} characters or fewer`),
  ) as unknown as z.ZodType<string>;

/** Optional whole number. '' -> null */
export const optInt = (min = 0, max = 1_000_000) =>
  z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? null : Number(v)),
    z
      .number()
      .int("Must be a whole number")
      .min(min, `Must be at least ${min}`)
      .max(max, `Must be at most ${max}`)
      .nullable(),
  ) as unknown as z.ZodType<number | null>;

/** Whole number that defaults to 0 when blank */
export const intOr0 = (min = 0, max = 1_000_000) =>
  z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? 0 : Number(v)),
    z.number().int("Must be a whole number").min(min, `Must be at least ${min}`).max(max, `Must be at most ${max}`),
  ) as unknown as z.ZodType<number>;

/** Money amount (max 2 decimals), blank -> 0 */
export const moneyOr0 = (max = 100_000_000) =>
  z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? 0 : Number(String(v).replace(/,/g, ""))),
    z
      .number("Enter a valid amount")
      .min(0, "Amount cannot be negative")
      .max(max, "Amount is too large")
      .refine((n) => Math.abs(n * 100 - Math.round(n * 100)) < 1e-6, "Use at most 2 decimal places"),
  ) as unknown as z.ZodType<number>;

export const isoDate = (label = "Date") =>
  z.preprocess((v) => (typeof v === "string" ? v.trim() : v), z.string().refine(isISODate, `${label} is not a valid date`)) as unknown as z.ZodType<string>;

/** Checkbox / select 'on'|'true'|'1' -> true */
export const bool = z.preprocess(
  (v) => v === "on" || v === "true" || v === "1" || v === true,
  z.boolean(),
) as unknown as z.ZodType<boolean>;

/** Yes / No / unknown select -> true | false | null */
export const triState = z.preprocess(
  (v) => (v === "yes" ? true : v === "no" ? false : null),
  z.boolean().nullable(),
) as unknown as z.ZodType<boolean | null>;

export function parseForm<S extends z.ZodType>(schema: S, fd: FormData): z.infer<S> {
  const raw: Record<string, unknown> = {};
  for (const [k, v] of fd.entries()) {
    if (k.startsWith("$ACTION")) continue;
    if (typeof v !== "string") continue;
    if (k in raw) {
      const cur = raw[k];
      raw[k] = Array.isArray(cur) ? [...cur, v] : [cur, v];
    } else raw[k] = v;
  }
  const result = schema.safeParse(raw);
  if (result.success) return result.data;
  const fieldErrors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const key = String(issue.path[0] ?? "form");
    fieldErrors[key] ??= issue.message;
  }
  throw new ActionError("Please fix the highlighted fields.", fieldErrors);
}
