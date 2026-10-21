/**
 * Billing model (carried over from the legacy software)
 * -----------------------------------------------------
 * Each patient has a treatment plan:
 *   treatDays – total sittings planned
 *   fee       – fee for one *term*
 *   forDays   – sittings covered by one term   ("Fee 2000 for 7 sittings")
 *
 * Number of terms in the plan = ceil(treatDays / forDays).
 * Attended sittings fill the terms in order (7 per term). Money received is
 * allocated to terms in order too (fee per term).
 *
 * A term is *billed* as soon as the patient has attended any sitting in it, or
 * has paid something towards it. Balance = fee of billed terms − total paid.
 *   balance > 0  → patient owes money
 *   balance < 0  → patient has paid in advance
 *
 * (Same rule as the old "Payment report" screen. The SQL used for lists
 * lives in src/server/patients.ts and is tested to give identical numbers.)
 */
export type BillingPlan = { treatDays: number; fee: number; forDays: number };

export type TermRow = {
  no: number;
  fee: number;
  sittings: number; // capacity of the term
  attended: number;
  paid: number;
  balance: number; // fee - paid
};

export type Billing = {
  configured: boolean; // plan has fee, treat days and sittings-per-term
  totalTerms: number;
  attended: number;
  paid: number;
  startedTerms: number;
  billedTerms: number;
  billed: number;
  balance: number;
  due: number; // max(balance, 0)
  advance: number; // max(-balance, 0)
  planTotal: number; // totalTerms * fee
  remainingSittings: number;
  beyondPlan: boolean; // attended more sittings than the plan covers
  terms: TermRow[]; // only terms that are billed
};

const paise = (n: number) => Math.round(n * 100);
const fromPaise = (p: number) => p / 100;

export function computeBilling(plan: BillingPlan, attended: number, paid: number): Billing {
  const treatDays = Math.max(0, Math.trunc(plan.treatDays || 0));
  const forDays = Math.max(0, Math.trunc(plan.forDays || 0));
  const feeP = paise(plan.fee || 0);
  const paidP = paise(paid || 0);

  const configured = feeP > 0 && forDays > 0 && treatDays > 0;
  const totalTerms = configured ? Math.ceil(treatDays / forDays) : 0;
  const startedTerms = forDays > 0 ? Math.ceil(attended / forDays) : 0;
  const paidTerms = feeP > 0 ? Math.ceil(paidP / feeP) : 0;
  const billedTerms = configured ? Math.min(totalTerms, Math.max(startedTerms, paidTerms)) : 0;

  const terms: TermRow[] = [];
  for (let k = 1; k <= billedTerms; k++) {
    const attendedIn = Math.min(forDays, Math.max(0, attended - (k - 1) * forDays));
    const paidInP = Math.min(feeP, Math.max(0, paidP - (k - 1) * feeP));
    terms.push({
      no: k,
      fee: fromPaise(feeP),
      sittings: forDays,
      attended: attendedIn,
      paid: fromPaise(paidInP),
      balance: fromPaise(feeP - paidInP),
    });
  }

  const billedP = billedTerms * feeP;
  const balanceP = configured ? billedP - paidP : 0; // no billing plan -> nothing is due
  return {
    configured,
    totalTerms,
    attended,
    paid: fromPaise(paidP),
    startedTerms,
    billedTerms,
    billed: fromPaise(billedP),
    balance: fromPaise(balanceP),
    due: fromPaise(Math.max(balanceP, 0)),
    advance: fromPaise(Math.max(-balanceP, 0)),
    planTotal: fromPaise(totalTerms * feeP),
    remainingSittings: Math.max(0, treatDays - attended),
    beyondPlan: treatDays > 0 && attended > treatDays,
    terms,
  };
}
