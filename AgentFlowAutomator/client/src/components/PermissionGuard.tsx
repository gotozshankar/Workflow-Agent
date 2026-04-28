// src/components/PermissionGuard.tsx
// Component to show/hide content based on permissions

import { ReactNode } from "react";
import { useAuth } from "@/context/AuthContext";
import { Permission } from "@/hooks/lib/permissions";

interface PermissionGuardProps {
  children: ReactNode;
  permission: Permission;
  fallback?: ReactNode;
}

/**
 * Conditionally render content based on user permissions
 * Example: <PermissionGuard permission="workflows:delete"><Button>Delete</Button></PermissionGuard>
 */
export function PermissionGuard({
  children,
  permission,
  fallback = null,
}: PermissionGuardProps) {
  const { hasPermission } = useAuth();

  if (!hasPermission(permission)) {
    return fallback;
  }

  return <>{children}</>;
}

interface LockedFeatureProps {
  permission: Permission;
  children: ReactNode;
}

/**
 * Show a locked indicator for features the user doesn't have access to
 */
export function LockedFeature({ permission, children }: LockedFeatureProps) {
  const { hasPermission } = useAuth();

  if (hasPermission(permission)) {
    return <>{children}</>;
  }

  return (
    <div
      className="relative opacity-50 cursor-not-allowed pointer-events-none"
      title="You don't have permission to access this feature"
    >
      {children}
      <div className="absolute inset-0 flex items-center justify-center bg-black/10 rounded">
        <span className="text-xs font-medium text-white bg-black/50 px-2 py-1 rounded">
          Admin Only
        </span>
      </div>
    </div>
  );
}
