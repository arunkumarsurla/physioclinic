import "./_env";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { sql } from "drizzle-orm";
import { db } from "../src/db";
import { auditLogs, patients, settings, visits } from "../src/db/schema";

/**
 * Loads the data converted from the old FoxPro software (data/legacy/*.json).
 *
 *   npm run db:import-legacy            -> refuses to run if patients already exist
 *   npm run db:import-legacy -- --reset -> wipes patients and visits
 *                                          first, then imports
 */
const dir = join(process.cwd(), "data", "legacy");
const read = <T>(f: string): T => JSON.parse(readFileSync(join(dir, f), "utf8"));

type P = {
  cardNo: number; registeredOn: string; oldCardNo: number | null; name: string | null; address: string | null;
  phone: string | null; age: number | null; sex: "MALE" | "FEMALE" | null; weightKg: number | null;
  htn: boolean | null; bpReading: string | null; dm: boolean | null; referredBy: string | null;
  complaints: string | null; examination: string | null; history: string | null; investigation: string | null;
  diagnosis: string | null; advice: string | null; avoid: string | null;
  treatDays: number; fee: number; forDays: number; cardFee: number;
};
type V = { cardNo: number; date: string; attended: boolean; payment: number };
type Meta = { nextCardNo: number; defaultCardFee: number; totals: Record<string, number> };

const at = (iso: string) => new Date(`${iso}T09:00:00+05:30`);
const chunk = <T,>(a: T[], n: number) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, (i + 1) * n));

async function main() {
  const reset = process.argv.includes("--reset");
  const existing = (await db.select({ n: sql<number>`count(*)`.mapWith(Number) }).from(patients))[0]!.n;
  if (existing > 0 && !reset) {
    console.log(`The database already has ${existing} patients. Nothing imported. Use --reset to wipe and re-import.`);
    return;
  }
  if (reset) {
    console.log("Resetting patients and visits…");
    await db.delete(visits);
    await db.delete(patients);
  }

  const meta = read<Meta>("meta.json");
  const pats = read<P[]>("patients.json");
  const vis = read<V[]>("visits.json");

  // ---- patients
  process.stdout.write(`Patients (${pats.length})… `);
  for (const part of chunk(pats, 150)) {
    await db.insert(patients).values(
      part.map((p) => ({
        cardNo: p.cardNo, oldCardNo: p.oldCardNo, registeredOn: p.registeredOn, name: p.name?.trim() || "(name not recorded)", address: p.address,
        phone: p.phone, age: p.age, sex: p.sex, weightKg: p.weightKg, htn: p.htn, bpReading: p.bpReading, dm: p.dm,
        referredBy: p.referredBy, complaints: p.complaints, examination: p.examination, history: p.history,
        investigation: p.investigation, diagnosis: p.diagnosis, advice: p.advice, avoid: p.avoid,
        treatDays: p.treatDays, fee: p.fee, forDays: p.forDays, cardFee: p.cardFee,
        createdAt: at(p.registeredOn), updatedAt: at(p.registeredOn),
      })),
    );
  }
  console.log("done");
  const idRows = await db.select({ id: patients.id, cardNo: patients.cardNo }).from(patients);
  const patientId = new Map(idRows.map((r) => [r.cardNo, r.id]));

  // ---- visits
  process.stdout.write(`Visits (${vis.length})… `);
  for (const part of chunk(vis, 800)) {
    await db.insert(visits).values(
      part.map((v) => ({
        patientId: patientId.get(v.cardNo)!, visitDate: v.date, attended: v.attended, payment: v.payment,
        createdAt: at(v.date), updatedAt: at(v.date),
      })),
    );
  }
  console.log("done");

  // ---- counters & settings
  await db.execute(sql`SELECT setval('patient_card_no_seq', ${meta.nextCardNo}, false)`);
  await db
    .insert(settings)
    .values({ key: "default_card_fee", value: meta.defaultCardFee })
    .onConflictDoUpdate({ target: settings.key, set: { value: meta.defaultCardFee, updatedAt: new Date() } });

  await db.insert(auditLogs).values({
    action: "IMPORT", entity: "legacy", userName: "system",
    summary: `Imported legacy data: ${pats.length} patients, ${vis.length} visits`,
  });

  // ---- verification against totals computed from the original .DBF files
  const t = (
    await db.execute(sql`
      SELECT (SELECT count(*) FROM patients)::int AS patients,
             (SELECT count(*) FROM visits)::int AS visits,
             (SELECT coalesce(sum(card_fee),0) FROM patients)::float8 AS card_fees,
             (SELECT coalesce(sum(payment),0) FROM visits)::float8 AS sitting_payments,
             (SELECT last_value FROM patient_card_no_seq)::int AS next_card`)
  ).rows[0] as Record<string, number>;
  const checks: [string, number, number][] = [
    ["patients", t.patients, pats.length], ["visits", t.visits, vis.length],
    ["card fees", t.card_fees, meta.totals.cardFees], ["sitting payments", t.sitting_payments, meta.totals.sittingPayments],
  ];
  let ok = true;
  console.log("\nVerification (database vs. original FoxPro totals):");
  for (const [label, got, want] of checks) {
    const pass = Math.abs(got - want) < 0.005;
    ok &&= pass;
    console.log(`  ${pass ? "✔" : "✘"} ${label.padEnd(18)} ${got.toLocaleString("en-IN")}  (expected ${want.toLocaleString("en-IN")})`);
  }
  console.log(`  next card number will be ${t.next_card}`);
  if (!ok) throw new Error("Verification failed – totals do not match.");
  console.log("\nLegacy import complete.");
}

main().catch((e) => {
  console.error("Import failed:", e);
  process.exit(1);
});
