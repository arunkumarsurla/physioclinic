import {
  bigserial,
  boolean,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// NOTE: db/migrations/*.sql is the source of truth for the database.
// This file mirrors it so queries are fully typed.

const ts = (name: string) => timestamp(name, { withTimezone: true, mode: "date" });
const money = (name: string) => numeric(name, { precision: 12, scale: 2, mode: "number" });

export const roles = pgTable("roles", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: text("key").unique(),
  name: text("name").notNull().unique(),
  description: text("description"),
  permissions: text("permissions").array().notNull().default(sql`'{}'::text[]`),
  isSystem: boolean("is_system").notNull().default(false),
  createdAt: ts("created_at").notNull().defaultNow(),
  updatedAt: ts("updated_at").notNull().defaultNow(),
});

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    username: text("username").notNull(),
    name: text("name").notNull(),
    email: text("email"),
    phone: text("phone"),
    passwordHash: text("password_hash").notNull(),
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "restrict" }),
    isActive: boolean("is_active").notNull().default(true),
    mustChangePassword: boolean("must_change_password").notNull().default(false),
    lastLoginAt: ts("last_login_at"),
    createdAt: ts("created_at").notNull().defaultNow(),
    updatedAt: ts("updated_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("users_username_key").on(sql`lower(${t.username})`), index("users_role_idx").on(t.roleId)],
);

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull().unique(),
    expiresAt: ts("expires_at").notNull(),
    createdAt: ts("created_at").notNull().defaultNow(),
    lastSeenAt: ts("last_seen_at").notNull().defaultNow(),
    ip: text("ip"),
    userAgent: text("user_agent"),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

export const loginAttempts = pgTable("login_attempts", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  username: text("username").notNull(),
  ip: text("ip"),
  success: boolean("success").notNull(),
  createdAt: ts("created_at").notNull().defaultNow(),
});

export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  updatedAt: ts("updated_at").notNull().defaultNow(),
});

export const patients = pgTable(
  "patients",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    cardNo: integer("card_no")
      .notNull()
      .unique()
      .default(sql`nextval('patient_card_no_seq')`),
    oldCardNo: integer("old_card_no"),
    registeredOn: date("registered_on", { mode: "string" }).notNull(),
    name: text("name").notNull(),
    address: text("address"),
    phone: text("phone"),
    age: smallint("age"),
    sex: text("sex").$type<"MALE" | "FEMALE" | "OTHER" | null>(),
    weightKg: integer("weight_kg"),
    htn: boolean("htn"),
    bpReading: text("bp_reading"),
    dm: boolean("dm"),
    referredBy: text("referred_by"),
    complaints: text("complaints"),
    examination: text("examination"),
    history: text("history"),
    investigation: text("investigation"),
    diagnosis: text("diagnosis"),
    advice: text("advice"),
    avoid: text("avoid"),
    treatDays: integer("treat_days").notNull().default(0),
    fee: money("fee").notNull().default(0),
    forDays: integer("for_days").notNull().default(0),
    cardFee: money("card_fee").notNull().default(0),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: ts("created_at").notNull().defaultNow(),
    updatedAt: ts("updated_at").notNull().defaultNow(),
    deletedAt: ts("deleted_at"),
  },
  (t) => [
    index("patients_registered_idx").on(t.registeredOn),
    index("patients_name_idx").on(sql`lower(${t.name})`),
    index("patients_phone_idx").on(t.phone),
  ],
);

export const visits = pgTable(
  "visits",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id, { onDelete: "cascade" }),
    visitDate: date("visit_date", { mode: "string" }).notNull(),
    attended: boolean("attended").notNull().default(true),
    payment: money("payment").notNull().default(0),
    note: text("note"),
    recordedBy: uuid("recorded_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: ts("created_at").notNull().defaultNow(),
    updatedAt: ts("updated_at").notNull().defaultNow(),
  },
  (t) => [unique("visits_patient_id_visit_date_key").on(t.patientId, t.visitDate), index("visits_date_idx").on(t.visitDate)],
);

export const expenses = pgTable(
  "expenses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    expenseDate: date("expense_date", { mode: "string" }).notNull(),
    title: text("title").notNull(),
    amount: money("amount").notNull(),
    notes: text("notes"),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: ts("created_at").notNull().defaultNow(),
    updatedAt: ts("updated_at").notNull().defaultNow(),
  },
  (t) => [index("expenses_date_idx").on(t.expenseDate)],
);

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    userName: text("user_name"),
    action: text("action").notNull(),
    entity: text("entity").notNull(),
    entityId: text("entity_id"),
    summary: text("summary"),
    meta: jsonb("meta").$type<Record<string, unknown> | null>(),
    ip: text("ip"),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [index("audit_logs_created_idx").on(t.createdAt), index("audit_logs_entity_idx").on(t.entity, t.entityId)],
);
