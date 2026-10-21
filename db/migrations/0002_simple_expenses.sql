-- Replace the cash book / ledger accounts with a simple, free-form expenses list.
-- Safe on a fresh database and on one that already ran 0001.

DROP VIEW IF EXISTS ledger_entries;
--> statement-breakpoint
DROP TABLE IF EXISTS cash_entries;
--> statement-breakpoint
DROP TABLE IF EXISTS ledger_accounts;
--> statement-breakpoint

CREATE TABLE expenses (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_date date NOT NULL,
  title        text NOT NULL,                 -- what it was for – written by you, no preset list
  amount       numeric(12,2) NOT NULL CHECK (amount > 0),
  notes        text,
  created_by   uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX expenses_date_idx ON expenses (expense_date);
--> statement-breakpoint

DELETE FROM settings WHERE key = 'opening_cash_balance';
--> statement-breakpoint

-- accounts:* permissions no longer exist
UPDATE roles
   SET permissions = array_remove(array_remove(permissions, 'accounts:view'), 'accounts:manage')
 WHERE permissions && ARRAY['accounts:view', 'accounts:manage'];
