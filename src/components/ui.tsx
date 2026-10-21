import Link from "next/link";
import type { ReactNode } from "react";
import { cn, qs } from "@/lib/utils";

/* ---------- buttons (server-safe; forms.tsx re-exports btn) ---------- */
export function btn(variant: "primary" | "secondary" | "ghost" | "danger" | "whatsapp" = "secondary", size: "md" | "sm" = "md") {
  return cn(
    "inline-flex select-none items-center justify-center gap-1.5 outline-none whitespace-nowrap rounded-control font-medium transition-[background-color,border-color,color,box-shadow] duration-150 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white motion-reduce:active:scale-100",
    size === "md" ? "min-h-10 px-4 text-sm" : "min-h-8 px-2.5 text-xs max-md:min-h-9",
    variant === "primary" && "bg-brand-700 text-white shadow-sm hover:bg-brand-800",
    variant === "secondary" && "border border-zinc-300 bg-white text-zinc-800 shadow-sm hover:bg-zinc-50",
    variant === "ghost" && "text-zinc-600 hover:bg-zinc-100",
    variant === "danger" && "border border-red-200 bg-white text-red-700 hover:bg-red-50",
    variant === "whatsapp" && "border border-emerald-300 bg-white text-emerald-800 shadow-sm hover:bg-emerald-50",
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className={cn("h-4 w-4 animate-spin motion-reduce:animate-none", className)}
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" opacity="0.25" />
      <path d="M21 12a9 9 0 0 1-9 9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function PageLoading({ className }: { className?: string }) {
  return (
    <div role="status" aria-busy="true" aria-label="Loading page" className={cn("flex min-h-[60vh] items-center justify-center", className)}>
      <span className="sr-only">Loading…</span>
      <span aria-hidden="true" className="inline-flex items-center gap-3 text-sm font-medium text-brand-700">
        <Spinner className="h-6 w-6" />
        Loading...
      </span>
    </div>
  );
}

/** Small inline row action (Edit / Manage / View) */
export const linkAction = "inline-flex min-h-8 items-center rounded-md px-2.5 text-xs font-medium text-brand-700 hover:bg-brand-50 focus-visible:ring-2 focus-visible:ring-brand-500 max-md:min-h-9";

/* ---------- page chrome ---------- */
export function PageHeader({ title, subtitle, actions, back }: { title: string; subtitle?: ReactNode; actions?: ReactNode; back?: { href: string; label: string } }) {
  return (
    <div className="mb-5 md:mb-6">
      {back && (
        <Link href={back.href} className="no-print mb-2 inline-flex min-h-8 items-center gap-1 rounded-md pr-2 text-xs font-medium text-zinc-500 hover:text-zinc-900">
          <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="m12 5-5 5 5 5" /></svg>
          {back.label}
        </Link>
      )}
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between md:gap-6">
        <div className="min-w-0">
          <h1 className="text-balance text-2xl font-semibold leading-tight text-zinc-900 md:text-[1.65rem]">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-zinc-500">{subtitle}</p>}
        </div>
        {actions && <div className="no-print flex w-full flex-wrap items-center gap-2 max-md:[&>*]:flex-1 md:w-auto md:justify-end">{actions}</div>}
      </div>
    </div>
  );
}

export function Card({ children, className, title, actions, flush }: { children: ReactNode; className?: string; title?: string; actions?: ReactNode; flush?: boolean }) {
  return (
    <section className={cn("print-card rounded-xl border border-zinc-200/80 bg-white shadow-card", className)}>
      {(title || actions) && (
        <header className="flex min-h-12 items-center justify-between gap-3 border-b border-zinc-100 px-4 py-2.5 md:px-5">
          {title && <h2 className="text-sm font-semibold text-zinc-800">{title}</h2>}
          {actions}
        </header>
      )}
      <div className={flush ? "" : "p-4 md:p-5"}>{children}</div>
    </section>
  );
}

/** One bordered panel holding several figures, divided by hairlines. */
export function StatGroup({ children, cols = 4, className }: { children: ReactNode; cols?: 2 | 3 | 4; className?: string }) {
  const grid = cols === 2 ? "grid-cols-2" : cols === 3 ? "grid-cols-1 sm:grid-cols-3" : "grid-cols-2 md:grid-cols-4";
  return (
    <div className={cn("print-card overflow-hidden rounded-xl border border-zinc-200/80 bg-white shadow-card", className)}>
      <div className={cn("-ml-px -mt-px grid", grid)}>{children}</div>
    </div>
  );
}

export function Stat({ label, value, sub, tone }: { label: string; value: ReactNode; sub?: ReactNode; tone?: "good" | "warn" | "bad" }) {
  return (
    <div className="min-w-0 border-l border-t border-zinc-200/80 p-4 md:p-5">
      <div className="text-xs font-medium text-zinc-500">{label}</div>
      <div className={cn("mt-1 truncate text-xl font-semibold tabular-nums sm:text-2xl", tone === "warn" && "text-amber-700", tone === "bad" && "text-red-700", tone === "good" && "text-brand-700")}>{value}</div>
      {sub && <div className="mt-0.5 text-xs text-zinc-500">{sub}</div>}
    </div>
  );
}

export function Badge({ children, tone = "gray" }: { children: ReactNode; tone?: "gray" | "green" | "amber" | "red" | "blue" }) {
  const t = {
    gray: "bg-zinc-100 text-zinc-700 ring-zinc-200",
    green: "bg-brand-50 text-brand-800 ring-brand-200",
    amber: "bg-amber-50 text-amber-800 ring-amber-200",
    red: "bg-red-50 text-red-700 ring-red-200",
    blue: "bg-sky-50 text-sky-800 ring-sky-200",
  }[tone];
  return <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset", t)}>{children}</span>;
}

/* ---------- tables ---------- */
export const th = "px-4 py-2.5 text-left text-xs font-medium text-zinc-500 whitespace-nowrap";
export const thr = cn(th, "text-right");
export const td = "px-4 py-3 align-top";
export const tdr = cn(td, "text-right tabular-nums whitespace-nowrap");

/** Wide table on tablets/laptops (scrolls if needed); stacked cards on phones. */
export function Table({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("scroll-thin overflow-x-auto", className)}>
      <table className="rt w-full text-sm md:min-w-max">{children}</table>
    </div>
  );
}
export const thead = "border-b border-zinc-200 bg-zinc-50/80";
export const tbody = "divide-y divide-zinc-100";

