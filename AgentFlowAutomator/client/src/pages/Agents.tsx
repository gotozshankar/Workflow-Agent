import { useState, useEffect } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  Search,
  Bot,
  MoreHorizontal,
  Trash2,
  Power,
  PowerOff,
  Loader2,
  Pencil,
  Cpu,
  Rocket,
  ExternalLink,
  Copy,
  CheckCircle2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import API_URL from "../config";

// Azure OpenAI deployment names
const MODELS = ["gpt-4o", "gpt-4-turbo", "gpt-4", "gpt-35-turbo"];
const TOOL_OPTIONS = [
  "Email",
  "Knowledge Base",
  "Web Search",
  "SQL",
  "Python",
  "Sentiment Analysis",
  "Summarization",
  "Report Writing",
  "Charting",
  "CRM",
];

interface Agent {
  id: string;
  name: string;
  description: string;
  system_prompt: string;
  model: string;
  tools: string[];
  status: string;
  n8n_workflow_id?: string;
  created_at: string;
}

interface DeployResult {
  workflow_id: string;
  workflow_name: string;
  chat_url: string;
  n8n_url: string;
}

function getToken() {
  return localStorage.getItem("agentflow_token");
}
function authHeaders(): Record<string, string> {
  const t = getToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
}

// Keep original dot colours – they're tiny and descriptive
const STATUS_COLOR: Record<string, string> = {
  online: "bg-green-500",
  busy: "bg-amber-500",
  offline: "bg-gray-400",
};

// Helper: card background colour based on status
const getCardClasses = (status: string) => {
  switch (status) {
    case "online":
      return "bg-violet-100 border-violet-400"; // dark pastel emerald
    case "offline":
      return "bg-violet-50 border-violet-200"; // light pastel emerald
    case "busy":
      return "bg-rose-50 border-rose-200";
    default:
      return "bg-white border-muted/60";
  }
};

// Helper: gradient header background based on status
const getHeaderClasses = (status: string) => {
  switch (status) {
    case "online":
      return "bg-gradient-to-r from-violet-200/70 to-violet-100";
    case "offline":
      return "bg-gradient-to-r from-violet-100/60 to-violet-50";
    case "busy":
      return "bg-gradient-to-r from-rose-200/70 to-rose-100";
    default:
      return "bg-gradient-to-r from-violet-100/50 to-pink-50";
  }
};

