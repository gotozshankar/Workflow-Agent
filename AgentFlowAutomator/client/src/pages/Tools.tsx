import { useState, useEffect } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Globe,
  Database,
  Mail,
  BookOpen,
  Cloud,
  Search,
  Trash2,
  CheckCircle2,
  Loader2,
  Plus,
  Settings,
} from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import API_URL from "../config";

// ── Catalog of supported integrations ─────────────────────────────────────────
const CATALOG = [
  {
    id: "gmail",
    name: "Gmail",
    icon: Mail,
    category: "Communication",
    n8nType: "gmailOAuth2Api",
    n8nTypes: ["gmailOAuth2Api", "gmailOAuth2", "googleOAuth2Api", "gmail"],
    description: "Send and receive emails via Gmail API.",
    fields: [
      {
        key: "clientId",
        label: "Client ID",
        type: "text",
        placeholder: "xxx.apps.googleusercontent.com",
      },
      {
        key: "clientSecret",
        label: "Client Secret",
        type: "password",
        placeholder: "GOCSPX-...",
      },
    ],
  },
  {
    id: "postgres",
    name: "PostgreSQL",
    icon: Database,
    category: "Data",
    n8nType: "postgres",
    n8nTypes: ["postgres", "postgresql", "postgresDb"],
    description: "Read and write to PostgreSQL databases.",
    fields: [
      { key: "host", label: "Host", type: "text", placeholder: "localhost" },
      { key: "port", label: "Port", type: "text", placeholder: "5432" },
      { key: "database", label: "Database", type: "text", placeholder: "mydb" },
      { key: "user", label: "User", type: "text", placeholder: "postgres" },
      {
        key: "password",
        label: "Password",
        type: "password",
        placeholder: "••••••••",
      },
    ],
  },
  {
    id: "http",
    name: "HTTP API (Header Auth)",
    icon: Globe,
    category: "Utility",
    n8nType: "httpHeaderAuth",
    n8nTypes: ["httpHeaderAuth", "httpHeader", "headerAuth"],
    description: "Call any REST API using a custom header-based auth token.",
    fields: [
      {
        key: "name",
        label: "Header Name",
        type: "text",
        placeholder: "Authorization",
      },
      {
        key: "value",
        label: "Header Value",
        type: "password",
        placeholder: "Bearer your-token",
      },
    ],
  },
  {
    id: "quickbooks",
    name: "QuickBooks",
    icon: BookOpen,
    category: "Finance",
    n8nType: "quickBooksOAuth2Api",
    n8nTypes: ["quickBooksOAuth2Api", "quickbooks", "quickBooksApi"],
    description:
      "Sync invoices, customers and accounting data with QuickBooks Online.",
    fields: [
      {
        key: "clientId",
        label: "Client ID",
        type: "text",
        placeholder: "ABxxxx...",
      },
      {
        key: "clientSecret",
        label: "Client Secret",
        type: "password",
        placeholder: "••••••••",
      },
      {
        key: "environment",
        label: "Environment",
        type: "text",
        placeholder: "production",
      },
    ],
  },
  {
    id: "azure_openai",
    name: "Azure OpenAI",
    icon: Cloud,
    category: "AI",
    n8nType: "azureOpenAiApi",
    n8nTypes: ["azureOpenAiApi", "azureOpenAI", "azureOpenAi", "azureopenai"],
    description:
      "Use Azure-hosted GPT-4o and other OpenAI models via your Azure endpoint.",
    fields: [
      {
        key: "resourceName",
        label: "Resource Name",
        type: "text",
        placeholder: "openai-chan-dev-5521",
      },
      {
        key: "apiKey",
        label: "API Key",
        type: "password",
        placeholder: "2r6bcZ0y...",
      },
      {
        key: "apiVersion",
        label: "API Version",
        type: "text",
        placeholder: "2024-02-01",
      },
    ],
  },
];

// Match a credential type against all known aliases for an integration
function matchType(
  credType: string,
  integration: (typeof CATALOG)[0],
): boolean {
  const t = credType.toLowerCase();
  return integration.n8nTypes.some((alias) => alias.toLowerCase() === t);
}

interface N8nCredential {
  id: string;
  name: string;
  type: string;
  createdAt?: string;
}

function getToken() {
  return localStorage.getItem("agentflow_token");
}
function authHeaders(): Record<string, string> {
  const t = getToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
}

