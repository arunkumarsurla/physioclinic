import { Card, PageHeader } from "@/components/ui";
import { UserForm } from "@/components/user-forms";
import { requirePermission } from "@/lib/auth";
import { roleOptions } from "@/server/roles";

export const metadata = { title: "Add user" };

export default async function NewUser() {
  await requirePermission("users:manage");
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Add user" back={{ href: "/users", label: "Users" }} />
      <Card><UserForm mode="create" roles={await roleOptions()} /></Card>
    </div>
  );
}
