"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { patients, visits } from "@/db/schema";
import { ActionError, run } from "@/lib/action";
import type { ActionState } from "@/lib/action-types";
import { audit } from "@/lib/audit";
import { fmtDate, todayISO } from "@/lib/dates";
import { isoDate, moneyOr0, optText, parseForm } from "@/lib/forms";
import { inr } from "@/lib/money";
import { upsertVisit } from "@/server/visits";

const schema = z.object({
  patientId: z.string().uuid("Choose a patient"),
  date: isoDate("Date"),
  attended: z.preprocess((v) => v !== "no", z.boolean()),
  payment: moneyOr0(10_000_000),
  note: optText(300),
});

export async function recordVisitAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  return run("sittings:record", async (user) => {
    const d = parseForm(schema, fd);
    if (d.date > todayISO()) throw new ActionError("Please fix the highlighted fields.", { date: "Date cannot be in the future" });
    const p = (await db.select({ cardNo: patients.cardNo, name: patients.name, deletedAt: patients.deletedAt }).from(patients).where(eq(patients.id, d.patientId)).limit(1))[0];
    if (!p) throw new ActionError("Please fix the highlighted fields.", { patientId: "Patient not found" });
    if (p.deletedAt) throw new ActionError("This patient is archived. Restore the patient before recording sittings.");

    const { previous } = await upsertVisit({ ...d, userId: user.id });
    const what = `${d.attended ? "attended" : "absent"}${d.payment > 0 ? `, paid ${inr(d.payment)}` : ""}`;
    await audit(user, previous ? "UPDATE" : "CREATE", "visit", p.cardNo, `${previous ? "Updated" : "Recorded"} sitting for #${p.cardNo} ${p.name} on ${fmtDate(d.date)}: ${what}`, {
      date: d.date,
      attended: d.attended,
      payment: d.payment,
      ...(previous ? { previous: { attended: previous.attended, payment: previous.payment } } : {}),
    });
    revalidatePath("/", "layout");
    return { ok: true, message: `${previous ? "Updated" : "Saved"}: #${p.cardNo} ${p.name} – ${fmtDate(d.date)} (${what})` };
  });
}

export async function deleteVisitAction(fd: FormData): Promise<ActionState> {
  return run("sittings:delete", async (user) => {
    const id = fd.get("id");
    if (typeof id !== "string" || !z.string().uuid().safeParse(id).success) throw new ActionError("Invalid entry.");
    const row = (
      await db.select({ date: visits.visitDate, payment: visits.payment, cardNo: patients.cardNo, name: patients.name }).from(visits).innerJoin(patients, eq(patients.id, visits.patientId)).where(eq(visits.id, id)).limit(1)
    )[0];
    if (!row) throw new ActionError("Entry not found (already deleted?).");
    await db.delete(visits).where(eq(visits.id, id));
    await audit(user, "DELETE", "visit", row.cardNo, `Deleted sitting for #${row.cardNo} ${row.name} on ${fmtDate(row.date)} (${inr(row.payment)})`, { date: row.date, payment: row.payment });
    revalidatePath("/", "layout");
  });
}

