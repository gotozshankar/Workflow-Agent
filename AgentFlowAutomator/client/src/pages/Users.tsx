import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LogIn, LogOut, Pencil, Save, X, AlertTriangle } from "lucide-react";

interface UserRow {
  id: number;
  name: string;
  email: string;
  role: string;
  created_at: string;
}

const ROLES = ["user", "admin", "super_admin"];
const ROLE_STYLE: Record<string, string> = {
  super_admin: "bg-amber-100 text-amber-800",
  admin: "bg-violet-100 text-violet-800",
  user: "bg-sky-100 text-sky-800",
};
import API_URL from "../config"; // Adjust the path as needed
const API_BASE_URL = API_URL;
export default function UsersPage() {
  const {
    user: me,
    token,
    impersonating,
    originalAdmin,
    impersonateUser,
    stopImpersonating,
    updateUser,
  } = useAuth();

  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<number | null>(null);
  const [editData, setEditData] = useState<
    Partial<UserRow & { password: string }>
  >({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const isSuperAdmin = me?.role === "super_admin";

  // Load users
  async function loadUsers() {
    // const API = "https://ai-automation-ffqc.onrender.com"

    try {
      const res = await fetch(`${API_BASE_URL}/api/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, [token]);

  // Start inline edit
  function startEdit(u: UserRow) {
    setEditId(u.id);
    setEditData({ name: u.name, email: u.email, role: u.role, password: "" });
    setError("");
  }

  // Save edit
  async function saveEdit(userId: number) {
    setSaving(true);
    setError("");
    try {
      await updateUser(userId, editData);
      await loadUsers();
      setEditId(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  // Impersonate
  async function handleImpersonate(userId: number) {
    try {
      await impersonateUser(userId);
      window.location.href = "/"; // redirect to dashboard as that user
    } catch (e: any) {
      setError(e.message);
    }
  }

  return (
    <div className="min-h-screen flex ">
      <Sidebar />
      <main className="flex-1 main-content">
        <Header title="User Management" />

        <div className="p-8 max-w-5xl mx-auto space-y-6">
          {/* Impersonation banner */}
          {impersonating && (
            <div className="flex items-center gap-3 bg-amber-50 border border-amber-300 text-amber-800 px-5 py-3 rounded-xl text-sm font-medium">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>
                Viewing as <strong>{me?.name}</strong> — you are logged in as
                this user. Originally signed in as{" "}
                <strong>{originalAdmin?.name}</strong>.
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={stopImpersonating}
                className="ml-auto gap-1.5 border-amber-400 text-amber-800 hover:bg-amber-100"
              >
                <LogOut className="h-3.5 w-3.5" />
                Back to Admin
              </Button>
            </div>
          )}

          {error && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-xl text-sm">
              {error}
            </div>
          )}

          <div className="rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="text-left p-4 font-medium text-muted-foreground">
                    Name
                  </th>
                  <th className="text-left p-4 font-medium text-muted-foreground">
                    Email
                  </th>
                  <th className="text-left p-4 font-medium text-muted-foreground">
                    Role
                  </th>
                  <th className="text-left p-4 font-medium text-muted-foreground">
                    Joined
                  </th>
                  {isSuperAdmin && (
                    <th className="text-left p-4 font-medium text-muted-foreground">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>

              <tbody className="divide-y">
                {loading ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="p-8 text-center text-muted-foreground"
                    >
                      Loading...
                    </td>
                  </tr>
                ) : (
                  users.map((u) => (
                    <tr
                      key={u.id}
                      className="hover:bg-muted/20 transition-colors"
                    >
                      {editId === u.id ? (
                        // ── Edit row ─────────────────────────────────────────
                        <>
                          <td className="p-3">
                            <Input
                              value={editData.name ?? ""}
                              onChange={(e) =>
                                setEditData((d) => ({
                                  ...d,
                                  name: e.target.value,
                                }))
                              }
                              className="h-8 text-sm"
                              placeholder="Name"
                            />
                          </td>
                          <td className="p-3">
                            <Input
                              value={editData.email ?? ""}
                              onChange={(e) =>
                                setEditData((d) => ({
                                  ...d,
                                  email: e.target.value,
                                }))
                              }
                              className="h-8 text-sm"
                              placeholder="Email"
                            />
                          </td>
                          <td className="p-3">
                            <select
                              value={editData.role ?? "user"}
                              onChange={(e) =>
                                setEditData((d) => ({
                                  ...d,
                                  role: e.target.value,
                                }))
                              }
                              className="h-8 text-sm border rounded-md px-2 text-foreground"
                            >
                              {ROLES.map((r) => (
                                <option key={r} value={r}>
                                  {r}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="p-3">
                            <Input
                              type="password"
                              value={editData.password ?? ""}
                              onChange={(e) =>
                                setEditData((d) => ({
                                  ...d,
                                  password: e.target.value,
                                }))
                              }
                              className="h-8 text-sm"
                              placeholder="New password (optional)"
                            />
                          </td>
                          <td className="p-3">
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => saveEdit(u.id)}
                                disabled={saving}
                                className="h-7 gap-1 text-xs"
                              >
                                <Save className="h-3 w-3" />
                                {saving ? "Saving…" : "Save"}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setEditId(null)}
                                className="h-7"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          </td>
                        </>
                      ) : (
                        // ── View row ─────────────────────────────────────────
                        <>
                          <td className="p-4 font-medium">
                            {u.name}
                            {u.id === me?.id && (
                              <span className="ml-2 text-xs text-muted-foreground">
                                (you)
                              </span>
                            )}
                          </td>
                          <td className="p-4 text-muted-foreground">
                            {u.email}
                          </td>
                          <td className="p-4">
                            <span
                              className={`px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_STYLE[u.role] ?? ""}`}
                            >
                              {u.role}
                            </span>
                          </td>
                          <td className="p-4 text-muted-foreground text-xs">
                            {new Date(u.created_at).toLocaleDateString()}
                          </td>
                          {isSuperAdmin && (
                            <td className="p-4">
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => startEdit(u)}
                                  className="h-7 gap-1 text-xs"
                                >
                                  <Pencil className="h-3 w-3" />
                                  Edit
                                </Button>
                                {u.id !== me?.id && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleImpersonate(u.id)}
                                    className="h-7 gap-1 text-xs border-amber-300 text-amber-700 hover:bg-amber-50"
                                  >
                                    <LogIn className="h-3 w-3" />
                                    Login As
                                  </Button>
                                )}
                              </div>
                            </td>
                          )}
                        </>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
