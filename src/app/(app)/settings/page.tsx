import Link from "next/link";
import { Card, ExportLink, PageHeader, btn } from "@/components/ui";
import { SettingsForm } from "@/components/settings-form";
import { can, requirePermission } from "@/lib/auth";
import { getSettings } from "@/server/settings";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const user = await requirePermission("settings:manage");
  const settings = await getSettings();
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <PageHeader title="Settings" />
      <Card title="Clinic & WhatsApp"><SettingsForm settings={settings} /></Card>
      <Card title="Account security">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-zinc-600">Update your password to keep your account secure.</p>
          <Link href="/account/password" className={btn("secondary")}>Change password</Link>
        </div>
      </Card>
      {(can(user, "backup:export") || can(user, "reports:export")) && (
        <Card title="Data export">
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            {can(user, "backup:export") && <ExportLink href="/api/export/backup">Full backup (JSON)</ExportLink>}
            {can(user, "reports:export") && <ExportLink href="/api/export/visits?from=2000-01-01">All sittings (CSV)</ExportLink>}
            {can(user, "reports:export") && <ExportLink href="/api/export/patients?status=all">All patients (CSV)</ExportLink>}
          </div>
          <p className="mt-3 text-xs text-zinc-500">Exports contain patient information. Store them securely – every download is recorded in the audit log.</p>
        </Card>
      )}
    </div>
  );
}
