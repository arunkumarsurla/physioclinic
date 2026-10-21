import "./_env";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { rawClient } from "../src/db";

/**
 * Minimal, dependency-free migration runner.
 * Applies db/migrations/*.sql in order, each inside one transaction, and
 * remembers what has been applied in the schema_migrations table.
 */
async function main() {
  const sql = rawClient();
  await sql.query(
    `CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`,
  );
  const applied = new Set((await sql.query(`SELECT name FROM schema_migrations`)).map((r) => (r as { name: string }).name));

  const dir = join(process.cwd(), "db", "migrations");
  const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
  let ran = 0;
  for (const file of files) {
    if (applied.has(file)) continue;
    const statements = readFileSync(join(dir, file), "utf8")
      .split("--> statement-breakpoint")
      .map((s) => s.trim())
      .filter(Boolean);
    process.stdout.write(`Applying ${file} (${statements.length} statements)… `);
    await sql.transaction((txn) => [
      ...statements.map((s) => txn.query(s)),
      txn.query(`INSERT INTO schema_migrations (name) VALUES ($1)`, [file]),
    ]);
    console.log("done");
    ran++;
  }
  console.log(ran ? `Applied ${ran} migration(s).` : "Database is up to date.");
}

main().catch((e) => {
  console.error("Migration failed:", e);
  process.exit(1);
});
