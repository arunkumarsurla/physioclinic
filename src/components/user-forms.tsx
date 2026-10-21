"use client";

import { createUserAction, resetPasswordAction, updateUserAction } from "@/actions/users";
import { ActionForm, Field, SelectField, ToggleField } from "@/components/forms";

type RoleOpt = { id: string; name: string };

export function UserForm({ mode, roles, defaults }: {
  mode: "create" | "edit"; roles: RoleOpt[];
  defaults?: { id: string; username: string; name: string; email: string | null; phone: string | null; roleId: string; isActive: boolean };
}) {
  const d = defaults;
  return (
    <ActionForm action={mode === "create" ? createUserAction : updateUserAction} submitLabel={mode === "create" ? "Create user" : "Save changes"} cancelHref="/users" resetOnSuccess={mode === "create"}>
      {d && <input type="hidden" name="id" value={d.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name" name="name" defaultValue={d?.name} required maxLength={120} />
        {mode === "create" ? <Field label="Username" name="username" required autoComplete="off" hint="Lowercase letters, numbers, . - _" /> : <Field label="Username" name="username_ro" defaultValue={d?.username} disabled />}
        <Field label="Email" name="email" type="email" defaultValue={d?.email ?? ""} />
        <Field label="Phone" name="phone" defaultValue={d?.phone ?? ""} />
      </div>
      <SelectField label="Role" name="roleId" defaultValue={d?.roleId ?? roles.find((r) => r.name === "Receptionist")?.id ?? ""} options={roles.map((r) => ({ value: r.id, label: r.name }))} required />
      {mode === "create" ? (
        <>
          <Field label="Password" name="password" type="password" autoComplete="new-password" hint="Leave blank to generate a secure temporary password" />
          <div className="rounded-xl border border-zinc-200"><ToggleField label="Require a password change at first sign-in" name="mustChangePassword" defaultChecked /></div>
        </>
      ) : (
        <div className="rounded-xl border border-zinc-200"><ToggleField label="Account is active" name="isActive" defaultChecked={d?.isActive} hint="Deactivated users are signed out immediately and cannot sign in." /></div>
      )}
    </ActionForm>
  );
}

export function ResetPasswordForm({ id }: { id: string }) {
  return (
    <ActionForm action={resetPasswordAction} submitLabel="Reset password" resetOnSuccess>
      <input type="hidden" name="id" value={id} />
      <Field label="New temporary password" name="password" type="password" autoComplete="new-password" hint="Leave blank to generate one. The user must change it at next sign-in and is signed out everywhere." />
    </ActionForm>
  );
}
