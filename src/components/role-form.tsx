"use client";

import { createRoleAction, updateRoleAction } from "@/actions/roles";
import { ActionForm, Field, ToggleField } from "@/components/forms";
import { PERMISSION_GROUPS } from "@/lib/permissions";

export function RoleForm({ mode, defaults, locked }: {
  mode: "create" | "edit";
  defaults?: { id: string; name: string; description: string | null; permissions: string[] };
  locked?: boolean;
}) {
  const has = (k: string) => !!locked || !!defaults?.permissions.includes(k);
  return (
    <ActionForm action={mode === "create" ? createRoleAction : updateRoleAction} submitLabel={mode === "create" ? "Create role" : "Save role"} cancelHref="/roles" hideSubmit={locked} stickyActions={!locked}>
      {defaults && <input type="hidden" name="id" value={defaults.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Role name" name="name" defaultValue={defaults?.name} required maxLength={60} disabled={locked} />
        <Field label="Description" name="description" defaultValue={defaults?.description ?? ""} maxLength={200} disabled={locked} />
      </div>
      {locked && <p className="rounded-lg border border-sky-200 bg-sky-50 px-3.5 py-2.5 text-sm text-sky-800">The Admin role always has every permission and cannot be changed.</p>}
      <div className="grid items-start gap-4 md:grid-cols-2 2xl:grid-cols-3">
        {PERMISSION_GROUPS.map((g) => (
          <fieldset key={g.group} className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
            <legend className="sr-only">{g.group}</legend>
            <div aria-hidden className="border-b border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm font-semibold text-zinc-800">{g.group}</div>
            <div className="divide-y divide-zinc-100 p-1">
              {g.items.map((i) => <ToggleField key={i.key} name="permissions" value={i.key} label={i.label} defaultChecked={has(i.key)} disabled={locked} />)}
            </div>
          </fieldset>
        ))}
      </div>
      {!locked && <p className="text-xs text-zinc-500">Permissions that depend on others (e.g. editing needs viewing) are added automatically.</p>}
    </ActionForm>
  );
}
