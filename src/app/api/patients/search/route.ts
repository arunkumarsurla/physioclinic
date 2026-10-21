import { NextResponse } from "next/server";
import { can, getSession } from "@/lib/auth";
import { listPatients } from "@/server/patients";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await getSession();
  if (!user || user.mustChangePassword) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can(user, "patients:view")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const q = (new URL(req.url).searchParams.get("q") ?? "").slice(0, 80);
  if (!q.trim()) return NextResponse.json({ results: [] });
  const { rows } = await listPatients({ q, status: "active", pageSize: 8 });
  const money = can(user, "sittings:view");
  return NextResponse.json(
    { results: rows.map((r) => ({ id: r.id, cardNo: r.cardNo, name: r.name, address: r.address, phone: r.phone, balance: money ? r.balance : 0 })) },
    { headers: { "Cache-Control": "no-store" } },
  );
}
