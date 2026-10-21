"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  CalendarCheck,
  Ellipsis,
  LayoutDashboard,
  LogOut,
  ScrollText,
  Settings,
  ShieldCheck,
  UserCog,
  Users,
  Wallet,
  X,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
} from "lucide-react";
import { logoutAction } from "@/actions/auth";
import { cn, initials } from "@/lib/utils";

const ICONS = {
  dashboard: LayoutDashboard,
  patients: Users,
  register: CalendarCheck,
  expenses: Wallet,
  reports: BarChart3,
  users: UserCog,
  roles: ShieldCheck,
  settings: Settings,
  audit: ScrollText,
} as const;

export type NavItem = {
  href: string;
  label: string;
  icon: keyof typeof ICONS;
  section: "main" | "admin";
};

/** Short names for the phone tab bar */
const SHORT: Record<string, string> = {
  "/sittings": "Register",
  "/patients": "Patients",
  "/expenses": "Expenses",
  "/reports": "Reports",
  "/": "Home",
};

function LogoutButton({ collapsed = false }: { collapsed?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      title={pending ? "Signing out…" : "Sign out"}
      aria-busy={pending}
      disabled={pending}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-xs text-brand-100/70 outline-none transition-colors hover:bg-white/5 hover:text-white focus-visible:ring-2 focus-visible:ring-brand-300 disabled:cursor-wait",
        collapsed ? "justify-center" : "",
      )}
    >
      {pending ? <LoaderCircle className="h-4 w-4 shrink-0 animate-spin motion-reduce:animate-none" /> : <LogOut className="h-4 w-4 shrink-0" />}
      <span className={cn("transition-all duration-200", collapsed ? "w-0 overflow-hidden opacity-0" : "w-auto opacity-100")}>
        {pending ? "Signing out…" : "Sign out"}
      </span>
      {collapsed && <span className="sr-only">{pending ? "Signing out…" : "Sign out"}</span>}
    </button>
  );
}

