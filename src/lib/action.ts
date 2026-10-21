import "server-only";
import { getSession, can, type SessionUser } from "@/lib/auth";
import type { PermissionKey } from "@/lib/permissions";

import type { ActionState } from "@/lib/action-types";
export type { ActionState };

export class ActionError extends Error {
  fieldErrors?: Record<string, string>;
  constructor(message: string, fieldErrors?: Record<string, string>) {
    super(message);
    this.fieldErrors = fieldErrors;
  }
}

/** next/navigation's redirect()/notFound() work by throwing – let them through. */
function isControlFlow(e: unknown): boolean {
  return typeof e === "object" && e !== null && "digest" in e && String((e as { digest: unknown }).digest).startsWith("NEXT_");
}

/** Postgres errors surface as e.code (Neon) or e.cause.code (Drizzle wrapper). */
function pgError(e: unknown): { code?: string; constraint?: string; detail?: string } | null {
  const o = e as { code?: string; constraint?: string; detail?: string; cause?: unknown };
  if (o?.code && /^\d{5}$|^[0-9A-Z]{5}$/.test(o.code)) return o;
  if (o?.cause) return pgError(o.cause);
  return null;
}

export function friendlyDbError(e: unknown): string | null {
  const pg = pgError(e);
  if (!pg) return null;
  if (pg.code === "23505") {
    if (pg.constraint?.includes("username")) return "That username is already taken.";
    if (pg.constraint?.includes("roles_name")) return "A role with that name already exists.";
    if (pg.constraint?.includes("visits_patient")) return "An entry for that patient and date already exists.";
    return "That record already exists.";
  }
  if (pg.code === "23503") return "This record is still in use elsewhere, so the change was not allowed.";
  if (pg.code === "23514") return "One of the values is outside the allowed range.";
  return null;
}

/**
 * Wrap a server action: authenticates, checks permission, converts thrown
 * ActionErrors / DB constraint errors into form state.
 */
export async function run(
  perm: PermissionKey | PermissionKey[] | null,
  handler: (user: SessionUser) => Promise<ActionState | void>,
  opts?: { allowPasswordChange?: boolean },
): Promise<ActionState> {
  try {
    const user = await getSession();
    if (!user) return { error: "Your session has expired. Please sign in again." };
    if (user.mustChangePassword && !opts?.allowPasswordChange)
      return { error: "You must change your password before continuing." };
    if (perm) {
      const needed = Array.isArray(perm) ? perm : [perm];
      if (!needed.some((p) => can(user, p))) return { error: "You don't have permission to do that." };
    }
    return (await handler(user)) ?? { ok: true };
  } catch (e) {
    if (isControlFlow(e)) throw e;
    if (e instanceof ActionError) return { error: e.message, fieldErrors: e.fieldErrors };
    const friendly = friendlyDbError(e);
    if (friendly) return { error: friendly };
    console.error("action failed", e);
    return { error: "Something went wrong. Please try again." };
  }
}
