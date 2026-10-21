import { NextResponse } from "next/server";
import { audit } from "@/lib/audit";
import { getSession } from "@/lib/auth";
import { isISODate } from "@/lib/dates";
import { WA_KIND_LABELS, isWaKind } from "@/lib/whatsapp";
import { getSettings } from "@/server/settings";
import { buildWhatsApp } from "@/server/whatsapp";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ cardNo: string }> };

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/** Small stand-alone page: this link is opened in a new tab, so a JSON error would be unfriendly. */
function problem(status: number, message: string, cardNo?: number) {
  const back = cardNo ? `/patients/${cardNo}` : "/";
  return new Response(
    `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>WhatsApp</title>` +
      `<body style="font-family:system-ui,sans-serif;max-width:28rem;margin:15vh auto;padding:0 1.25rem;color:#27272a">` +
      `<h1 style="font-size:1.1rem">Couldn’t open WhatsApp</h1><p style="line-height:1.5">${esc(message)}</p>` +
      `<p><a href="${back}" style="color:#0f766e">← Back to the app</a></p>`,
    { status, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } },
  );
}

/**
 * GET /api/whatsapp/<cardNo>?kind=general|reminder|receipt|dues[&date=YYYY-MM-DD]
 * Checks the session and permissions, builds the message from live data,
 * records it in the audit log and redirects to the wa.me link.
 */
export async function GET(req: Request, { params }: Ctx) {
  const user = await getSession();
  if (!user) return NextResponse.redirect(new URL("/login", req.url));
  if (user.mustChangePassword) return NextResponse.redirect(new URL("/account/password", req.url));

  const cardNo = Number((await params).cardNo);
  const q = new URL(req.url).searchParams;
  const kind = q.get("kind") ?? "general";
  if (!Number.isInteger(cardNo) || !isWaKind(kind)) return problem(400, "That link isn’t valid.");
  const dateParam = q.get("date");
  if (dateParam !== null && !isISODate(dateParam)) return problem(400, "That date isn’t valid.", cardNo);

  const settings = await getSettings();
  const r = await buildWhatsApp(user, settings, { cardNo, kind, date: dateParam });
  if (!r.ok) return problem(r.status, r.error, cardNo);

  await audit(user, "WHATSAPP", "whatsapp", r.patient.cardNo, `Opened WhatsApp ${WA_KIND_LABELS[kind].toLowerCase()} for #${r.patient.cardNo} ${r.patient.name}`, {
    kind,
    ...(dateParam ? { date: dateParam } : {}),
    message: r.text,
  });
  return new Response(null, { status: 302, headers: { Location: r.url, "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });
}
