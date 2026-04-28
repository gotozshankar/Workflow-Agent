import { useState, useEffect, useCallback } from "react";
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
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Shield,
  Lock,
  Eye,
  AlertTriangle,
  FileText,
  Key,
  Globe,
  UserCheck,
  Activity,
  RefreshCw,
  CheckCircle2,
  Clock,
  Webhook,
  Database,
  Zap,
  Loader2,
  Save,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import API_URL from "../config";

// ── Types ──────────────────────────────────────────────────────────────────────
interface PolicyRow {
  key: string;
  icon: any;
  label: string;
  description: string;
  severity: "critical" | "high" | "medium";
}

interface AuditEvent {
  id: number;
  event_type: string;
  action: string;
  resource: string;
  actor: string;
  severity: string;
  status: string;
  created_at: string;
  ip_address: string;
}

// ── Policy catalog (drives both UI and DB keys) ────────────────────────────────
const COMPLIANCE_CONTROLS: PolicyRow[] = [
  {
    key: "bias_detection",
    icon: UserCheck,
    label: "Bias Detection",
    description:
      "Flag outputs that may reflect demographic or political bias before they reach users.",
    severity: "high",
  },
  {
    key: "data_privacy",
    icon: Lock,
    label: "Data Privacy (GDPR / CCPA)",
    description:
      "Enforce consent checks and data subject rights across all generated workflows.",
    severity: "critical",
  },
  {
    key: "ai_transparency",
    icon: Eye,
    label: "AI Transparency",
    description:
      "Log model decisions and include explainability metadata in all workflow outputs.",
    severity: "medium",
  },
  {
    key: "accountability",
    icon: Activity,
    label: "Accountability Tracking",
    description:
      "Attribute every automated action to a user or workflow for full traceability.",
    severity: "high",
  },
];

const DATA_PROTECTION: PolicyRow[] = [
  {
    key: "pii_redaction",
    icon: Shield,
    label: "PII Redaction",
    description:
      "Automatically mask email addresses, phone numbers, and SSNs in workflow outputs.",
    severity: "critical",
  },
  {
    key: "human_in_the_loop",
    icon: UserCheck,
    label: "Human-in-the-Loop Approval",
    description:
      "Require manual sign-off before executing high-risk workflow steps.",
    severity: "high",
  },
  {
    key: "eu_data_residency",
    icon: Globe,
    label: "EU Data Residency",
    description:
      "Restrict all data storage and processing to EU-region infrastructure.",
    severity: "medium",
  },
  {
    key: "audit_logging",
    icon: FileText,
    label: "Continuous Audit Logging",
    description:
      "Persist every workflow execution, credential access, and user event to the DB.",
    severity: "high",
  },
  {
    key: "data_encryption",
    icon: Database,
    label: "Data Encryption at Rest",
    description:
      "Encrypt all stored workflow data and credentials with AES-256.",
    severity: "critical",
  },
];

const API_SECURITY: PolicyRow[] = [
  {
    key: "mfa_enforcement",
    icon: Key,
    label: "MFA Enforcement",
    description: "Require multi-factor authentication for all user logins.",
    severity: "critical",
  },
  {
    key: "webhook_signature",
    icon: Webhook,
    label: "Webhook Signature Verification",
    description: "Validate HMAC signatures on all incoming webhook payloads.",
    severity: "high",
  },
  {
    key: "rate_limiting",
    icon: Zap,
    label: "API Rate Limiting",
    description: "Cap API calls per minute per credential to prevent abuse.",
    severity: "medium",
  },
  {
    key: "key_rotation",
    icon: RefreshCw,
    label: "Automatic Key Rotation",
    description:
      "Rotate API keys every 90 days and invalidate old credentials.",
    severity: "high",
  },
];

// ── Defaults (shown while loading) ────────────────────────────────────────────
const DEFAULTS: Record<string, boolean | string | number> = {
  bias_detection: true,
  data_privacy: true,
  ai_transparency: true,
  accountability: true,
  pii_redaction: true,
  human_in_the_loop: true,
  eu_data_residency: false,
  audit_logging: true,
  data_encryption: true,
  mfa_enforcement: true,
  webhook_signature: true,
  rate_limiting: true,
  key_rotation: false,
  session_timeout_minutes: 30,
  ip_allowlist: "",
};

