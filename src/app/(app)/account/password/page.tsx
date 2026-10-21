import { Card, PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { PasswordForm } from "./password-form";

export const metadata = { title: "Change password" };

export default async function PasswordPage() {
  const user = await requireUser({ allowPasswordChange: true });
  return (
    <div className="mx-auto max-w-md">
      <PageHeader title="Change password" subtitle={user.mustChangePassword ? "For security you must choose a new password before continuing." : `Signed in as ${user.username}`} />
      <Card>
        <PasswordForm />
      </Card>
      <p className="mt-3 text-xs text-zinc-400">At least 8 characters, with a letter and a number. Changing it signs you out on other devices.</p>
    </div>
  );
}
