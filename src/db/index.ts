import { neon, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

/**
 * Neon serverless (HTTP) driver.
 *
 * DATABASE_URL            – your Neon connection string (use the *pooled* one on Vercel).
 * NEON_HTTP_ENDPOINT      – optional. Only for local development against a plain Postgres
 *                           via a Neon-HTTP-compatible proxy, e.g. http://localhost:4444/sql
 *                           (see README "Local development").
 */
function create() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set. Copy .env.example to .env.local and fill it in.");
  if (process.env.NEON_HTTP_ENDPOINT) neonConfig.fetchEndpoint = process.env.NEON_HTTP_ENDPOINT;
  const client = neon(url);
  return { client, db: drizzle({ client, schema }) };
}

type Instance = ReturnType<typeof create>;
const g = globalThis as unknown as { __clinicDb?: Instance };
const instance = (): Instance => (g.__clinicDb ??= create());

/** Lazily created so `next build` works without a database connection. */
export const db = new Proxy({} as Instance["db"], {
  get(_t, prop) {
    const inst = instance().db;
    const value = Reflect.get(inst, prop, inst);
    return typeof value === "function" ? value.bind(inst) : value;
  },
});

/** Raw neon client (used by the migration runner for multi-statement transactions). */
export const rawClient = () => instance().client;

export { schema };