export default function Agents() {
  const { toast } = useToast();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Create / Edit dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editAgent, setEditAgent] = useState<Agent | null>(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    system_prompt: "",
    model: "gpt-4o",
    tools: [] as string[],
  });
  const [saving, setSaving] = useState(false);

  // Delete
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Deploy
  const [deployingId, setDeployingId] = useState<string | null>(null);
  const [deployResult, setDeployResult] = useState<DeployResult | null>(null);
  const [copied, setCopied] = useState(false);

  // Publish
  const [publishingId, setPublishingId] = useState<string | null>(null);

  useEffect(() => {
    fetchAgents();
  }, []);

  async function fetchAgents() {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/agents`, {
        headers: authHeaders(),
      });
      const data = await res.json();
      if (data.success) setAgents(data.agents);
    } catch {
      toast({ title: "Failed to load agents", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setEditAgent(null);
    setForm({
      name: "",
      description: "",
      system_prompt: "",
      model: "gpt-4o",
      tools: [],
    });
    setDialogOpen(true);
  }

  function openEdit(agent: Agent) {
    setEditAgent(agent);
    setForm({
      name: agent.name,
      description: agent.description,
      system_prompt: agent.system_prompt,
      model: agent.model,
      tools: agent.tools,
    });
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!form.name.trim()) {
      toast({ title: "Agent name is required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const url = editAgent
        ? `${API_URL}/api/agents/${editAgent.id}`
        : `${API_URL}/api/agents`;
      const method = editAgent ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: editAgent ? "Agent updated" : "Agent created" });
        setDialogOpen(false);
        await fetchAgents();
      } else {
        toast({
          title: data.error || "Failed to save",
          variant: "destructive",
        });
      }
    } catch {
      toast({ title: "Save error", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(agent: Agent) {
    setDeletingId(agent.id);
    try {
      const res = await fetch(`${API_URL}/api/agents/${agent.id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: `"${agent.name}" deleted` });
        setAgents((prev) => prev.filter((a) => a.id !== agent.id));
      } else {
        toast({ title: data.error || "Delete failed", variant: "destructive" });
      }
    } catch {
      toast({ title: "Delete error", variant: "destructive" });
    } finally {
      setDeletingId(null);
    }
  }

  async function handleDeploy(agent: Agent) {
    setDeployingId(agent.id);
    try {
      const res = await fetch(`${API_URL}/api/agents/${agent.id}/deploy`, {
        method: "POST",
        headers: authHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        setAgents((prev) =>
          prev.map((a) =>
            a.id === agent.id
              ? { ...a, status: "online", n8n_workflow_id: data.workflow_id }
              : a,
          ),
        );
        setDeployResult(data);
        toast({ title: `"${agent.name}" deployed to n8n` });
      } else {
        toast({ title: data.error || "Deploy failed", variant: "destructive" });
      }
    } catch {
      toast({ title: "Deploy error", variant: "destructive" });
    } finally {
      setDeployingId(null);
    }
  }

  async function handlePublish(agent: Agent) {
    setPublishingId(agent.id);
    try {
      const res = await fetch(`${API_URL}/api/agents/${agent.id}/publish`, {
        method: "POST",
        headers: authHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: `"${agent.name}" published and active in n8n` });
        setAgents((prev) =>
          prev.map((a) => (a.id === agent.id ? { ...a, status: "online" } : a)),
        );
      } else {
        toast({
          title: data.error || "Publish failed",
          variant: "destructive",
        });
      }
    } catch {
      toast({ title: "Publish error", variant: "destructive" });
    } finally {
      setPublishingId(null);
    }
  }

  async function toggleStatus(agent: Agent) {
    const newStatus = agent.status === "online" ? "offline" : "online";
    try {
      const res = await fetch(`${API_URL}/api/agents/${agent.id}`, {
        method: "PATCH",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setAgents((prev) =>
          prev.map((a) =>
            a.id === agent.id ? { ...a, status: newStatus } : a,
          ),
        );
      }
    } catch {
      toast({ title: "Status update failed", variant: "destructive" });
    }
  }

  function copyUrl(url: string) {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function toggleTool(tool: string) {
    setForm((prev) => ({
      ...prev,
      tools: prev.tools.includes(tool)
        ? prev.tools.filter((t) => t !== tool)
        : [...prev.tools, tool],
    }));
  }

  const filtered = agents.filter(
    (a) =>
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.description.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="min-h-screen flex">
      <Sidebar />

      <main className="flex-1 main-content">
        <Header title="AI Agents" />

        <div className="p-8 max-w-7xl mx-auto space-y-8">
          {/* Toolbar */}
          <div className="flex flex-col md:flex-row justify-between gap-4 items-center">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search agents..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <span>
                  {agents.length} agent{agents.length !== 1 ? "s" : ""}
                </span>
              )}
              <Button className="gap-2" onClick={openCreate}>
                <Plus className="h-4 w-4" /> New Agent
              </Button>
            </div>
          </div>

          {/* Grid */}
          {loading ? (
            <div className="flex justify-center py-24">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((agent) => (
                <Card
                  key={agent.id}
                  className={`hover:shadow-md transition-shadow border overflow-hidden ${getCardClasses(agent.status)}`}
                >
                  {/* Gradient header */}
                  <div
                    className={`h-20 relative flex items-center justify-between px-4 ${getHeaderClasses(agent.status)}`}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={`h-2.5 w-2.5 rounded-full ${STATUS_COLOR[agent.status] || "bg-gray-400"}`}
                      />
                      <span className="text-xs font-medium text-muted-foreground capitalize">
                        {agent.status}
                      </span>
                      {agent.n8n_workflow_id && (
                        <Badge
                          variant="outline"
                          className="text-xs py-0 h-5 bg-green-50 text-green-700 border-green-200"
                        >
                          Deployed
                        </Badge>
                      )}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 hover:bg-white/50"
                        >
                          {deletingId === agent.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <MoreHorizontal className="h-4 w-4" />
                          )}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-white">
                        <DropdownMenuItem onClick={() => openEdit(agent)}>
                          <Pencil className="h-4 w-4 mr-2" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => toggleStatus(agent)}>
                          {agent.status === "online" ? (
                            <>
                              <PowerOff className="h-4 w-4 mr-2" /> Set Offline
                            </>
                          ) : (
                            <>
                              <Power className="h-4 w-4 mr-2" /> Set Online
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => handleDelete(agent)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <CardContent className="pt-4 space-y-3 pb-5">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Bot className="h-6 w-6 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-base truncate">
                          {agent.name}
                        </h3>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Cpu className="h-3 w-3" /> {agent.model}
                        </p>
                      </div>
                    </div>

                    {agent.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {agent.description}
                      </p>
                    )}

                    {agent.tools.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {agent.tools.map((t) => (
                          <Badge
                            key={t}
                            variant="secondary"
                            className="text-xs font-normal"
                          >
                            {t}
                          </Badge>
                        ))}
                      </div>
                    )}

                    <div className="flex gap-2 pt-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 h-8 text-xs"
                        onClick={() => openEdit(agent)}
                      >
                        <Pencil className="h-3 w-3 mr-1" /> Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="default"
                        className="flex-1 h-8 text-xs bg-purple-600 hover:bg-purple-700 text-white"
                        disabled={deployingId === agent.id}
                        onClick={() => handleDeploy(agent)}
                      >
                        {deployingId === agent.id ? (
                          <>
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />{" "}
                            Deploying...
                          </>
                        ) : (
                          <>
                            <Rocket className="h-3 w-3 mr-1" />{" "}
                            {agent.n8n_workflow_id ? "Redeploy" : "Deploy"}
                          </>
                        )}
                      </Button>
                      {agent.n8n_workflow_id && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 h-8 text-xs border-green-500 text-green-700 hover:bg-green-50"
                          disabled={publishingId === agent.id}
                          onClick={() => handlePublish(agent)}
                        >
                          {publishingId === agent.id ? (
                            <>
                              <Loader2 className="h-3 w-3 mr-1 animate-spin" />{" "}
                              Publishing...
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="h-3 w-3 mr-1" /> Publish
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}

              {/* Add placeholder */}
              <Card
                className="border-dashed border-2 border-muted hover:border-primary/50 hover:bg-muted/10 transition-colors cursor-pointer flex flex-col items-center justify-center text-center p-8 min-h-[280px]"
                onClick={openCreate}
              >
                <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center mb-4">
                  <Plus className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="font-semibold text-base mb-1">New Agent</h3>
                <p className="text-sm text-muted-foreground max-w-[200px]">
                  Create a specialized agent with custom instructions and tools
                </p>
              </Card>
            </div>
          )}
        </div>
      </main>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg bg-white/95 backdrop-blur-sm text-gray-800 border border-violet-200 shadow-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" />
              {editAgent ? "Edit Agent" : "New AI Agent"}
            </DialogTitle>
            <DialogDescription className="text-gray-500">
              Configure your agent's name, model, instructions, and
              capabilities.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="agent-name">Agent Name *</Label>
              <Input
                id="agent-name"
                placeholder="e.g. Support Specialist"
                value={form.name}
                onChange={(e) =>
                  setForm((p) => ({ ...p, name: e.target.value }))
                }
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="agent-desc">Description</Label>
              <Input
                id="agent-desc"
                placeholder="What does this agent do?"
                value={form.description}
                onChange={(e) =>
                  setForm((p) => ({ ...p, description: e.target.value }))
                }
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="agent-model">Model</Label>
              <select
                id="agent-model"
                value={form.model}
                onChange={(e) =>
                  setForm((p) => ({ ...p, model: e.target.value }))
                }
                className="w-full border border-violet-200 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-400"
              >
                {MODELS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="agent-prompt">System Prompt</Label>
              <Textarea
                id="agent-prompt"
                placeholder="You are a helpful assistant specialized in..."
                rows={4}
                value={form.system_prompt}
                onChange={(e) =>
                  setForm((p) => ({ ...p, system_prompt: e.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Capabilities / Tools</Label>
              <div className="flex flex-wrap gap-2">
                {TOOL_OPTIONS.map((tool) => {
                  const selected = form.tools.includes(tool);
                  return (
                    <button
                      key={tool}
                      type="button"
                      onClick={() => toggleTool(tool)}
                      className={`px-3 py-1 rounded-full text-xs border transition-colors ${
                        selected
                          ? "bg-primary text-white border-primary"
                          : "bg-violet-50 text-violet-700 border-violet-200 hover:border-violet-400"
                      }`}
                    >
                      {tool}
                    </button>
                  );
                })}
              </div>
            </div>
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
              ) : editAgent ? (
                "Update"
              ) : (
                "Create Agent"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deploy Result Dialog */}
      <Dialog open={!!deployResult} onOpenChange={() => setDeployResult(null)}>
        <DialogContent className="sm:max-w-md bg-white/95 backdrop-blur-sm text-gray-800 border border-violet-200 shadow-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-700">
              <CheckCircle2 className="h-5 w-5" />
              Agent Deployed Successfully
            </DialogTitle>
            <DialogDescription className="text-gray-500">
              Your agent is now live in n8n. Use the chat URL to interact with
              it.
            </DialogDescription>
          </DialogHeader>

          {deployResult && (
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label className="text-xs text-gray-500 uppercase tracking-wide">
                  Workflow Name
                </Label>
                <p className="text-sm font-medium">
                  {deployResult.workflow_name}
                </p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-gray-500 uppercase tracking-wide">
                  Chat URL
                </Label>
                <div className="flex gap-2 items-center bg-violet-50 border border-violet-200 rounded-md px-3 py-2">
                  <span className="text-xs text-gray-700 truncate flex-1">
                    {deployResult.chat_url}
                  </span>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6 flex-shrink-0"
                    onClick={() => copyUrl(deployResult.chat_url)}
                  >
                    {copied ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  className="flex-1 gap-2"
                  onClick={() => window.open(deployResult.n8n_url, "_blank")}
                >
                  <ExternalLink className="h-4 w-4" /> Open in n8n
                </Button>
                <Button
                  className="flex-1 gap-2"
                  onClick={() => window.open(deployResult.chat_url, "_blank")}
                >
                  <Bot className="h-4 w-4" /> Open Chat
                </Button>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDeployResult(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