// ── Ping dot with high‑contrast colours ──────────────────────────────────────
const PingDot = ({ active }: { active: boolean }) => {
  return (
    <span className="relative flex h-3 w-3">
      {active ? (
        <>
          {/* pulsating emerald ring */}
          <motion.span
            className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"
            animate={{ scale: [1, 2, 1], opacity: [0.7, 0, 0.7] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          />
          {/* solid emerald dot */}
          <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-600" />
        </>
      ) : (
        <span className="relative inline-flex rounded-full h-3 w-3 bg-gray-300" />
      )}
    </span>
  );
};

// ── Card colour classes ──────────────────────────────────────────────────────
const getCardClasses = (connected: boolean): string => {
  return connected
    ? "bg-purple-200 border-purple-500"
    : "bg-violet-50 border-violet-200";
};

const getIconContainerClasses = (connected: boolean): string => {
  return connected
    ? "bg-purple-300 text-purple-900"
    : "bg-violet-100 text-violet-700";
};

export default function Tools() {
  const { toast } = useToast();

  const [credentials, setCredentials] = useState<N8nCredential[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selected, setSelected] = useState<(typeof CATALOG)[0] | null>(null);
  const [credName, setCredName] = useState("");
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // Delete state
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchCredentials();
  }, []);

  async function fetchCredentials() {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/n8n/credentials`, {
        headers: authHeaders(),
      });
      const data = await res.json();
      if (data.success) setCredentials(data.credentials || []);
    } catch {
      toast({
        title: "Could not load credentials from n8n",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  function openConfigure(integration: (typeof CATALOG)[0]) {
    setSelected(integration);
    setCredName(`${integration.name} — My Account`);
    setFieldValues({});
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!selected) return;
    const missing = selected.fields.find((f) => !fieldValues[f.key]?.trim());
    if (missing) {
      toast({
        title: `"${missing.label}" is required`,
        variant: "destructive",
      });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/n8n/credentials`, {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          name: credName.trim() || `${selected.name} Credential`,
          type: selected.n8nType,
          data: fieldValues,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: `"${credName}" saved to n8n` });
        setDialogOpen(false);
        await fetchCredentials();
      } else {
        toast({
          title: data.error || "Failed to save credential",
          variant: "destructive",
        });
      }
    } catch {
      toast({ title: "Save error", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(cred: N8nCredential) {
    setDeletingId(cred.id);
    try {
      const res = await fetch(`${API_URL}/api/n8n/credentials/${cred.id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: `"${cred.name}" removed from n8n` });
        await fetchCredentials();
      } else {
        toast({ title: data.error || "Delete failed", variant: "destructive" });
      }
    } catch {
      toast({ title: "Delete error", variant: "destructive" });
    } finally {
      setDeletingId(null);
    }
  }

  function getExisting(integration: (typeof CATALOG)[0]): N8nCredential[] {
    return credentials.filter((c: N8nCredential) =>
      matchType(c.type, integration),
    );
  }

  const filtered = CATALOG.filter(
    (i) =>
      i.name.toLowerCase().includes(search.toLowerCase()) ||
      i.category.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="min-h-screen font-sans flex">
      <Sidebar />

      <main className="flex-1 main-content">
        <Header title="Tools & Integrations" />

        <div className="p-8 max-w-7xl mx-auto space-y-8">
          {/* Toolbar */}
          <div className="flex flex-col md:flex-row justify-between gap-4 items-center">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search integrations..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 text-purple-500" />{" "}
                  {credentials.length} credential
                  {credentials.length !== 1 ? "s" : ""} configured in n8n
                </>
              )}
            </div>
          </div>

          {/* Integration Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((integration) => {
              const existing = getExisting(integration);
              const connected = existing.length > 0;
              return (
                <Card
                  key={integration.id}
                  className={`flex flex-col hover:shadow-md transition-shadow border ${getCardClasses(connected)}`}
                >
                  <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                    <div
                      className={`p-2 rounded-lg ${getIconContainerClasses(connected)}`}
                    >
                      <integration.icon
                        className={`h-6 w-6 ${connected ? "text-purple-900" : "text-violet-700"}`}
                      />
                    </div>
                    <Badge
                      variant={connected ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {integration.category}
                    </Badge>
                  </CardHeader>
                  <CardContent className="flex-1 pt-3 space-y-3 flex flex-col justify-around">
                    <div>
                      <CardTitle className="text-base mb-1">
                        {integration.name}
                      </CardTitle>
                      <CardDescription className="text-xs leading-relaxed">
                        {integration.description}
                      </CardDescription>
                    </div>

                    {/* Existing credentials for this type */}
                    {existing.length > 0 && (
                      <div className="space-y-1">
                        {existing.map((cred) => (
                          <div
                            key={cred.id}
                            className="flex items-center justify-between bg-muted/50 rounded px-2 py-1"
                          >
                            <div className="flex items-center gap-1.5 min-w-0">
                              <CheckCircle2 className="h-3.5 w-3.5 text-purple-500 flex-shrink-0" />
                              <span className="text-xs font-medium truncate">
                                {cred.name}
                              </span>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-muted-foreground hover:text-destructive flex-shrink-0"
                              disabled={deletingId === cred.id}
                              onClick={() => handleDelete(cred)}
                            >
                              {deletingId === cred.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Trash2 className="h-3 w-3" />
                              )}
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Status + Configure button */}
                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center gap-1.5 text-xs">
                        <PingDot active={connected} />
                        <span
                          className={`font-medium ${
                            connected ? "text-emerald-700" : "text-gray-400"
                          }`}
                        >
                          {connected ? "Connected" : "Not configured"}
                        </span>
                      </div>
                      <Button
                        size="sm"
                        variant={connected ? "outline" : "default"}
                        className="h-7 text-xs gap-1"
                        onClick={() => openConfigure(integration)}
                      >
                        {connected ? (
                          <>
                            <Settings className="h-3 w-3" /> Add Another
                          </>
                        ) : (
                          <>
                            <Plus className="h-3 w-3" /> Configure
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </main>

      {/* Configure Credential Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md bg-white/95 backdrop-blur-sm text-gray-800 border border-violet-200 shadow-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selected && <selected.icon className="h-5 w-5 text-primary" />}
              Configure {selected?.name}
            </DialogTitle>
            <DialogDescription className="text-violet-500">
              Credentials are saved directly to n8n and used in your workflows.
              They are never stored in plain text.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="cred-name">Credential Name</Label>
              <Input
                id="cred-name"
                value={credName}
                onChange={(e) => setCredName(e.target.value)}
                placeholder="e.g. My Work Gmail"
              />
            </div>

            {selected?.fields.map((field) => (
              <div key={field.key} className="space-y-1.5">
                <Label htmlFor={field.key}>{field.label}</Label>
                <Input
                  id={field.key}
                  type={field.type}
                  placeholder={field.placeholder}
                  value={fieldValues[field.key] || ""}
                  onChange={(e) =>
                    setFieldValues((prev) => ({
                      ...prev,
                      [field.key]: e.target.value,
                    }))
                  }
                />
              </div>
            ))}
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...
                </>
              ) : (
                "Save to n8n"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
