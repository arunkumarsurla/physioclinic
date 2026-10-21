import Link from "next/link";
import { Badge, Card, PageHeader, Table, td, th, thead, tbody, btn, linkAction } from "@/components/ui";
import { can, requirePermission } from "@/lib/auth";
import { fmtDateTime } from "@/lib/dates";
import { listUsers } from "@/server/users";

export const metadata = { title: "Users" };

export default async function UsersPage() {
  const me = await requirePermission("users:view");
  const rows = await listUsers();
  const manage = can(me, "users:manage");
  return (
    <>
      <PageHeader title="Users" subtitle={`${rows.filter((r) => r.isActive).length} active of ${rows.length}`} actions={manage && <Link href="/users/new" className={btn("primary")}>+ Add user</Link>} />
      <Card flush>
        <Table>
          <thead className={thead}><tr><th className={th}>Name</th><th className={th}>Username</th><th className={th}>Role</th><th className={th}>Status</th><th className={th}>Last sign-in</th><th className={th}></th></tr></thead>
          <tbody className={tbody}>
            {rows.map((u) => (
              <tr key={u.id} className={u.isActive ? undefined : "opacity-60"}>
                <td data-label="Name" data-primary className={td}><span className="font-medium">{u.name}</span>{u.id === me.id && <span className="ml-1 text-xs text-zinc-400">(you)</span>}<div className="text-xs text-zinc-400">{u.email}</div></td>
                <td data-label="Username" className={`${td} font-mono text-xs`}>{u.username}</td>
                <td data-label="Role" className={td}><Badge tone={u.roleKey === "admin" ? "blue" : "gray"}>{u.roleName}</Badge></td>
                <td data-label="Status" className={td}>{u.isActive ? <Badge tone="green">Active</Badge> : <Badge tone="red">Deactivated</Badge>}</td>
                <td data-label="Last sign-in" className={`${td} whitespace-nowrap`}>{fmtDateTime(u.lastLoginAt)}</td>
                <td className={td}>{manage && <Link href={`/users/${u.id}`} className={linkAction}>Manage</Link>}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </>
  );
}
