export const ADMIN_ROLES = ["super_admin", "admin", "editor", "support"] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];

export const PERMISSIONS = [
  "dashboard.read",
  "content.read",
  "content.write",
  "methodology.publish",
  "users.invite",
  "leads.read",
  "orders.read",
  "orders.reprocess",
  "reports.read",
  "audit.read",
  "settings.write",
  "simulator.use",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const MATRIX: Record<AdminRole, readonly Permission[]> = {
  super_admin: PERMISSIONS,
  admin: [
    "dashboard.read",
    "content.read",
    "content.write",
    "methodology.publish",
    "users.invite",
    "leads.read",
    "orders.read",
    "orders.reprocess",
    "reports.read",
    "audit.read",
    "settings.write",
    "simulator.use",
  ],
  editor: ["content.read", "content.write", "simulator.use"],
  support: ["dashboard.read", "leads.read", "orders.read", "orders.reprocess", "reports.read"],
};

export function isAdminRole(value: string): value is AdminRole {
  return (ADMIN_ROLES as readonly string[]).includes(value);
}

export function roleHas(role: AdminRole, permission: Permission) {
  return MATRIX[role].includes(permission);
}

export function permissionsFor(role: AdminRole) {
  return MATRIX[role];
}