export function Empty({ children }: { children: ReactNode }) {
  return <div className="px-4 py-12 text-center text-sm text-zinc-400">{children}</div>;
}

export function Pagination({
  page, pageSize, total, path, params,
}: {
  page: number; pageSize: number; total: number; path: string; params: Record<string, string | number | undefined>;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return <div className="border-t border-zinc-100 px-4 py-3 text-xs text-zinc-400">{total.toLocaleString("en-IN")} total</div>;
  const link = (p: number) => `${path}${qs({ ...params, page: p === 1 ? undefined : p })}`;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  const on = "min-h-9 min-w-20 justify-center " + btn("secondary", "sm");
  const off = "inline-flex min-h-9 min-w-20 items-center justify-center rounded-control border border-zinc-100 px-2.5 text-xs text-zinc-300";
  return (
    <div className="no-print flex flex-col gap-2 border-t border-zinc-100 px-4 py-3 text-xs text-zinc-500 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-center sm:text-left">
        {from.toLocaleString("en-IN")}–{to.toLocaleString("en-IN")} of {total.toLocaleString("en-IN")}
      </span>
      <span className="flex items-center justify-between gap-2 sm:justify-end">
        {page > 1 ? <Link href={link(page - 1)} className={on}>Previous</Link> : <span className={off}>Previous</span>}
        <span className="px-2 tabular-nums">Page {page} / {pages}</span>
        {page < pages ? <Link href={link(page + 1)} className={on}>Next</Link> : <span className={off}>Next</span>}
      </span>
    </div>
  );
}

/** Plain GET filter bar – no JS needed. Stacks on phones, wraps in a row on laptops. */
export function FilterBar({ children, action }: { children: ReactNode; action: string }) {
  return (
    <form method="get" action={action} className="no-print mb-4 grid grid-cols-1 gap-3 rounded-xl border border-zinc-200/80 bg-white p-3 shadow-card sm:grid-cols-2 md:p-4 lg:flex lg:flex-wrap lg:items-end">
      {children}
      <button type="submit" className={cn(btn("primary"), "sm:col-span-2 lg:col-span-1")}>Apply</button>
    </form>
  );
}

const filterInput = "block h-10 w-full rounded-control border border-zinc-300 bg-white px-3 text-base text-zinc-900 placeholder:text-zinc-400 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20 sm:text-sm";
export function FilterField({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <label className={cn("block min-w-0", className)}>
      <span className="mb-1 block text-xs font-medium text-zinc-600">{label}</span>
      {children}
    </label>
  );
}
export const FInput = (p: React.InputHTMLAttributes<HTMLInputElement>) => <input {...p} className={cn(filterInput, p.className)} />;
export const FSelect = (p: React.SelectHTMLAttributes<HTMLSelectElement>) => <select {...p} className={cn(filterInput, p.className)} />;

export function MoneyCell({ value, tone }: { value: number; tone?: "due" | "adv" | "auto" }) {
  const t = tone === "auto" ? (value > 0 ? "due" : value < 0 ? "adv" : undefined) : tone;
  return <span className={cn("tabular-nums", t === "due" && "font-medium text-amber-700", t === "adv" && "font-medium text-sky-700")}>{fmt(value)}</span>;
}
const fmtr = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 });
const fmt = (n: number) => (n === 0 ? "0" : fmtr.format(n));

export function Dl({ items }: { items: [string, ReactNode][] }) {
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-4 xs:grid-cols-2 xl:grid-cols-3">
      {items.map(([k, v]) => (
        <div key={k} className="min-w-0">
          <dt className="text-xs font-medium text-zinc-400">{k}</dt>
          <dd className="mt-0.5 whitespace-pre-line break-words text-zinc-900">{v || <span className="text-zinc-300">—</span>}</dd>
        </div>
      ))}
    </dl>
  );
}

export function ExportLink({ href, children = "Export CSV" }: { href: string; children?: ReactNode }) {
  return (
    <a href={href} className={btn("secondary")}>
      {children}
    </a>
  );
}
