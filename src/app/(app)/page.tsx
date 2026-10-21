import Link from "next/link";
import { redirect } from "next/navigation";
import { Card, PageHeader, Stat, StatGroup, Table, td, tdr, th, thr, thead, tbody, MoneyCell, btn, linkAction } from "@/components/ui";
import { can, requireUser } from "@/lib/auth";
import { fmtDate, fmtDay, todayISO, weekday } from "@/lib/dates";
import { inr } from "@/lib/money";
import { WhatsAppLink } from "@/components/whatsapp";
import { getDashboard } from "@/server/dashboard";
import { getSettings } from "@/server/settings";
import { waAllowed } from "@/server/whatsapp";
import {
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  IndianRupee,
  UserPlus,
  Receipt,
  TrendingUp,
  TrendingDown,
  Wallet,
  Users,
  AlertCircle,
  ChevronRight,
} from "lucide-react";

export const metadata = { title: "Dashboard" };

const LANDING: [Parameters<typeof can>[1], string][] = [
  ["patients:view", "/patients"], ["sittings:view", "/sittings"], ["expenses:view", "/expenses"], ["reports:view", "/reports"],
  ["users:view", "/users"], ["roles:manage", "/roles"], ["settings:manage", "/settings"], ["audit:view", "/audit"],
];

export default async function Dashboard() {
  const user = await requireUser();
  if (!can(user, "dashboard:view")) {
    const next = LANDING.find(([p]) => can(user, p));
    redirect(next ? next[1] : "/forbidden");
  }
  const today = todayISO();
  const [d, settings] = await Promise.all([getDashboard(today), getSettings()]);
  const waDues = waAllowed(user, settings, "dues");
  const max = Math.max(1, ...d.last14.map((x) => x.amount));
  const showMoney = can(user, "sittings:view") || can(user, "reports:view") || can(user, "expenses:view");

  const total14 = d.last14.reduce((a, x) => a + x.amount, 0);
  const net = d.month.income - d.month.expenses;
  const spend = d.month.income > 0 ? Math.min(100, Math.round((d.month.expenses / d.month.income) * 100)) : d.month.expenses > 0 ? 100 : 0;

  return (
    <>
      

<PageHeader
        title={`Hello, ${user.name.split(" ")[0]}`}
        subtitle={`${weekday(today)}, ${fmtDate(today)}`}
        actions={
          <>
            {can(user, "sittings:record") && (
              <Link href="/sittings" className={btn("primary")}>
                <Calendar className="mr-1.5 h-4 w-4" />
                Record today&apos;s sittings
              </Link>
            )}
            {can(user, "patients:create") && (
              <Link href="/patients/new" className={btn("secondary")}>
                <UserPlus className="mr-1.5 h-4 w-4" />
                New patient
              </Link>
            )}
            {can(user, "expenses:create") && (
              <Link href="/expenses" className={btn("secondary")}>
                <Receipt className="mr-1.5 h-4 w-4" />
                Add expense
              </Link>
            )}
          </>
        }
      />

      <StatGroup cols={showMoney ? 4 : 2}>
        <Stat label="Patients today" value={d.day.attended} sub={d.day.absent ? `${d.day.absent} marked absent` : "attended sittings"} />
        <Stat label="New cards today" value={d.day.newPatients} sub={d.day.cardFees ? `${inr(d.day.cardFees)} card fees` : "—"} />
        {showMoney && <Stat label="Collected today" value={inr(d.day.payments + d.day.cardFees)} sub="sittings + cards" tone="good" />}
        {showMoney && <Stat label="Outstanding dues" value={inr(d.dues.total)} sub={`${d.dues.count} patients`} tone={d.dues.total > 0 ? "warn" : undefined} />}
      </StatGroup>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          {showMoney && (
            <Card title="This month" className="overflow-hidden">
              <div className="grid gap-5 sm:grid-cols-3">
                <div><div className="text-xs font-medium text-zinc-500">Income</div><div className="mt-1 text-xl font-semibold tabular-nums">{inr(d.month.income)}</div><div className="mt-0.5 text-xs text-zinc-500">card fees + treatment</div></div>
                <div><div className="text-xs font-medium text-zinc-500">Expenses</div><div className="mt-1 text-xl font-semibold tabular-nums">{inr(d.month.expenses)}</div></div>
                <div><div className="text-xs font-medium text-zinc-500">Net</div><div className={`mt-1 text-xl font-semibold tabular-nums ${net < 0 ? "text-red-700" : "text-brand-700"}`}>{inr(net)}</div></div>
              </div>
              <div className="mt-4" role="img" aria-label={`Expenses are ${spend}% of income this month`}>
                <div className="h-2 overflow-hidden rounded-full bg-brand-100"><div className={`h-full rounded-full ${spend >= 100 ? "bg-red-500" : "bg-amber-500"}`} style={{ width: `${spend}%` }} /></div>
                <div className="mt-1.5 text-xs text-zinc-500">{spend}% of income went to expenses</div>
              </div>
            </Card>
          )}

          {showMoney && (
            <Card title="Collections – last 14 days" actions={<span className="text-xs tabular-nums text-zinc-500">{inr(total14)} total</span>}>
              <div className="relative">
                <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 flex h-36 flex-col justify-between sm:h-48">
                  {[0, 1, 2].map((i) => <div key={i} className="border-t border-dashed border-zinc-200" />)}
                </div>
                <div className="relative flex h-44 items-end gap-1 sm:h-56 sm:gap-2" role="img" aria-label="Daily collections for the last 14 days">
                  {d.last14.map((x, i) => (
                    <div key={x.date} title={`${fmtDay(x.date)}: ${inr(x.amount)}`} className="group flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1">
                      <div className={x.date === today ? "text-[10px] font-medium tabular-nums text-brand-700" : "text-[10px] tabular-nums text-zinc-500 opacity-0 transition-opacity group-hover:opacity-100"}>{x.amount ? Math.round(x.amount).toLocaleString("en-IN") : ""}</div>
                      <div className={x.date === today ? "w-full rounded-t-md bg-brand-600" : "w-full rounded-t-md bg-brand-200 transition-colors group-hover:bg-brand-400"} style={{ height: `${Math.max(2, (x.amount / max) * 78)}%` }} />
                      <div className={`text-[10px] text-zinc-400 ${i % 2 === 1 ? "max-sm:invisible" : ""}`}>{fmtDay(x.date).split(" ")[0]}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-3 text-xs text-zinc-500">Peak day {inr(max === 1 ? 0 : max)} · hover or long-press a bar for the amount</div>
            </Card>
          )}
        </div>

        {can(user, "patients:view") && d.topDues.length > 0 && (
          <Card title="Highest dues" flush className="self-start" actions={can(user, "reports:view") ? <Link href="/reports/dues" className={linkAction}>All dues</Link> : undefined}>
            <Table>
              <thead className={thead}><tr><th className={th}>Patient</th><th className={thr}>Due</th></tr></thead>
              <tbody className={tbody}>
                {d.topDues.map((p) => (
                  <tr key={p.cardNo}>
                    <td data-label="Patient" data-primary className={td}><Link href={`/patients/${p.cardNo}`} className="font-medium hover:underline">#{p.cardNo} {p.name}</Link><div className="flex items-center gap-1 text-xs text-zinc-400">{p.phone}{waDues && <WhatsAppLink cardNo={p.cardNo} kind="dues" phone={p.phone} countryCode={settings.whatsappCountryCode} variant="action" label="Remind" />}</div></td>
                    <td data-label="Due" className={tdr}><MoneyCell value={p.balance} tone="due" /></td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card>
        )}
      </div>
    </>
  );
}
