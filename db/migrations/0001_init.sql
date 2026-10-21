-- Clinic Manager – initial schema (PostgreSQL / Neon)
-- Statements are separated by the marker below so the migration runner can
-- execute them one by one inside a single transaction.

CREATE TABLE roles (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key         text UNIQUE,                       -- set for built-in roles: admin | doctor | receptionist | accountant
  name        text NOT NULL UNIQUE,
  description text,
  permissions text[] NOT NULL DEFAULT '{}',
  is_system   boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint

CREATE TABLE users (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username             text NOT NULL,
  name                 text NOT NULL,
  email                text,
  phone                text,
  password_hash        text NOT NULL,
  role_id              uuid NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
  is_active            boolean NOT NULL DEFAULT true,
  must_change_password boolean NOT NULL DEFAULT false,
  last_login_at        timestamptz,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX users_username_key ON users (lower(username));
--> statement-breakpoint
CREATE INDEX users_role_idx ON users (role_id);
--> statement-breakpoint

CREATE TABLE sessions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash   text NOT NULL UNIQUE,
  expires_at   timestamptz NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  ip           text,
  user_agent   text
);
--> statement-breakpoint
CREATE INDEX sessions_user_idx ON sessions (user_id);
--> statement-breakpoint

CREATE TABLE login_attempts (
  id         bigserial PRIMARY KEY,
  username   text NOT NULL,
  ip         text,
  success    boolean NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX login_attempts_lookup_idx ON login_attempts (lower(username), created_at DESC);
--> statement-breakpoint

CREATE TABLE settings (
  key        text PRIMARY KEY,
  value      jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint

-- ---------------------------------------------------------------- patients
CREATE SEQUENCE patient_card_no_seq START 1;
--> statement-breakpoint

CREATE TABLE patients (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_no       integer NOT NULL UNIQUE DEFAULT nextval('patient_card_no_seq'),
  old_card_no   integer,
  registered_on date NOT NULL,
  name          text NOT NULL,
  address       text,
  phone         text,
  age           smallint CHECK (age BETWEEN 0 AND 130),
  sex           text CHECK (sex IN ('MALE', 'FEMALE', 'OTHER')),
  weight_kg     integer CHECK (weight_kg BETWEEN 0 AND 500),
  htn           boolean,                         -- hypertension
  bp_reading    text,                            -- free-text BP reading, when one was recorded instead of yes/no
  dm            boolean,                         -- diabetes
  referred_by   text,
  complaints    text,
  examination   text,
  history       text,
  investigation text,
  diagnosis     text,
  advice        text,
  avoid         text,
  treat_days    integer NOT NULL DEFAULT 0 CHECK (treat_days >= 0),   -- planned sittings in total
  fee           numeric(12,2) NOT NULL DEFAULT 0 CHECK (fee >= 0),    -- fee per term
  for_days      integer NOT NULL DEFAULT 0 CHECK (for_days >= 0),     -- sittings covered by one fee (a term)
  card_fee      numeric(12,2) NOT NULL DEFAULT 0 CHECK (card_fee >= 0),
  created_by    uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  deleted_at    timestamptz                      -- archived patients stay in the books
);
--> statement-breakpoint
CREATE INDEX patients_registered_idx ON patients (registered_on);
--> statement-breakpoint
CREATE INDEX patients_name_idx ON patients (lower(name));
--> statement-breakpoint
CREATE INDEX patients_phone_idx ON patients (phone);
--> statement-breakpoint

-- ------------------------------------------------------------------ visits
-- One row per patient per day: whether they attended, and what they paid.
CREATE TABLE visits (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id  uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  visit_date  date NOT NULL,
  attended    boolean NOT NULL DEFAULT true,
  payment     numeric(12,2) NOT NULL DEFAULT 0 CHECK (payment >= 0),
  note        text,
  recorded_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (patient_id, visit_date)
);
--> statement-breakpoint
CREATE INDEX visits_date_idx ON visits (visit_date);
--> statement-breakpoint

-- ---------------------------------------------------------------- accounts
CREATE TABLE ledger_accounts (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code          text NOT NULL UNIQUE,
  name          text NOT NULL,
  account_group text NOT NULL CHECK (account_group IN ('INCOME', 'BANKS', 'EXPENSES', 'ASSETS', 'GENERAL')),
  address       text,
  phone         text,
  email         text,
  contact       text,
  is_system     boolean NOT NULL DEFAULT false,
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint

-- Manual cash book entries (expenses paid, other receipts).
CREATE TABLE cash_entries (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_date date NOT NULL,
  voucher_no integer NOT NULL,
  account_id uuid NOT NULL REFERENCES ledger_accounts(id) ON DELETE RESTRICT,
  kind       text NOT NULL CHECK (kind IN ('PAYMENT', 'RECEIPT')),
  amount     numeric(12,2) NOT NULL CHECK (amount > 0),
  narration  text,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (entry_date, voucher_no)
);
--> statement-breakpoint
CREATE INDEX cash_entries_account_idx ON cash_entries (account_id, entry_date);
--> statement-breakpoint

-- ------------------------------------------------------------------- audit
CREATE TABLE audit_logs (
  id         bigserial PRIMARY KEY,
  user_id    uuid REFERENCES users(id) ON DELETE SET NULL,
  user_name  text,
  action     text NOT NULL,
  entity     text NOT NULL,
  entity_id  text,
  summary    text,
  meta       jsonb,
  ip         text,
  created_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX audit_logs_created_idx ON audit_logs (created_at DESC);
--> statement-breakpoint
CREATE INDEX audit_logs_entity_idx ON audit_logs (entity, entity_id);
--> statement-breakpoint

-- Built-in income accounts. They are system accounts: the ledger view below
-- posts card fees to 9001 and sitting payments to 9002 automatically.
INSERT INTO ledger_accounts (code, name, account_group, is_system)
VALUES ('9001', 'NEW OP-CARD A/C', 'INCOME', true),
       ('9002', 'TREATMENT FEE A/C', 'INCOME', true);
--> statement-breakpoint

-- ------------------------------------------------------------ ledger view
-- Every rupee in the books, in one place.
--   credit = money received, debit = money paid out.
-- Card fees and sitting payments are DERIVED from patients / visits, so they
-- can never drift out of sync with the patient records.
CREATE VIEW ledger_entries AS
  SELECT 'CARD'::text            AS source,
         p.registered_on         AS entry_date,
         p.card_no               AS ref_no,
         1                       AS sort_group,
         a.id                    AS account_id,
         a.code                  AS account_code,
         a.name                  AS account_name,
         p.name || COALESCE(' - ' || p.address, '') || ' (card #' || p.card_no || ')' AS narration,
         0::numeric(14,2)        AS debit,
         p.card_fee::numeric(14,2) AS credit,
         p.created_at            AS created_at
    FROM patients p
    JOIN ledger_accounts a ON a.code = '9001'
   WHERE p.card_fee > 0
  UNION ALL
  SELECT 'SITTING'::text,
         v.visit_date,
         p.card_no,
         2,
         a.id,
         a.code,
         a.name,
         p.name || COALESCE(' - ' || p.address, '') || ' (card #' || p.card_no || ')',
         0::numeric(14,2),
         v.payment::numeric(14,2),
         v.created_at
    FROM visits v
    JOIN patients p ON p.id = v.patient_id
    JOIN ledger_accounts a ON a.code = '9002'
   WHERE v.payment > 0
  UNION ALL
  SELECT 'CASH'::text,
         e.entry_date,
         e.voucher_no,
         3,
         a.id,
         a.code,
         a.name,
         COALESCE(e.narration, ''),
         CASE WHEN e.kind = 'PAYMENT' THEN e.amount ELSE 0 END::numeric(14,2),
         CASE WHEN e.kind = 'RECEIPT' THEN e.amount ELSE 0 END::numeric(14,2),
         e.created_at
    FROM cash_entries e
    JOIN ledger_accounts a ON a.id = e.account_id;
