import Link from "next/link";
import { Card, PageHeader } from "@/components/ui";
import { requirePermission } from "@/lib/auth";

export const metadata = { title: "Reports" };

const REPORTS = [
  { href: "/reports/dues", title: "Outstanding dues", desc: "Patients who owe money for treatment terms already started, biggest first." },
  { href: "/reports/monthly", title: "Monthly summary", desc: "Income, expenses, new patients and sittings month by month." },
  { href: "/reports/op-cards", title: "OP cards issued", desc: "New patient cards registered in a period, with card fees collected." },
];

export default async function Reports() {
  await requirePermission("reports:view");
  return (
    <>
      <PageHeader title="Reports" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {REPORTS.map((r) => (
          <Link key={r.href} href={r.href} className="block rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2">
            <Card className="h-full transition-[border-color,box-shadow] hover:border-brand-300 hover:shadow-md focus-within:border-brand-400">
              <div className="flex items-center justify-between gap-3 font-semibold text-zinc-900">{r.title}<svg viewBox="0 0 20 20" className="h-4 w-4 shrink-0 text-brand-600" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="m8 5 5 5-5 5" /></svg></div>
              <p className="mt-1.5 text-sm text-zinc-500">{r.desc}</p>
            </Card>
          </Link>
        ))}
      </div>
    </>
  );
}
