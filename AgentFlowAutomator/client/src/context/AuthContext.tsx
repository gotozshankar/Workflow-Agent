// context/AuthContext.tsx
import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { PERMISSIONS, Permission, Role } from "@/hooks/lib/permissions";
import { useLocation } from "wouter";
import { Redirect } from "wouter";
import API_URL from "../config";

const API_BASE_URL = API_URL;

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: Role;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  impersonating: boolean;
  originalAdmin: AuthUser | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  impersonateUser: (userId: number) => Promise<void>;
  stopImpersonating: () => void;
  updateUser: (
    userId: number,
    data: Partial<AuthUser & { password?: string }>,
  ) => Promise<void>;
  isRole: (...roles: Role[]) => boolean;
  hasPermission: (permission: Permission) => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setLoading] = useState(true);
  const [impersonating, setImpersonating] = useState(false);
  const [savedAdmin, setSavedAdmin] = useState<{
    user: AuthUser;
    token: string;
  } | null>(null);

  // ── Restore session on mount ─────────────────────────────────────────
  useEffect(() => {
    const saved = localStorage.getItem("agentflow_token");
    const adminBackup = localStorage.getItem("agentflow_admin_backup");

    if (adminBackup) {
      // Was impersonating – restore backup
      const parsed = JSON.parse(adminBackup);
      setSavedAdmin(parsed);
      setImpersonating(true);
    }

    if (saved) {
      setToken(saved);
      validateToken(saved);
    } else {
      setLoading(false); // No token → not loading anymore
    }
  }, []);

  async function validateToken(t: string) {
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${t}` },
      });
      if (res.ok) {
        setUser(await res.json());
      } else {
        // Token invalid – clean up
        localStorage.removeItem("agentflow_token");
        localStorage.removeItem("agentflow_admin_backup");
        setToken(null);
      }
    } catch (error) {
      // Network error – keep token but clear user? Decide your fallback
      console.error("Auth validation failed", error);
    } finally {
      setLoading(false);
    }
  }

  // ── Login ────────────────────────────────────────────────────────────
  async function login(email: string, password: string) {
    const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "Invalid email or password");
    }

    localStorage.setItem("agentflow_token", data.token);
    setToken(data.token);
    setUser(data.user);
  }

  // ── Register ─────────────────────────────────────────────────────────
  async function register(name: string, email: string, password: string) {
    const res = await fetch(`${API_BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });
    const data = await res.json();

    if (!res.ok) throw new Error(data.error || "Registration failed");

    localStorage.setItem("agentflow_token", data.token);
    setToken(data.token);
    setUser(data.user);
  }

  // ── Logout ───────────────────────────────────────────────────────────
  async function logout() {
    try {
      await fetch(`${API_BASE_URL}/api/auth/logout`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (e) {
      console.error("Logout request failed", e);
    } finally {
      localStorage.removeItem("agentflow_token");
      localStorage.removeItem("agentflow_admin_backup");
      setToken(null);
      setUser(null);
      setImpersonating(false);
      setSavedAdmin(null);
    }
  }

  // ── Impersonate ─────────────────────────────────────────────────────
  async function impersonateUser(userId: number) {
    if (!token || !user) return;
    const res = await fetch(`${API_BASE_URL}/api/users/${userId}/impersonate`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Impersonate failed");

    // Backup current admin session
    const backup = { user, token };
    localStorage.setItem("agentflow_admin_backup", JSON.stringify(backup));
    setSavedAdmin(backup);

    // Switch to target user's token
    localStorage.setItem("agentflow_token", data.token);
    setToken(data.token);
    setUser(data.user);
    setImpersonating(true);
  }

  function stopImpersonating() {
    if (!savedAdmin) return;
    localStorage.setItem("agentflow_token", savedAdmin.token);
    localStorage.removeItem("agentflow_admin_backup");
    setToken(savedAdmin.token);
    setUser(savedAdmin.user);
    setImpersonating(false);
    setSavedAdmin(null);
  }

  // ── Update user ─────────────────────────────────────────────────────
  async function updateUser(
    userId: number,
    data: Partial<AuthUser & { password?: string }>,
  ) {
    const res = await fetch(`${API_BASE_URL}/api/users/${userId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || "Update failed");

    // If updating own profile, sync local state
    if (user?.id === userId) setUser(result.user);
  }

  // ── Permissions helpers ─────────────────────────────────────────────
  const isRole = (...roles: Role[]) => !!user && roles.includes(user.role);
  const hasPermission = (permission: Permission): boolean => {
    if (!user) return false;
    return (PERMISSIONS[permission] || []).includes(user.role);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        impersonating,
        originalAdmin: savedAdmin?.user ?? null,
        login,
        register,
        logout,
        impersonateUser,
        stopImpersonating,
        updateUser,
        isRole,
        hasPermission,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

// ── Protected Route (with loader) ─────────────────────────────────────
interface ProtectedRouteProps {
  children: ReactNode;
  roles?: Role[];
}

export function ProtectedRoute({ children, roles }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) {
    // Not authenticated — redirect to login
    return <Redirect to="/login" />;
  }

  if (roles && !roles.includes(user.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">Access Denied</h1>
          <p className="text-muted-foreground">
            You don't have permission to view this page.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
