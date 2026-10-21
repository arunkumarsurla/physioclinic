/**
 * Permission catalog. Roles store a list of these keys.
 * The built-in "Admin" role always has every permission (it can't be edited).
 */
export const PERMISSION_GROUPS = [
  {
    group: "Dashboard",
    items: [{ key: "dashboard:view", label: "View dashboard" }],
  },
  {
    group: "Patients",
    items: [
      { key: "patients:view", label: "View patients and OP cards" },
      { key: "patients:create", label: "Register new patients" },
      { key: "patients:edit", label: "Edit patient details and billing plan" },
      { key: "patients:delete", label: "Archive / restore patients" },
      { key: "clinical:view", label: "View clinical notes (complaints, diagnosis, advice…)" },
      { key: "clinical:edit", label: "Edit clinical notes" },
    ],
  },
  {
    group: "Sittings & payments",
    items: [
      { key: "sittings:view", label: "View sittings and patient payments" },
      { key: "sittings:record", label: "Record attendance and payments" },
      { key: "sittings:delete", label: "Delete sitting entries" },
    ],
  },
  {
    group: "Expenses",
    items: [
      { key: "expenses:view", label: "View expenses" },
      { key: "expenses:create", label: "Add expenses" },
      { key: "expenses:edit", label: "Edit expenses" },
      { key: "expenses:delete", label: "Delete expenses" },
    ],
  },
  {
    group: "Reports",
    items: [
      { key: "reports:view", label: "View reports" },
      { key: "reports:export", label: "Export reports to CSV" },
    ],
  },
  {
    group: "Administration",
    items: [
      { key: "users:view", label: "View users" },
      { key: "users:manage", label: "Add / edit / deactivate users, reset passwords" },
      { key: "roles:manage", label: "Create and edit roles & permissions" },
      { key: "settings:manage", label: "Change clinic settings" },
      { key: "audit:view", label: "View audit log" },
      { key: "backup:export", label: "Download full data backup" },
    ],
  },
] as const;

export type PermissionKey = (typeof PERMISSION_GROUPS)[number]["items"][number]["key"];

export const ALL_PERMISSIONS: PermissionKey[] = PERMISSION_GROUPS.flatMap((g) => g.items.map((i) => i.key));

export const PERMISSION_LABELS: Record<string, string> = Object.fromEntries(
  PERMISSION_GROUPS.flatMap((g) => g.items.map((i) => [i.key, i.label])),
);

export function isPermissionKey(k: string): k is PermissionKey {
  return (ALL_PERMISSIONS as string[]).includes(k);
}

/** Built-in roles. Only inserted once; afterwards admins can customise them freely (except Admin). */
export const DEFAULT_ROLES: {
  key: string;
  name: string;
  description: string;
  permissions: PermissionKey[];
}[] = [
  {
    key: "admin",
    name: "Admin",
    description: "Full access to everything, including users, roles and settings.",
    permissions: ALL_PERMISSIONS,
  },
  {
    key: "doctor",
    name: "Doctor",
    description: "Treats patients: full clinical access, records sittings, views reports.",
    permissions: [
      "dashboard:view",
      "patients:view",
      "patients:create",
      "patients:edit",
      "clinical:view",
      "clinical:edit",
      "sittings:view",
      "sittings:record",
      "reports:view",
    ],
  },
  {
    key: "receptionist",
    name: "Receptionist",
    description: "Registers patients and records attendance & payments. No clinical notes, no expenses.",
    permissions: [
      "dashboard:view",
      "patients:view",
      "patients:create",
      "patients:edit",
      "sittings:view",
      "sittings:record",
    ],
  },
  {
    key: "accountant",
    name: "Accountant",
    description: "Expenses and all reports (with export). Read-only on patients.",
    permissions: [
      "dashboard:view",
      "patients:view",
      "sittings:view",
      "expenses:view",
      "expenses:create",
      "expenses:edit",
      "expenses:delete",
      "reports:view",
      "reports:export",
    ],
  },
];

/** Some permissions are meaningless without another – add the prerequisites automatically. */
const REQUIRES: Record<string, PermissionKey[]> = {
  "patients:create": ["patients:view"],
  "patients:edit": ["patients:view"],
  "patients:delete": ["patients:view"],
  "clinical:view": ["patients:view"],
  "clinical:edit": ["clinical:view", "patients:view"],
  "sittings:view": ["patients:view"],
  "sittings:record": ["sittings:view", "patients:view"],
  "sittings:delete": ["sittings:view", "patients:view"],
  "expenses:create": ["expenses:view"],
  "expenses:edit": ["expenses:view"],
  "expenses:delete": ["expenses:view"],
  "reports:export": ["reports:view"],
  "users:manage": ["users:view"],
};

export function normalizePermissions(input: string[]): PermissionKey[] {
  const set = new Set<PermissionKey>(input.filter(isPermissionKey));
  let changed = true;
  while (changed) {
    changed = false;
    for (const p of [...set]) for (const r of REQUIRES[p] ?? []) if (!set.has(r)) (set.add(r), (changed = true));
  }
  return ALL_PERMISSIONS.filter((p) => set.has(p));
}
