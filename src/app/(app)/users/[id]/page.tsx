import { notFound } from "next/navigation";
import { z } from "zod";
import { revokeSessionsAction } from "@/actions/users";
import { ConfirmAction } from "@/components/forms";
import { Card, PageHeader } from "@/components/ui";
import { ResetPasswordForm, UserForm } from "@/components/user-forms";
import { requirePermission } from "@/lib/auth";
import { fmtDateTime } from "@/lib/dates";
import { roleOptions } from "@/server/roles";
import { activeSessionCount, getUser } from "@/server/users";

export const metadata = { title: "Manage user" };

export default async function ManageUser({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("users:manage");
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const [u, roles, sessions] = await Promise.all([getUser(id), roleOptions(), activeSessionCount(id)]);
  if (!u) notFound();
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <PageHeader title={u.name} subtitle={`${u.username} · last sign-in ${fmtDateTime(u.lastLoginAt)}`} back={{ href: "/users", label: "Users" }} />
      <Card title="Profile & access"><UserForm mode="edit" roles={roles} defaults={u} /></Card>
      <Card title="Password">
        <ResetPasswordForm id={u.id} />
      </Card>
      <Card title="Sessions">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-zinc-600">{sessions} active session{sessions === 1 ? "" : "s"}.</p>
          <ConfirmAction action={revokeSessionsAction} fields={{ id: u.id }} confirm={`Sign ${u.name} out of all devices?`} label="Sign out everywhere" variant="secondary" size="md" />
        </div>
      </Card>
    </div>
  );
}
