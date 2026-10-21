import { notFound } from "next/navigation";
import { z } from "zod";
import { Card, PageHeader } from "@/components/ui";
import { RoleForm } from "@/components/role-form";
import { requirePermission } from "@/lib/auth";
import { getRole } from "@/server/roles";

export const metadata = { title: "Edit role" };

export default async function EditRole({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("roles:manage");
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const role = await getRole(id);
  if (!role) notFound();
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title={role.name} back={{ href: "/roles", label: "Roles" }} />
      <Card><RoleForm mode="edit" locked={role.key === "admin"} defaults={role} /></Card>
    </div>
  );
}
