import { NextResponse } from "next/server";
import { and, asc, desc, eq, gte, lte } from "drizzle-orm";
import { db } from "@/db";
import { auditLogs, expenses, patients, roles, settings, users, visits } from "@/db/schema";
import { audit } from "@/lib/audit";
import { can, getSession } from "@/lib/auth";
import { csvResponse, toCSV } from "@/lib/csv";
import { dateParam, startOfFinancialYear, startOfMonth, todayISO } from "@/lib/dates";
import { listPatients } from "@/server/patients";
import { duesReport, monthlySummary, opCardsReport } from "@/server/reports";
import { sp } from "@/lib/utils";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ name: string }> };

export async function GET(req: Request, { params }: Ctx) {
  const user = await getSession();
  if (!user || user.mustChangePassword) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { name } = await params;
  const u = new URL(req.url).searchParams;
  const today = todayISO();
  const stamp = today;

  // ---- full JSON backup (administrators)
  if (name === "backup") {
    if (!can(user, "backup:export")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const [r, us, p, v, ex, s, al] = await Promise.all([
      db.select().from(roles), db.select({ id: users.id, username: users.username, name: users.name, email: users.email, phone: users.phone, roleId: users.roleId, isActive: users.isActive, createdAt: users.createdAt }).from(users),
      db.select().from(patients), db.select().from(visits), db.select().from(expenses), db.select().from(settings), db.select().from(auditLogs),
    ]);
    await audit(user, "EXPORT", "backup", null, "Downloaded full data backup");
    return new Response(JSON.stringify({ exportedAt: new Date().toISOString(), roles: r, users: us, patients: p, visits: v, expenses: ex, settings: s, auditLogs: al }, null, 1), {
      headers: { "Content-Type": "application/json", "Content-Disposition": `attachment; filename="clinic-backup-${stamp}.json"`, "Cache-Control": "no-store" },
    });
  }

  if (!can(user, "reports:export")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const log = (what: string) => audit(user, "EXPORT", "report", name, `Exported ${what}`);

  switch (name) {
    case "patients": {
      const status = (["active", "archived", "all"].includes(sp(u.get("status") ?? "")) ? u.get("status") : "active") as "active" | "archived" | "all";
      const dues = can(user, "sittings:view") && ["due", "advance"].includes(u.get("dues") ?? "") ? (u.get("dues") as "due" | "advance") : "all";
      const { rows } = await listPatients({ q: u.get("q") ?? "", status, dues, sort: "card", pageSize: 50000 });
      await log(`patient list (${rows.length} rows)`);
      return csvResponse(`patients-${stamp}.csv`, toCSV(
        ["Card no", "Name", "Address", "Phone", "Age", "Sex", "Registered", "Planned sittings", "Fee per term", "Sittings per term", "Attended", "Paid", "Balance", "Last visit"],
        rows.map((r) => [r.cardNo, r.name, r.address, r.phone, r.age, r.sex, r.registeredOn, r.treatDays, r.fee, r.forDays, r.attended, r.paid, r.balance, r.lastVisit]),
      ));
    }
    case "visits": {
      const from = dateParam(u.get("from") ?? undefined, startOfMonth(today));
      const to = dateParam(u.get("to") ?? undefined, today);
      const rows = await db.select({ date: visits.visitDate, cardNo: patients.cardNo, name: patients.name, attended: visits.attended, payment: visits.payment, note: visits.note })
        .from(visits).innerJoin(patients, eq(patients.id, visits.patientId)).where(and(gte(visits.visitDate, from), lte(visits.visitDate, to))).orderBy(asc(visits.visitDate), asc(patients.cardNo));
      await log(`sittings ${from}…${to}`);
      return csvResponse(`sittings-${from}_${to}.csv`, toCSV(["Date", "Card no", "Patient", "Attended", "Payment", "Note"], rows.map((r) => [r.date, r.cardNo, r.name, r.attended ? "Yes" : "No", r.payment, r.note])));
    }
    case "expenses": {
      const from = dateParam(u.get("from") ?? undefined, startOfMonth(today));
      const to = dateParam(u.get("to") ?? undefined, today);
      const rows = await db.select({ date: expenses.expenseDate, title: expenses.title, amount: expenses.amount, notes: expenses.notes }).from(expenses)
        .where(and(gte(expenses.expenseDate, from), lte(expenses.expenseDate, to))).orderBy(desc(expenses.expenseDate), desc(expenses.createdAt));
      await log(`expenses ${from}…${to}`);
      return csvResponse(`expenses-${from}_${to}.csv`, toCSV(["Date", "Expense", "Amount", "Notes"], rows.map((r) => [r.date, r.title, r.amount, r.notes])));
    }
    case "op-cards": {
      const from = dateParam(u.get("from") ?? undefined, startOfMonth(today));
      const to = dateParam(u.get("to") ?? undefined, today);
      const r = await opCardsReport({ from, to });
      await log(`OP cards ${from}…${to}`);
      return csvResponse(`op-cards-${from}_${to}.csv`, toCSV(["Date", "Card no", "Old card", "Name", "Address", "Phone", "Referred by", "Fee"], r.rows.map((x) => [x.date, x.cardNo, x.oldCardNo, x.name, x.address, x.phone, x.referredBy, x.cardFee])));
    }
    case "dues": {
      const r = await duesReport({ q: u.get("q") ?? "", min: Math.max(0, Number(u.get("min")) || 0) });
      await log(`outstanding dues (${r.rows.length} patients)`);
      return csvResponse(`dues-${stamp}.csv`, toCSV(["Card no", "Name", "Address", "Phone", "Attended", "Planned", "Paid", "Due", "Last visit"], r.rows.map((x) => [x.cardNo, x.name, x.address, x.phone, x.attended, x.treatDays, x.paid, x.balance, x.lastVisit])));
    }
    case "monthly": {
      const from = dateParam(u.get("from") ?? undefined, startOfFinancialYear(today));
      const to = dateParam(u.get("to") ?? undefined, today);
      const r = await monthlySummary({ from, to });
      await log(`monthly summary ${from}…${to}`);
      return csvResponse(`monthly-${from}_${to}.csv`, toCSV(["Month", "New patients", "Sittings", "Card fees", "Treatment fees", "Income", "Expenses", "Net"], r.rows.map((m) => [m.month, m.newPatients, m.attendedSittings, m.cards, m.sittings, m.income, m.expenses, m.net])));
    }
    default:
      return NextResponse.json({ error: "Unknown export" }, { status: 404 });
  }
}
