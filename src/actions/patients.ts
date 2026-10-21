"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { patients } from "@/db/schema";
import { ActionError, run } from "@/lib/action";
import type { ActionState } from "@/lib/action-types";
import { audit } from "@/lib/audit";
import { can } from "@/lib/auth";
import { todayISO } from "@/lib/dates";
import { intOr0, isoDate, moneyOr0, optInt, optText, parseForm, reqText, triState } from "@/lib/forms";

const sexField = z.preprocess((v) => (v === "MALE" || v === "FEMALE" || v === "OTHER" ? v : null), z.enum(["MALE", "FEMALE", "OTHER"]).nullable());

const baseSchema = z.object({
  name: reqText("Patient name", 150),
  address: optText(300),
  phone: optText(40),
  age: optInt(0, 130),
  sex: sexField,
  weightKg: optInt(0, 500),
  htn: triState,
  bpReading: optText(40),
  dm: triState,
  referredBy: optText(150),
  oldCardNo: optInt(1, 2_000_000_000),
  registeredOn: isoDate("Registration date"),
  cardFee: moneyOr0(1_000_000),
  treatDays: intOr0(0, 1000),
  fee: moneyOr0(1_000_000),
  forDays: intOr0(0, 1000),
});

const clinicalSchema = z.object({
  complaints: optText(3000),
  examination: optText(3000),
  history: optText(3000),
  investigation: optText(3000),
  diagnosis: optText(3000),
  advice: optText(3000),
  avoid: optText(3000),
});

function planCheck(d: { treatDays: number; fee: number; forDays: number }) {
  const e: Record<string, string> = {};
  if (d.fee > 0 && d.forDays < 1) e.forDays = "Enter how many sittings one fee covers";
  if (d.fee > 0 && d.treatDays < 1) e.treatDays = "Enter the number of sittings planned";
  if (d.forDays > 0 && d.treatDays > 0 && d.forDays > d.treatDays) e.forDays = "Cannot be more than the total sittings planned";
  if (Object.keys(e).length) throw new ActionError("Please fix the highlighted fields.", e);
}

function changes(oldRow: Record<string, unknown>, next: Record<string, unknown>) {
  const out: Record<string, { from: unknown; to: unknown }> = {};
  for (const [k, v] of Object.entries(next)) if (String(oldRow[k] ?? "") !== String(v ?? "")) out[k] = { from: oldRow[k] ?? null, to: v ?? null };
  return out;
}

export async function createPatientAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  let cardNo = 0;
  const res = await run("patients:create", async (user) => {
    const base = parseForm(baseSchema, fd);
    planCheck(base);
    if (base.registeredOn > todayISO()) throw new ActionError("Please fix the highlighted fields.", { registeredOn: "Registration date cannot be in the future" });
    const clinical = can(user, "clinical:edit") ? parseForm(clinicalSchema, fd) : {};
    const [row] = await db
      .insert(patients)
      .values({ ...base, ...clinical, createdBy: user.id })
      .returning({ id: patients.id, cardNo: patients.cardNo });
    cardNo = row!.cardNo;
    await audit(user, "CREATE", "patient", cardNo, `Registered patient #${cardNo} ${base.name}`, { cardFee: base.cardFee });
    revalidatePath("/", "layout");
  });
  if (res.error) return res;
  redirect(`/patients/${cardNo}`);
}

export async function updatePatientAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  let cardNo = 0;
  const res = await run("patients:edit", async (user) => {
    const id = z.string().uuid().parse(fd.get("id"));
    const old = (await db.select().from(patients).where(eq(patients.id, id)).limit(1))[0];
    if (!old) throw new ActionError("Patient not found.");
    const base = parseForm(baseSchema, fd);
    planCheck(base);
    const clinical = can(user, "clinical:edit") ? parseForm(clinicalSchema, fd) : {};
    const next = { ...base, ...clinical };
    await db.update(patients).set({ ...next, updatedAt: new Date() }).where(eq(patients.id, id));
    cardNo = old.cardNo;
    const diff = changes(old as unknown as Record<string, unknown>, next);
    // clinical text can be long and sensitive – log which fields changed, not their content
    for (const k of Object.keys(clinicalSchema.shape)) if (diff[k]) diff[k] = { from: "…", to: "…" };
    await audit(user, "UPDATE", "patient", cardNo, `Updated patient #${cardNo} ${next.name}`, { changed: diff });
    revalidatePath("/", "layout");
  });
  if (res.error) return res;
  redirect(`/patients/${cardNo}`);
}

async function setArchived(fd: FormData, archived: boolean): Promise<ActionState> {
  return run("patients:delete", async (user) => {
    const id = z.string().uuid().parse(fd.get("id"));
    const p = (await db.select({ cardNo: patients.cardNo, name: patients.name }).from(patients).where(eq(patients.id, id)).limit(1))[0];
    if (!p) throw new ActionError("Patient not found.");
    await db.update(patients).set({ deletedAt: archived ? new Date() : null, updatedAt: new Date() }).where(eq(patients.id, id));
    await audit(user, archived ? "ARCHIVE" : "RESTORE", "patient", p.cardNo, `${archived ? "Archived" : "Restored"} patient #${p.cardNo} ${p.name}`);
    revalidatePath("/", "layout");
  });
}
export const archivePatientAction = async (fd: FormData) => setArchived(fd, true);
export const restorePatientAction = async (fd: FormData) => setArchived(fd, false);
