# Clinic Manager

A web application that replaces the old Visual FoxPro clinic software (`VR SOFTWARES/NJ`).
Built with **Next.js (App Router)**, **Neon Postgres**, **Drizzle ORM** and **Tailwind CSS**.

Your existing data (1,122 patients and 14,307 sittings with their payments) is already
converted and ships in `data/legacy/`; one command loads it into your database.

---

## 1 · Run it (10 minutes)

**Prerequisites:** Node.js 20.9+ and a free [Neon](https://neon.tech) account.

```bash
npm install
cp .env.example .env.local        # then edit it (below)
npm run db:setup                  # creates tables, roles, first admin, imports your old data
npm run dev                       # http://localhost:3000
```

In `.env.local` set:

| Variable | What |
|---|---|
| `DATABASE_URL` | Neon → *Connection Details* → copy the **pooled** connection string |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | First administrator. If the password is empty a strong one is generated, printed **once** in the terminal, and you must change it at first sign-in |
| `APP_TIMEZONE` | Default `Asia/Kolkata`. "Today" and all dates use this zone |
| `SESSION_HOURS` | Default `12` |

`npm run db:setup` = `db:migrate` → `db:seed` → `db:import-legacy`. Already running an earlier version? Just run `npm run db:migrate` – it removes the old cash-book/ledger tables and adds expenses; your patients and sittings are untouched. All three are safe to re-run
(the import refuses to run if patients already exist; `npm run db:import-legacy -- --reset` wipes and re-imports).
The importer **verifies** the database against totals computed from the original FoxPro files and prints ✔/✘.

**Deploy:** push to GitHub (see the privacy note), import into Vercel, add `DATABASE_URL`
(and `APP_TIMEZONE`) as environment variables. Run `npm run db:setup` once from your computer against the same Neon database.
Use a separate Neon *branch* for development.

---

## 2 · What's in it

| Area | What you can do |
|---|---|
| **Dashboard** | Today's patients / collections, month income, expenses & net, outstanding dues, 14-day chart, top dues |
| **Patients** | Search by name / card no. / phone / address; register (auto card number); edit; archive/restore; printable OP card; filter by dues |
| **Patient record** | Case sheet, billing terms, balance, full sitting & payment history, record / edit / delete sittings |
| **Daily register** | Any day's sittings with type-ahead patient search, payments, balances; day totals |
| **Expenses** | Write your own expenses (date, what it was for, amount, optional notes) – no preset categories. Totals for any period, search, edit, delete, CSV export |
| **Reports** | Outstanding dues, monthly summary (income vs. expenses), OP cards issued. All print-friendly and exportable to CSV |
| **Users** | Add users, assign a role, deactivate, reset password, sign out everywhere |
| **Roles** | Built-in Admin / Doctor / Receptionist / Accountant, plus your own roles with a permission matrix |
| **WhatsApp** | One-tap WhatsApp messages with the text pre-filled: sitting reminder, dues reminder, payment receipt, general hello (see below) |
| **Settings** | Clinic name/address/phone, default card fee, WhatsApp wording, full JSON backup download |
| **Audit log** | Every create / edit / delete / login / export, with who, when, IP and before-after details |

### WhatsApp messages
Buttons appear where staff already look at a patient's phone number:

| Where | Button |
|---|---|
| Patients list | WhatsApp icon beside the phone number (general message) |
| Patient page | **WhatsApp** card: general message, sitting reminder, dues reminder (only when money is owed, shows the amount) · **Receipt** link on every sitting row that has a payment |
| Daily register | One smart button per row: **Receipt** if money was received, else **Dues** if a balance is pending, else **Reminder** if the patient was absent |
| Outstanding dues report & dashboard "Highest dues" | **Remind** beside each phone number |

How it works: the button opens `wa.me` with the message already typed and the staff member presses *Send* from the clinic's own
WhatsApp or WhatsApp Business (phone or WhatsApp Web). **Nothing is sent automatically and no WhatsApp API account is needed.**
The message is built on the server from live figures (so amounts can't be edited via the link), the click is recorded in the
**Audit log** (area `whatsapp`, including the exact text), and permissions are checked on the server:
general / reminder messages need *view patients*; receipts and dues messages also need *view sittings and patient payments*.

* Phone numbers are cleaned automatically: `98470 12345`, `+91 98470-12345`, `09847012345` all work; if the field holds several
  numbers the first mobile number is used; Indian landlines are skipped (they can't have WhatsApp), so no button is shown for them.
* **Settings → WhatsApp messages**: change the wording of all four messages (placeholders such as `{first_name}`, `{due}`, `{clinic}`,
  `{amount}` are listed there), change the country code (default `91`), or hide every WhatsApp button.
  Clearing a template and saving restores the original wording.
* No database migration is needed – the templates live in the existing `settings` table.
* Want fully automatic sending (no click)? That needs the WhatsApp Business Cloud API, approved message templates and a Meta business
  account; the message-building code in `src/server/whatsapp.ts` is the part you would reuse.

### Roles & permissions
Permissions are enforced **on the server** for every page, API route and action – hiding a button is never the only protection.
The sidebar only shows what a user may open. Examples of the granularity:

* *Clinical notes* (complaints, diagnosis, advice…) have their own `clinical:view/edit`, so a receptionist can register patients and take payments without seeing medical notes.
* Money pages need `sittings:view`; exporting needs `reports:export`; the JSON backup needs `backup:export`.
* Dependent permissions are added automatically (e.g. *edit patients* implies *view patients*).
* Safeguards: the Admin role can't be edited, you can't deactivate yourself, and the last active admin can't be removed or demoted.

| Built-in role | Can do |
|---|---|
| Admin | Everything |
| Doctor | Patients + clinical notes, record sittings, view reports |
| Receptionist | Register / edit patients, record sittings & payments (no clinical notes, no expenses) |
| Accountant | Expenses, all reports & exports; read-only on patients |

Built-in roles other than Admin can be customised in **Roles**; they are only inserted once, so your changes are never overwritten by `db:seed`.

### Security
* Passwords hashed with bcrypt (cost 12); policy: 8+ chars with a letter and a number.
* Server-side sessions: only a SHA-256 hash of the cookie token is stored, cookie is `httpOnly`, `SameSite=Lax`, `Secure` in production.
  Deactivating a user or resetting a password signs them out immediately.
* Login lock-out after 5 failures in 15 minutes; constant-time-ish response for unknown usernames.
* All input validated with Zod; SQL via parameterised queries; React escapes output; CSV exports neutralise spreadsheet-formula injection.
* Security headers (`X-Frame-Options`, `nosniff`, referrer & permissions policies).

---

## 3 · How the old software mapped to the new one

| Old (FoxPro) | New |
|---|---|
| `op.dbf` – OP card | `patients` (card no., case sheet, treatment plan, card fee) |
| `treat.dbf` – sittings & payment per day | `visits` (attended + payment, unique per patient per day) |
| `party.dbf` / `parties.dbf` – ledger accounts & cash book | **Removed** (not migrated). Card fees and sitting payments live on the patient and sitting records, so income is always calculated from those. Expenses are now a plain free-text list |
| `param2.dbf` | `settings` (default card fee) + a Postgres sequence for card numbers (continues at **1184**) |
| menu: *Update Index Files*, *Refresh*, *Backup* | Not needed (Postgres indexes itself; Neon keeps history) – replaced by the JSON backup button |
| `prep.dbf`, `temp.dbf`, `daybook.dbf`, `pay.dbf`, `treat.prg`, `pay.prg` … | Scratch tables for printing / an unused hospital-era module – **removed** |
| Hospital leftovers on the card (bed no., discharge date) | **Removed** (never used) |

A raw CSV copy of the migrated tables (`op`, `treat`, `param2`) is kept in `data/legacy-archive/`.

### Billing logic (preserved)
A patient has a plan: *N sittings in total, ₹fee for every `for_days` sittings* (a **term**). Attended sittings and
payments fill the terms in order. A term is billed once the patient has attended or paid towards it.
`Balance = billed terms × fee − total paid` (positive = owes, negative = paid in advance).
The same rule is implemented in TypeScript (patient page) and SQL (lists, reports) and tested to agree for all 1,122 patients.

### Data notes (things I normalised – please glance at them)
* **Dues total ₹7,88,840 across 391 patients.** The old *Payment report* ignored money recorded on days marked *absent* (21 payments, ₹37,200 in total). The new app counts every rupee received, and a payment also bills the term it pays towards. Result: 15 patients' balances differ from what the old screen showed (old rule: ₹7,87,940 across 386 patients). If you prefer the old behaviour, change `visits.payment` handling in `src/lib/billing.ts` and `balanceSql` in `src/server/patients.ts`.
* The old `BP` field mixed `Yes / No / Not / Nt / HTN / 130`. It is now *Hypertension: Yes/No/Not recorded* plus a free-text *BP reading* (kept `130` there).
* Two cards (**#307**, **#893**) had a blank patient name but a ₹100 card fee; they are kept as "(name not recorded)" so the books still balance.
* Patient names in `treat.dbf` differed from `op.dbf` in 372 rows (names were edited later); the card record is treated as the truth.
* The clinic name defaults to **Navajyothi Physiotherapy** (taken from a commented-out title in the old code) – change it in *Settings*.

---

## 4 · Privacy
`data/legacy/` and `data/legacy-archive/` contain real patient records. Don't publish them. Once imported into Neon you can delete both folders.
Downloads of patient data (CSV / backup) are recorded in the audit log.

## 5 · Project layout
```
db/migrations/                database schema (source of truth): 0001 base, 0002 simple expenses
scripts/                      migrate · seed · import-legacy · export_legacy.py (FoxPro → JSON)
src/app/(app)/…               pages (patients, sittings, expenses, reports, users, roles, settings, audit)
src/actions/                  server actions (all permission-checked + audited)
src/server/                   data-access queries
src/lib/                      auth, permissions, billing, dates, money, csv, validation, whatsapp (phone cleaning, templates, wa.me links)
src/components/               UI + forms + WhatsApp button
src/app/api/whatsapp/         permission-checked, audited redirect to WhatsApp
```
Re-running the converter (only if you change the source data): `pip install dbfread && python scripts/export_legacy.py "<path>/NJ" data/legacy`.

## 6 · What was verified
* `tsc` strict type-check and a production `next build` pass.
* 118 automated end-to-end checks against the production server and a real PostgreSQL: auth & lock-out, every page, role-based access
  (including crafted requests), validation, billing, exports, user/role lifecycle, forced password change, XSS and CSV-injection.
* Imported totals match the original FoxPro files exactly.

* WhatsApp phone cleaning, template rendering and link building have unit checks (20+ phone formats). The WhatsApp screens themselves were
  written after the verification above and were **not** run through `next build` or the browser in my environment (dependencies could not be installed there) – please run `npm run typecheck` and `npm run build` once after unzipping.

Not done here: I could not open the UI in a real browser or connect to a live Neon project from my environment, so please
click through the main screens once after setup (and tell me if anything looks off).
#   p h y s i o c l i n i c  
 