export function AppNav({
  items,
  clinicName,
  user,
}: {
  items: NavItem[];
  clinicName: string;
  user: { name: string; roleName: string };
}) {
  const pathname = usePathname();
  const [sheet, setSheet] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const active = (href: string) =>
    href === "/"
      ? pathname === "/"
      : pathname === href || pathname.startsWith(href + "/");

  // close the sheet on navigation / Escape, and lock page scroll while it is open
  useEffect(() => setSheet(false), [pathname]);
  useEffect(() => {
    if (!sheet) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setSheet(false);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [sheet]);

  // persist collapsed state
  useEffect(() => {
    const stored = localStorage.getItem("nav-collapsed");
    if (stored === "true") setCollapsed(true);
  }, []);
  useEffect(() => {
    localStorage.setItem("nav-collapsed", String(collapsed));
  }, [collapsed]);

  const main = items.filter((i) => i.section === "main");
  const admin = items.filter((i) => i.section === "admin");
  // phone tab bar: up to 4 destinations + "More"
  const tabs = items.length <= 5 ? items : main.slice(0, 4);
  const overflow =
    items.length <= 5 ? [] : items.filter((i) => !tabs.includes(i));

  /* ---------------- sidebar link ---------------- */
  const link = (i: NavItem) => {
    const Icon = ICONS[i.icon];
    const on = active(i.href);
    return (
      <li key={i.href}>
        <Link
          href={i.href}
          title={collapsed ? i.label : undefined}
          aria-current={on ? "page" : undefined}
          className={cn(
            "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium outline-none transition-all duration-200 focus-visible:ring-2 focus-visible:ring-brand-300",
            collapsed ? "justify-center px-0" : "",
            on
              ? "bg-white/10 text-white"
              : "text-brand-100/70 hover:bg-white/5 hover:text-white",
          )}
        >
          {/* active indicator */}
          <span
            aria-hidden
            className={cn(
              "absolute top-2 bottom-2 w-1 rounded-r-full bg-brand-300 transition-all duration-300",
              collapsed ? "-left-2.5" : "-left-3",
              on ? "opacity-100 scale-y-100" : "opacity-0 scale-y-0",
            )}
          />
          <Icon
            className="h-[18px] w-[18px] shrink-0 transition-transform duration-200 group-hover:scale-110"
            strokeWidth={on ? 2.2 : 1.8}
          />
          <span
            className={cn(
              "truncate transition-all duration-200",
              collapsed
                ? "w-0 overflow-hidden opacity-0"
                : "w-auto opacity-100",
            )}
          >
            {i.label}
          </span>
        </Link>
      </li>
    );
  };

  const sidebar = (
    <aside
      className={cn(
        "no-print sticky top-0 hidden h-dvh shrink-0 flex-col bg-brand-950 text-white transition-[width] duration-300 ease-in-out md:flex",
        collapsed ? "w-[4.5rem]" : "w-64",
      )}
    >
      {/* header / logo */}
      <div
        className={cn(
          "flex items-center gap-3 px-3 py-5 transition-all duration-300",
          collapsed ? "justify-center lg:px-3" : "lg:px-5",
        )}
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-400/20 text-lg font-semibold text-brand-200 ring-1 ring-inset ring-white/10">
          +
        </div>
        <div
          className={cn(
            "min-w-0 text-sm font-semibold leading-tight transition-all duration-200",
            collapsed
              ? "w-0 overflow-hidden opacity-0"
              : "w-auto opacity-100",
          )}
        >
          {clinicName}
        </div>
      </div>

      {/* nav */}
      <nav
        className="scroll-thin flex-1 overflow-y-auto overflow-x-hidden px-3 pb-4"
        aria-label="Main"
      >
        {main.length > 0 && <ul className="space-y-1">{main.map(link)}</ul>}
        <div className="mt-6">
          <div
            className={cn(
              "mb-2 px-3 text-xs font-medium text-brand-200/50 transition-all duration-200",
              collapsed
                ? "h-0 overflow-hidden opacity-0"
                : "h-auto opacity-100",
            )}
          >
            {admin.length > 0 ? "Administration" : "Settings"}
          </div>
          <div
            className={cn(
              "mx-3 mb-3 border-t border-white/10 transition-all duration-200",
              collapsed ? "opacity-100" : "opacity-0",
            )}
          />
          <ul className="space-y-1">{admin.map(link)}</ul>
        </div>
      </nav>

      {/* footer / user */}
      <div className="border-t border-white/10 p-3">
        <div
          className={cn(
            "flex items-center gap-3 px-1 pb-2 transition-all duration-200",
            collapsed ? "justify-center" : "",
          )}
        >
          <div
            title={`${user.name} · ${user.roleName}`}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-200 text-xs font-semibold text-brand-900"
          >
            {initials(user.name)}
          </div>
          <div
            className={cn(
              "min-w-0 leading-tight transition-all duration-200",
              collapsed
                ? "w-0 overflow-hidden opacity-0"
                : "w-auto opacity-100",
            )}
          >
            <div className="truncate text-sm font-medium">{user.name}</div>
            <div className="truncate text-xs text-brand-200/60">
              {user.roleName}
            </div>
          </div>
        </div>

        <form action={logoutAction}>
          <LogoutButton collapsed={collapsed} />
        </form>
      </div>

      {/* collapse toggle — desktop only, sits on the right edge */}
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        className="absolute -right-3 top-20 z-10 hidden h-6 w-6 items-center justify-center rounded-full border border-white/10 bg-brand-900 text-brand-100 shadow-md transition-all duration-200 hover:scale-110 hover:bg-brand-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 md:flex"
      >
        {collapsed ? (
          <ChevronRight className="h-3.5 w-3.5" />
        ) : (
          <ChevronLeft className="h-3.5 w-3.5" />
        )}
      </button>
    </aside>
  );

  /* ---------------- phone: top bar + bottom tab bar + sheet ---------------- */
  const topbar = (
    <header className="no-print safe-t sticky top-0 z-30 border-b border-zinc-200/80 bg-white/85 backdrop-blur md:hidden">
      <div className="flex h-14 items-center justify-between gap-3 px-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-800 text-base font-semibold text-brand-100">
            +
          </div>
          <span className="truncate text-[15px] font-semibold">
            {clinicName}
          </span>
        </div>
        <button
          type="button"
          aria-label="Account and menu"
          onClick={() => setSheet(true)}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-800 outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
        >
          {initials(user.name)}
        </button>
      </div>
    </header>
  );

  const tabBar = tabs.length > 0 && (
    <nav
      aria-label="Main"
      className="no-print safe-b fixed inset-x-0 bottom-0 z-30 border-t border-zinc-200 bg-white/95 backdrop-blur md:hidden"
    >
      <ul className="mx-auto flex h-16 max-w-lg items-stretch justify-around px-1">
        {tabs.map((i) => {
          const Icon = ICONS[i.icon];
          const on = active(i.href);
          return (
            <li key={i.href} className="min-w-0 flex-1">
              <Link
                href={i.href}
                aria-current={on ? "page" : undefined}
                className={cn(
                  "relative flex h-full flex-col items-center justify-center gap-0.5 text-[11px] font-medium outline-none transition-colors focus-visible:bg-brand-50",
                  on
                    ? "text-brand-700"
                    : "text-zinc-500 active:text-zinc-900",
                )}
              >
                <span
                  className={cn(
                    "flex h-7 w-12 items-center justify-center rounded-full transition-colors",
                    on && "bg-brand-100",
                  )}
                >
                  <Icon className="h-5 w-5" strokeWidth={on ? 2.2 : 1.8} />
                </span>
                <span className="max-w-full truncate px-1">
                  {SHORT[i.href] ?? i.label}
                </span>
              </Link>
            </li>
          );
        })}
        {overflow.length > 0 && (
          <li className="min-w-0 flex-1">
            <button
              type="button"
              onClick={() => setSheet(true)}
              aria-haspopup="dialog"
              className={cn(
                "flex h-full w-full flex-col items-center justify-center gap-0.5 text-[11px] font-medium outline-none focus-visible:bg-brand-50",
                overflow.some((i) => active(i.href))
                  ? "text-brand-700"
                  : "text-zinc-500",
              )}
            >
              <span
                className={cn(
                  "flex h-7 w-12 items-center justify-center rounded-full",
                  overflow.some((i) => active(i.href)) && "bg-brand-100",
                )}
              >
                <Ellipsis className="h-5 w-5" />
              </span>
              More
            </button>
          </li>
        )}
      </ul>
    </nav>
  );

  const sheetLink = (i: NavItem) => {
    const Icon = ICONS[i.icon];
    const on = active(i.href);
    return (
      <li key={i.href}>
        <Link
          href={i.href}
          onClick={() => setSheet(false)}
          aria-current={on ? "page" : undefined}
          className={cn(
            "flex min-h-12 items-center gap-3 rounded-xl px-3 text-[15px] font-medium",
            on
              ? "bg-brand-50 text-brand-800"
              : "text-zinc-700 active:bg-zinc-100",
          )}
        >
          <Icon className="h-5 w-5 shrink-0" strokeWidth={on ? 2.2 : 1.8} />
          {i.label}
        </Link>
      </li>
    );
  };

  const sheetUi = sheet && (
    <div
      className="no-print fixed inset-0 z-50 md:hidden"
      role="dialog"
      aria-modal="true"
      aria-label="Menu"
    >
      <div
        className="anim-fade absolute inset-0 bg-brand-950/50"
        onClick={() => setSheet(false)}
      />
      <div className="anim-sheet safe-b absolute inset-x-0 bottom-0 flex max-h-[88dvh] flex-col rounded-t-3xl bg-white shadow-lift">
        <div className="flex items-center justify-between px-5 pb-2 pt-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-800">
              {initials(user.name)}
            </div>
            <div className="min-w-0 leading-tight">
              <div className="truncate font-semibold">{user.name}</div>
              <div className="truncate text-xs text-zinc-500">
                {user.roleName}
              </div>
            </div>
          </div>
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setSheet(false)}
            className="flex h-10 w-10 items-center justify-center rounded-full text-zinc-500 hover:bg-zinc-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="scroll-thin flex-1 overflow-y-auto px-3 pb-3">
          {overflow.some((i) => i.section === "main") && (
            <ul className="mt-1 space-y-0.5">
              {overflow
                .filter((i) => i.section === "main")
                .map(sheetLink)}
            </ul>
          )}
          {overflow.some((i) => i.section === "admin") && (
            <>
              <div className="mb-1 mt-4 px-3 text-xs font-medium text-zinc-400">
                Administration
              </div>
              <ul className="space-y-0.5">
                {overflow
                  .filter((i) => i.section === "admin")
                  .map(sheetLink)}
              </ul>
            </>
          )}
          <div className="mt-4 space-y-0.5 border-t border-zinc-100 pt-3">
            <form action={logoutAction}>
              <LogoutButton />
            </form>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {sidebar}
      {topbar}
      {tabBar}
      {sheetUi}
    </>
  );
}