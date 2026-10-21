#!/usr/bin/env python3
"""
Convert the legacy Visual FoxPro (.DBF) data into clean JSON for the new app.

Usage:
    pip install dbfread
    python scripts/export_legacy.py "<path-to>/VR SOFTWARES/VR SOFTWARES/NJ" data/legacy

Source tables  ->  New tables
  op.dbf       ->  patients      (OP card / case sheet)
  treat.dbf    ->  visits        (one row per patient per day: attended + payment)
  param2.dbf   ->  settings      (next card number, default card fee)

NOT migrated (no longer needed): party.dbf / parties.dbf (ledger accounts and cash
book – the card-fee and sitting rows were only copies of op.card / treat.payment).

prep.dbf / temp.dbf / daybook.dbf / pay.dbf were scratch tables used only to
print reports in the old software, so they are not migrated.
A raw CSV archive of every table is also written to data/legacy-archive/.
"""
import csv, json, re, sys
from datetime import date
from pathlib import Path
from dbfread import DBF

src = Path(sys.argv[1])
out = Path(sys.argv[2])
out.mkdir(parents=True, exist_ok=True)
archive = out.parent / "legacy-archive"
archive.mkdir(parents=True, exist_ok=True)


def table(name):
    return DBF(str(src / name), encoding="cp1252", ignore_missing_memofile=True,
               char_decode_errors="replace", lowernames=True)


def s(v):
    """trim; empty -> None"""
    if v is None:
        return None
    v = re.sub(r"\s+$", "", str(v)).strip()
    return v or None


def d(v):
    return v.isoformat() if isinstance(v, date) else None


def n(v, zero_is_null=False):
    if v is None:
        return None
    v = int(v) if float(v).is_integer() else float(v)
    return None if (zero_is_null and v == 0) else v


YES = {"yes", "y", "htn"}
NO = {"no", "not", "nt", "n"}


def flag(v):
    v = (s(v) or "").lower()
    if v in YES:
        return True
    if v in NO:
        return False
    return None


# ---- raw CSV archive of every real table ---------------------------------
for f in ["op", "treat", "param2"]:
    t = table(f + ".dbf")
    with open(archive / f"{f}.csv", "w", newline="", encoding="utf-8") as fh:
        w = csv.writer(fh)
        w.writerow(t.field_names)
        for r in t:
            w.writerow([("" if v is None else (v.isoformat() if isinstance(v, date) else str(v).rstrip()))
                        for v in r.values()])

# ---- patients -------------------------------------------------------------
patients = []
for r in table("op.dbf"):
    htn = flag(r["bp"])
    raw_bp = s(r["bp"])
    bp_reading = raw_bp if (raw_bp and htn is None) else None  # e.g. "130"
    sex = (s(r["sex"]) or "").upper()
    patients.append(dict(
        cardNo=int(r["no"]), registeredOn=d(r["dat"]),
        oldCardNo=n(r["old_no"], True),
        name=s(r["pname"]), address=s(r["add"]), phone=s(r["contact"]),
        age=n(r["age"], True), sex=sex if sex in ("MALE", "FEMALE") else None,
        weightKg=n(r["weight"], True),
        htn=htn, bpReading=bp_reading, dm=flag(r["db"]),
        referredBy=s(r["ref"]),
        complaints=s(r["complaints"]), examination=s(r["examin"]), history=s(r["history"]),
        investigation=s(r["invest"]), diagnosis=s(r["diagnosis"]),
        advice=s(r["advice"]), avoid=s(r["avoid"]),
        treatDays=n(r["treat_days"]) or 0, fee=n(r["fee"]) or 0,
        forDays=n(r["for_days"]) or 0, cardFee=n(r["card"]) or 0,
    ))
patients.sort(key=lambda p: p["cardNo"])

# ---- visits ---------------------------------------------------------------
card_nos = {p["cardNo"] for p in patients}
visits, skipped = [], 0
for r in table("treat.dbf"):
    if int(r["cno"]) not in card_nos or r["dat"] is None:
        skipped += 1
        continue
    visits.append(dict(cardNo=int(r["cno"]), date=d(r["dat"]),
                       attended=(s(r["treat"]) or "").upper() == "YES",
                       payment=n(r["payment"]) or 0))
visits.sort(key=lambda v: (v["date"], v["cardNo"]))

p2 = next(iter(table("param2.dbf")))
meta = dict(
    nextCardNo=int(p2["card"]), defaultCardFee=n(p2["op_amt"]),
    counts=dict(patients=len(patients), visits=len(visits), visitsSkippedOrphan=skipped),
    totals=dict(cardFees=sum(p["cardFee"] for p in patients),
                sittingPayments=sum(v["payment"] for v in visits)),
)
for name, obj in [("patients", patients), ("visits", visits), ("meta", meta)]:
    (out / f"{name}.json").write_text(json.dumps(obj, indent=1, ensure_ascii=False), encoding="utf-8")
print(json.dumps(meta, indent=2))
