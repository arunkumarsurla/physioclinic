import { Card, PageHeader } from "@/components/ui";
import { RoleForm } from "@/components/role-form";
import { requirePermission } from "@/lib/auth";

export const metadata = { title: "New role" };

export default async function NewRole() {
  await requirePermission("roles:manage");
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="New role" back={{ href: "/roles", label: "Roles" }} />
      <Card><RoleForm mode="create" /></Card>
    </div>
  );
}
