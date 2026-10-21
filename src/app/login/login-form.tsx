"use client";

import { loginAction } from "@/actions/auth";
import { ActionForm, Field } from "@/components/forms";

export function LoginForm({ next }: { next: string }) {
  return (
    <ActionForm action={loginAction} submitLabel="Sign in" submitClassName="w-full">
      <input type="hidden" name="next" value={next} />
      <Field label="Username" name="username" autoComplete="username" autoFocus required />
      <Field label="Password" name="password" type="password" autoComplete="current-password" required />
    </ActionForm>
  );
}
