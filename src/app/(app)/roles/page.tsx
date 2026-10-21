import Link from "next/link";
import { deleteRoleAction } from "@/actions/roles";
import { ConfirmAction } from "@/components/forms";
import { Badge, Card, PageHeader, Table, td, tdr, th, thr, thead, tbody, btn, linkAction } from "@/components/ui";
import { requirePermission } from "@/lib/auth";
import { ALL_PERMISSIONS } from "@/lib/permissions";
import { listRoles } from "@/server/roles";

export const metadata = { title: "Roles & permissions" };

export default async function RolesPage() {
  await requirePermission("roles:manage");
  const rows = await listRoles();
  return (
    <>
      <PageHeader title="Roles & permissions" subtitle="Each user has one role. A role is a set of permissions." actions={<Link href="/roles/new" className={btn("primary")}>+ New role</Link>} />
      <Card flush>
        <Table>
          <thead className={thead}><tr><th className={th}>Role</th><th className={th}>Description</th><th className={thr}>Permissions</th><th className={thr}>Users</th><th className={th}></th></tr></thead>
          <tbody className={tbody}>
            {rows.map((r) => (
              <tr key={r.id}>
                <td data-label="Role" data-primary className={td}><span className="font-medium">{r.name}</span> {r.isSystem && <Badge tone="blue">built-in</Badge>}</td>
                <td data-label="Description" className={`${td} max-w-sm text-zinc-500`}>{r.description}</td>
                <td data-label="Permissions" className={tdr}>{r.key === "admin" ? ALL_PERMISSIONS.length : r.permissions.length} / {ALL_PERMISSIONS.length}</td>
                <td data-label="Users" className={tdr}>{r.userCount}</td>
                <td className={td}><span className="flex items-center justify-end gap-2">
                  <Link href={`/roles/${r.id}`} className={linkAction}>{r.key === "admin" ? "View" : "Edit"}</Link>
                  {!r.isSystem && r.userCount === 0 && <ConfirmAction action={deleteRoleAction} fields={{ id: r.id }} confirm={`Delete role ${r.name}?`} label="Delete" />}
                </span></td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </>
  );
}
