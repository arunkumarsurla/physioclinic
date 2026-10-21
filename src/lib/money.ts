const inr0 = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });
const inr2 = new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** 123456 -> ₹1,23,456 (decimals only shown when there are paise) */
export function inr(n: number | null | undefined): string {
  const v = Number(n ?? 0);
  const neg = v < 0;
  const abs = Math.abs(v);
  const body = Number.isInteger(abs) ? inr0.format(abs) : inr2.format(abs);
  return `${neg ? "-" : ""}₹${body}`;
}

/** plain number with Indian digit grouping, no symbol */
export function num(n: number | null | undefined): string {
  const v = Number(n ?? 0);
  return Number.isInteger(v) ? inr0.format(v) : inr2.format(v);
}

export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
