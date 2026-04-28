// ════════════════════════════════════════════════════════
// FILE 1: src/App.tsx  — Add these routes to your existing router
// ════════════════════════════════════════════════════════

/*
  Add to your existing App.tsx / router file:

  import { AuthProvider, ProtectedRoute } from "@/context/AuthContext"
  import Login    from "@/pages/Login"
  import Register from "@/pages/Register"
  import UserManagement from "@/pages/UserManagement"

  Wrap your <Router> with <AuthProvider>:

  <AuthProvider>
    <Router>
      <Switch>
        <Route path="/login"    component={Login} />
        <Route path="/register" component={Register} />

        // Protected routes — any logged-in user
        <Route path="/">
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        </Route>

        // Super Admin only
        <Route path="/users">
          <ProtectedRoute roles={["super_admin"]}>
            <UserManagement />
          </ProtectedRoute>
        </Route>

        // Admin + Super Admin only
        <Route path="/audit-logs">
          <ProtectedRoute roles={["super_admin", "admin"]}>
            <AuditLogs />
          </ProtectedRoute>
        </Route>

        <Route path="/security">
          <ProtectedRoute roles={["super_admin", "admin"]}>
            <Security />
          </ProtectedRoute>
        </Route>
      </Switch>
    </Router>
  </AuthProvider>
*/

// ════════════════════════════════════════════════════════
// FILE 2: src/pages/UserManagement.tsx
// Super Admin can see all users + change roles + delete
// ════════════════════════════════════════════════════════

import { useState, useEffect } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { useAuth } from "@/context/AuthContext";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Shield,
  Users,
  ChevronDown,
  Trash2,
  Loader2,
  UserCheck,
} from "lucide-react";

const ROLES = ["super_admin", "admin", "user"] as const;
const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  user: "User",
};
const ROLE_COLORS: Record<string, string> = {
  super_admin: "text-amber-700 bg-amber-100 border-amber-300",
  admin: "text-violet-700 bg-violet-100 border-violet-300",
  user: "text-sky-700 bg-sky-100 border-sky-300",
};

interface UserRow {
  id: number;
  name: string;
  email: string;
  role: string;
  created_at: string;
}

export default function UserManagement() {
  const { token, user: me } = useAuth();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const API = "/";

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    try {
      const res = await fetch(`${API}/api/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setUsers(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function changeRole(userId: number, newRole: string) {
    try {
      const res = await fetch(`${API}/api/users/${userId}/role`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ role: newRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setUsers(users.map((u) => (u.id === userId ? data.user : u)));
    } catch (e: any) {
      alert(e.message);
    }
  }

  async function deleteUser(userId: number, name: string) {
    if (!confirm(`Delete user "${name}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`${API}/api/users/${userId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setUsers(users.filter((u) => u.id !== userId));
    } catch (e: any) {
      alert(e.message);
    }
  }

  const counts = {
    total: users.length,
    super_admin: users.filter((u) => u.role === "super_admin").length,
    admin: users.filter((u) => u.role === "admin").length,
    user: users.filter((u) => u.role === "user").length,
  };

  return (
    <div className="min-h-screen bg-background font-sans flex">
      <Sidebar />
      <main className="flex-1 ml-64">
        <Header title="User Management" />

        <div className="p-8 max-w-7xl mx-auto space-y-8">
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              {
                label: "Total Users",
                value: counts.total,
                icon: Users,
                color: "text-foreground",
                bg: "bg-violet-50",
              },
              {
                label: "Super Admins",
                value: counts.super_admin,
                icon: Shield,
                color: "text-yellow-600",
                bg: "bg-amber-100",
              },
              {
                label: "Admins",
                value: counts.admin,
                icon: UserCheck,
                color: "text-purple-600",
                bg: "bg-violet-100",
              },
              {
                label: "Users",
                value: counts.user,
                icon: Users,
                color: "text-blue-600",
                bg: "bg-sky-100",
              },
            ].map((s) => (
              <Card key={s.label} className="border-muted/60">
                <CardContent className="p-5 flex items-center gap-4">
                  <div className={`p-3 rounded-xl ${s.bg}`}>
                    <s.icon className={`h-5 w-5 ${s.color}`} />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                    <p className="text-2xl font-bold">{s.value}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
              {error}
            </div>
          )}

          {/* Users table */}
          <Card className="border-muted/60 shadow-sm">
            <CardHeader>
              <CardTitle>All Users</CardTitle>
              <CardDescription>
                Manage roles and access for all workspace members
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-12">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  ) : (
                    users.map((u) => (
                      <TableRow key={u.id} className="group">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9">
                              <AvatarFallback className="text-xs font-semibold bg-primary/10 text-primary">
                                {u.name.substring(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-sm">{u.name}</p>
                              {u.id === me?.id && (
                                <p className="text-xs text-muted-foreground">
                                  (you)
                                </p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {u.email}
                        </TableCell>
                        <TableCell>
                          {/* Role change dropdown — disabled for self */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                disabled={u.id === me?.id}
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${ROLE_COLORS[u.role]} ${u.id !== me?.id ? "hover:opacity-80 cursor-pointer" : "cursor-default opacity-80"}`}
                              >
                                {ROLE_LABELS[u.role]}
                                {u.id !== me?.id && (
                                  <ChevronDown className="h-3 w-3" />
                                )}
                              </button>
                            </DropdownMenuTrigger>

                            <DropdownMenuContent align="start">
                              {ROLES.map((r) => (
                                <DropdownMenuItem
                                  key={r}
                                  onClick={() => changeRole(u.id, r)}
                                  className={
                                    u.role === r ? "font-semibold" : ""
                                  }
                                >
                                  <span
                                    className={`mr-2 h-2 w-2 rounded-full inline-block ${
                                      r === "super_admin"
                                        ? "bg-yellow-500"
                                        : r === "admin"
                                          ? "bg-purple-500"
                                          : "bg-blue-500"
                                    }`}
                                  />
                                  {ROLE_LABELS[r]}
                                  {u.role === r && " ✓"}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {new Date(u.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          {u.id !== me?.id && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => deleteUser(u.id, u.name)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
