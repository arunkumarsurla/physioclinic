import "./_env";
import { eq, sql } from "drizzle-orm";
import { db } from "../src/db";
import { roles, settings, users } from "../src/db/schema";
import { DEFAULT_ROLES } from "../src/lib/permissions";
import { generatePassword, hashPassword, passwordProblem } from "../src/lib/password";
import { SETTING_DEFAULTS } from "../src/lib/setting-defaults";

/**
 * Idempotent:
 *  - inserts the built-in roles if missing (never overwrites roles you have customised)
 *  - inserts default settings if missing
 *  - creates the first administrator ONLY if there are no users yet
 */
async function main() {
  for (const r of DEFAULT_ROLES) {
    const existing = await db.select({ id: roles.id }).from(roles).where(eq(roles.key, r.key)).limit(1);
    if (existing.length) continue;
    await db.insert(roles).values({
      key: r.key,
      name: r.name,
      description: r.description,
      permissions: r.permissions,
      isSystem: true,
    });
    console.log(`+ role ${r.name}`);
  }

  const defaults: Record<string, unknown> = {
    clinic_name: SETTING_DEFAULTS.clinicName,
    clinic_address: SETTING_DEFAULTS.clinicAddress,
    clinic_phone: SETTING_DEFAULTS.clinicPhone,
    default_card_fee: SETTING_DEFAULTS.defaultCardFee,
  };
  for (const [key, value] of Object.entries(defaults)) {
    await db.insert(settings).values({ key, value }).onConflictDoNothing();
  }

  const count = await db.select({ n: sql<number>`count(*)`.mapWith(Number) }).from(users);
  if ((count[0]?.n ?? 0) > 0) {
    console.log("Users already exist – not creating an administrator.");
    return;
  }

  const username = (process.env.ADMIN_USERNAME || "admin").trim().toLowerCase();
  const name = (process.env.ADMIN_NAME || "Administrator").trim();
  let password = process.env.ADMIN_PASSWORD?.trim() || "";
  let generated = false;
  if (!password) {
    password = generatePassword();
    generated = true;
  } else {
    const problem = passwordProblem(password, username);
    if (problem) throw new Error(`ADMIN_PASSWORD rejected: ${problem}`);
  }
  const admin = await db.select({ id: roles.id }).from(roles).where(eq(roles.key, "admin")).limit(1);
  await db.insert(users).values({
    username,
    name,
    passwordHash: await hashPassword(password),
    roleId: admin[0]!.id,
    mustChangePassword: generated,
  });
  console.log("\n==============================================");
  console.log(" First administrator created");
  console.log(`   username: ${username}`);
  if (generated) {
    console.log(`   password: ${password}`);
    console.log("   (shown only once – you will be asked to change it at first sign-in)");
  } else {
    console.log("   password: the ADMIN_PASSWORD you provided");
  }
  console.log("==============================================\n");
}

main().catch((e) => {
  console.error("Seed failed:", e);
  process.exit(1);
});
