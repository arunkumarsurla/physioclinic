import "server-only";
import { db } from "@/db";
import { auditLogs } from "@/db/schema";
import { headers } from "next/headers";

export async function clientIp(): Promise<string | null> {
  try {
    const h = await headers();
    const fwd = h.get("x-forwarded-for");
    return (fwd ? fwd.split(",")[0]!.trim() : h.get("x-real-ip")) || null;
  } catch {
    return null;
  }
}

type Actor = { id: string; name: string } | null;

/** Never throws – an audit failure must not break the user's action. */
export async function audit(
  actor: Actor,
  action: string,
  entity: string,
  entityId: string | number | null,
  summary: string,
  meta?: Record<string, unknown>,
) {
  try {
    await db.insert(auditLogs).values({
      userId: actor?.id ?? null,
      userName: actor?.name ?? null,
      action,
      entity,
      entityId: entityId === null ? null : String(entityId),
      summary,
      meta: meta ?? null,
      ip: await clientIp(),
    });
  } catch (e) {
    console.error("audit log failed", e);
  }
}
