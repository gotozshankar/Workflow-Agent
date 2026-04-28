// src/lib/permissions.ts
// Role-based permission mapping

export type Role = "super_admin" | "admin" | "user"
export type Permission = keyof typeof PERMISSIONS

export const PERMISSIONS = {
  // ────── Workflows ──────
  "workflows:view": ["super_admin", "admin", "user"] as Role[],
  "workflows:create": ["super_admin", "admin"] as Role[],
  "workflows:edit": ["super_admin", "admin"] as Role[],
  "workflows:delete": ["super_admin"] as Role[],
  "workflows:execute": ["super_admin", "admin"] as Role[],

  // ────── Agents ──────
  "agents:view": ["super_admin", "admin", "user"] as Role[],
  "agents:create": ["super_admin", "admin"] as Role[],
  "agents:edit": ["super_admin", "admin"] as Role[],
  "agents:delete": ["super_admin"] as Role[],

  // ────── Tools ──────
  "tools:view": ["super_admin", "admin", "user"] as Role[],
  "tools:create": ["super_admin", "admin"] as Role[],
  "tools:delete": ["super_admin"] as Role[],

  // ────── Knowledge Base ──────
  "knowledge:view": ["super_admin", "admin", "user"] as Role[],
  "knowledge:create": ["super_admin", "admin"] as Role[],
  "knowledge:edit": ["super_admin", "admin"] as Role[],
  "knowledge:delete": ["super_admin"] as Role[],

  // ────── Models ──────
  "models:view": ["super_admin", "admin", "user"] as Role[],
  "models:create": ["super_admin", "admin"] as Role[],
  "models:delete": ["super_admin"] as Role[],

  // ────── Users Management ──────
  "users:view": ["super_admin", "admin"] as Role[],
  "users:edit": ["super_admin"] as Role[],
  "users:changeRole": ["super_admin"] as Role[],
  "users:delete": ["super_admin"] as Role[],

  // ────── Security ──────
  "security:view": ["super_admin", "admin"] as Role[],
  "security:edit": ["super_admin"] as Role[],

  // ────── Audit Logs ──────
  "audit:view": ["super_admin", "admin"] as Role[],

  // ────── Settings ──────
  "settings:view": ["super_admin", "admin", "user"] as Role[],
  "settings:edit": ["super_admin"] as Role[],
} as const

/**
 * Get access percentage for each role
 */
export const ROLE_ACCESS_LEVEL = {
  super_admin: 100,  // Full access
  admin: 70,         // Limited access
  user: 20,          // Very limited access
} as const

/**
 * User-friendly role names
 */
export const ROLE_LABELS = {
  super_admin: "Super Admin",
  admin: "Admin",
  user: "User",
} as const
