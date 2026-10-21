"use client";

import { changePasswordAction } from "@/actions/auth";
import { ActionForm, Field } from "@/components/forms";

export function PasswordForm() {
  return (
    <ActionForm action={changePasswordAction} submitLabel="Update password" resetOnSuccess>
      <Field label="Current password" name="current" type="password" autoComplete="current-password" required />
      <Field label="New password" name="next" type="password" autoComplete="new-password" required />
      <Field label="Confirm new password" name="confirm" type="password" autoComplete="new-password" required />
    </ActionForm>
  );
}