function authHeaders(): Record<string, string> {
  const t = localStorage.getItem("agentflow_token");
  return t ? { Authorization: `Bearer ${t}` } : {};
}

function severityDot(s: string) {
  return s === "critical"
    ? "bg-red-500"
    : s === "warning"
      ? "bg-amber-500"
      : s === "success"
        ? "bg-green-500"
        : "bg-blue-400";
}
function severityBadge(s: string) {
  return s === "critical"
    ? "text-red-600 border-red-200 bg-red-50"
    : s === "warning"
      ? "text-amber-600 border-amber-200 bg-amber-50"
      : s === "success"
        ? "text-green-600 border-green-200 bg-green-50"
        : "text-blue-600 border-blue-200 bg-blue-50";
}

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function Security() {
  const { toast } = useToast();

  // ── State ──────────────────────────────────────────────────────────────────
  const [policies, setPolicies] = useState<Record<string, any>>(DEFAULTS);
  const [loadingPolicies, setLoadingPolicies] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [sessionTimeout, setSessionTimeout] = useState("30");
  const [ipAllowlist, setIpAllowlist] = useState("");

  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [auditLoading, setAuditLoading] = useState(true);
  const [auditTotal, setAuditTotal] = useState(0);

  // ── Load policies from DB ──────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`${API_URL}/api/security/policies`, {
          headers: authHeaders(),
        });
        const data = await res.json();
        if (
          data.success &&
          data.policies &&
          Object.keys(data.policies).length > 0
        ) {
          const p = data.policies;
          setPolicies({ ...DEFAULTS, ...p });
          setSessionTimeout(String(p.session_timeout_minutes ?? 30));
          setIpAllowlist(p.ip_allowlist ?? "");
        }
      } catch {
        toast({
          title: "Could not load security policies",
          variant: "destructive",
        });
      } finally {
        setLoadingPolicies(false);
      }
    }
    load();
  }, []);

  // ── Load audit events ──────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`${API_URL}/api/audit/events?per_page=20`, {
          headers: authHeaders(),
        });
        const data = await res.json();
        if (data.success) {
          setAuditEvents(data.events || []);
          setAuditTotal(data.total || 0);
        }
      } catch {
        // non-fatal
      } finally {
        setAuditLoading(false);
      }
    }
    load();
  }, []);

  // ── Save to DB ─────────────────────────────────────────────────────────────
  const savePolicies = useCallback(
    async (nextPolicies: Record<string, any>) => {
      setSaving(true);
      try {
        const user = JSON.parse(localStorage.getItem("agentflow_user") || "{}");
        const res = await fetch(`${API_URL}/api/security/policies`, {
          method: "PUT",
          headers: { ...authHeaders(), "Content-Type": "application/json" },
          body: JSON.stringify({
            policies: nextPolicies,
            actor: user.email || "unknown",
            user_id: user.id,
          }),
        });
        const data = await res.json();
        if (data.success) {
          setDirty(false);
          toast({ title: "Security policies saved" });
          // Refresh audit events
          const evRes = await fetch(`${API_URL}/api/audit/events?per_page=20`, {
            headers: authHeaders(),
          });
          const evData = await evRes.json();
          if (evData.success) {
            setAuditEvents(evData.events || []);
            setAuditTotal(evData.total || 0);
          }
        } else {
          toast({ title: data.error || "Save failed", variant: "destructive" });
        }
      } catch {
        toast({
          title: "Network error saving policies",
          variant: "destructive",
        });
      } finally {
        setSaving(false);
      }
    },
    [],
  );

  // ── Toggle a boolean policy ────────────────────────────────────────────────
  function togglePolicy(key: string, label: string) {
    const next = !policies[key];
    const nextPolicies = { ...policies, [key]: next };
    setPolicies(nextPolicies);
    setDirty(true);
    toast({
      title: `${label} ${next ? "enabled" : "disabled"}`,
      variant: next ? "default" : "destructive",
    });
  }

  // ── Metrics ────────────────────────────────────────────────────────────────
  const allRows = [...COMPLIANCE_CONTROLS, ...DATA_PROTECTION, ...API_SECURITY];
  const enabledCount = allRows.filter((r) => !!policies[r.key]).length;
  const totalCount = allRows.length;
  const securityScore = Math.round((enabledCount / totalCount) * 100);
  const criticalDisabled = allRows.filter(
    (r) => r.severity === "critical" && !policies[r.key],
  ).length;

  const scoreColor =
    securityScore >= 90
      ? "text-green-700"
      : securityScore >= 70
        ? "text-amber-600"
        : "text-red-600";
  const scoreBg =
    securityScore >= 90
      ? "bg-green-50 border-green-100"
      : securityScore >= 70
        ? "bg-amber-50 border-amber-100"
        : "bg-red-50 border-red-100";
  const scoreLabel =
    securityScore >= 90 ? "Secure" : securityScore >= 70 ? "Fair" : "At Risk";

  // ── Control Row ───────────────────────────────────────────────────────────
  function ControlRow({ row }: { row: PolicyRow }) {
    const Icon = row.icon;
    const enabled = !!policies[row.key];
    return (
      <div className="flex items-center justify-between py-4 border-b last:border-0 last:pb-0 gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <div
            className={`mt-0.5 p-1.5 rounded-md flex-shrink-0 ${enabled ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}
          >
            <Icon className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-medium text-sm text-foreground">{row.label}</p>
              {row.severity === "critical" && (
                <Badge
                  variant="outline"
                  className="text-[10px] text-rose-600 border-rose-200 bg-rose-50 px-1.5 py-0"
                >
                  Critical
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              {row.description}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <span
            className={`text-xs font-medium ${enabled ? "text-green-600" : "text-muted-foreground"}`}
          >
            {enabled ? "Active" : "Off"}
          </span>
          <Switch
            checked={enabled}
            disabled={loadingPolicies}
            onCheckedChange={() => togglePolicy(row.key, row.label)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen font-sans flex">
      <Sidebar />
      <main className="flex-1 main-content">
        <Header title="Security & Compliance" />

        <div className="p-8 max-w-7xl mx-auto space-y-8">
          {/* ── Score cards ──────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className={scoreBg}>
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className={`h-4 w-4 ${scoreColor}`} />
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Security Score
                  </span>
                </div>
                {loadingPolicies ? (
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                ) : (
                  <>
                    <p className={`text-3xl font-bold ${scoreColor}`}>
                      {securityScore}%
                    </p>
                    <p className={`text-sm font-medium mt-0.5 ${scoreColor}`}>
                      {scoreLabel}
                    </p>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Critical Gaps
                  </span>
                </div>
                <p className="text-3xl font-bold">{criticalDisabled}</p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {criticalDisabled === 0
                    ? "All critical controls on"
                    : "Critical controls off"}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Controls Active
                  </span>
                </div>
                <p className="text-3xl font-bold">
                  {enabledCount}/{totalCount}
                </p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Policies enforced
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="h-4 w-4 text-blue-500" />
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Audit Events
                  </span>
                </div>
                <p className="text-3xl font-bold">
                  {auditLoading ? "—" : auditTotal.toLocaleString()}
                </p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Recorded in DB
                </p>
              </CardContent>
            </Card>
          </div>

          {/* ── Save banner ───────────────────────────────────────────────── */}
          {dirty && (
            <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
              <p className="text-sm text-amber-800 font-medium">
                You have unsaved policy changes.
              </p>
              <Button
                size="sm"
                className="gap-1.5 bg-amber-600 hover:bg-amber-700 text-white"
                disabled={saving}
                onClick={() =>
                  savePolicies({
                    ...policies,
                    session_timeout_minutes: Number(sessionTimeout),
                    ip_allowlist: ipAllowlist,
                  })
                }
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Save Policies
              </Button>
            </div>
          )}

          {/* ── Compliance + Data Protection ───────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  AI Governance (Guardrails)
                </CardTitle>
                <CardDescription>
                  Ethical constraints applied to all generated workflows and
                  agent outputs
                </CardDescription>
              </CardHeader>
              <CardContent>
                {COMPLIANCE_CONTROLS.map((r) => (
                  <ControlRow key={r.key} row={r} />
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Data Protection</CardTitle>
                <CardDescription>
                  Privacy, encryption, and retention policies enforced at
                  runtime
                </CardDescription>
              </CardHeader>
              <CardContent>
                {DATA_PROTECTION.map((r) => (
                  <ControlRow key={r.key} row={r} />
                ))}
              </CardContent>
            </Card>
          </div>

          {/* ── API Security + Access Config ───────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  API & Webhook Security
                </CardTitle>
                <CardDescription>
                  Protect integrations and credentials from abuse
                </CardDescription>
              </CardHeader>
              <CardContent>
                {API_SECURITY.map((r) => (
                  <ControlRow key={r.key} row={r} />
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  Access Configuration
                </CardTitle>
                <CardDescription>
                  Session and network-level access policies
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-2">
                <div className="space-y-2">
                  <Label
                    htmlFor="session-timeout"
                    className="text-sm font-medium"
                  >
                    Session Timeout (minutes)
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="session-timeout"
                      type="number"
                      min="5"
                      max="480"
                      value={sessionTimeout}
                      onChange={(e) => {
                        setSessionTimeout(e.target.value);
                        setDirty(true);
                      }}
                      className="w-32 h-9"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-9"
                      disabled={saving}
                      onClick={() =>
                        savePolicies({
                          ...policies,
                          session_timeout_minutes: Number(sessionTimeout),
                          ip_allowlist: ipAllowlist,
                        })
                      }
                    >
                      {saving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Apply"
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Users are logged out after this period of inactivity.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ip-allowlist" className="text-sm font-medium">
                    IP Allowlist
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="ip-allowlist"
                      placeholder="e.g. 203.0.113.0/24, 198.51.100.5"
                      value={ipAllowlist}
                      onChange={(e) => {
                        setIpAllowlist(e.target.value);
                        setDirty(true);
                      }}
                      className="h-9 text-sm"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-9 flex-shrink-0"
                      disabled={saving}
                      onClick={() =>
                        savePolicies({
                          ...policies,
                          session_timeout_minutes: Number(sessionTimeout),
                          ip_allowlist: ipAllowlist,
                        })
                      }
                    >
                      Save
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Leave blank to allow all IPs. CIDR notation supported.
                  </p>
                </div>

                <div className="space-y-2 pt-2 border-t">
                  <p className="text-sm font-medium">Compliance Standards</p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      "SOC 2 Type II",
                      "GDPR",
                      "CCPA",
                      "ISO 27001",
                      "HIPAA Ready",
                    ].map((s) => (
                      <Badge
                        key={s}
                        variant="outline"
                        className="text-xs text-emerald-700 border-emerald-200 bg-emerald-50 gap-1"
                      >
                        <CheckCircle2 className="h-3 w-3" />
                        {s}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ── Live Audit Log ─────────────────────────────────────────── */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-base">Live Audit Log</CardTitle>
                <CardDescription>
                  {auditLoading
                    ? "Loading..."
                    : `${auditTotal.toLocaleString()} events captured in DB — showing latest 20`}
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs h-8"
                onClick={() => (window.location.href = "/audit")}
              >
                <FileText className="h-3.5 w-3.5" /> Full Audit Log
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {auditLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : auditEvents.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground text-sm">
                  No audit events yet. Events will appear here as users interact
                  with the platform.
                </div>
              ) : (
                <div className="divide-y">
                  {auditEvents.map((ev) => (
                    <div
                      key={ev.id}
                      className="flex items-center justify-between px-6 py-3 hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`h-2 w-2 rounded-full flex-shrink-0 ${severityDot(ev.severity)}`}
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">
                            {ev.action}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {ev.actor}
                            {ev.resource ? ` · ${ev.resource}` : ""}
                            {ev.ip_address ? ` · ${ev.ip_address}` : ""}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                        <Badge
                          variant="outline"
                          className={`text-[10px] px-1.5 py-0 capitalize ${severityBadge(ev.severity)}`}
                        >
                          {ev.severity}
                        </Badge>
                        <span className="text-xs text-muted-foreground flex items-center gap-1 whitespace-nowrap">
                          <Clock className="h-3 w-3" />
                          {formatTime(ev.created_at)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
