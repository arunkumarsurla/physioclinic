import { AppNav, type NavItem } from "@/components/app-nav";
import { can, requireUser } from "@/lib/auth";
import { getSettings } from "@/server/settings";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // pages enforce permissions themselves; the layout only needs a valid session
  const user = await requireUser({ allowPasswordChange: true });
  const settings = await getSettings();

  const all: (NavItem & { perm: Parameters<typeof can>[1] })[] = [
    { href: "/", label: "Dashboard", icon: "dashboard", section: "main", perm: "dashboard:view" },
    { href: "/patients", label: "Patients", icon: "patients", section: "main", perm: "patients:view" },
    { href: "/sittings", label: "Daily register", icon: "register", section: "main", perm: "sittings:view" },
    { href: "/expenses", label: "Expenses", icon: "expenses", section: "main", perm: "expenses:view" },
    { href: "/reports", label: "Reports", icon: "reports", section: "main", perm: "reports:view" },
    { href: "/users", label: "Users", icon: "users", section: "admin", perm: "users:view" },
    { href: "/roles", label: "Roles & permissions", icon: "roles", section: "admin", perm: "roles:manage" },
    { href: "/settings", label: "Settings", icon: "settings", section: "admin", perm: "settings:manage" },
    { href: "/audit", label: "Audit log", icon: "audit", section: "admin", perm: "audit:view" },
  ];
  const items: NavItem[] = user.mustChangePassword ? [] : all.filter((i) => can(user, i.perm)).map(({ perm: _p, ...i }) => i);

  return (
    <div className="min-h-dvh md:flex">
      <AppNav items={items} clinicName={settings.clinicName} user={{ name: user.name, roleName: user.roleName }} />
      <main className="min-w-0 flex-1 px-4 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-4 sm:px-6 md:pb-10 md:pt-7 lg:px-8 xl:px-10">
        <div className="mx-auto w-full max-w-7xl">{children}</div>
      </main>
    </div>
  );
}
