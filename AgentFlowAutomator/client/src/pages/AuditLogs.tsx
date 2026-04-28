import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Download, Filter, Loader2, RefreshCw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
import { useEffect, useState, useCallback } from "react";
import API_URL from "../config";

interface AuditEvent {
  id: number;
  event_type: string;
  action: string;
  resource: string;
  resource_id: string;
  actor: string;
  severity: string;
  status: string;
  ip_address: string;
  created_at: string;
  metadata: Record<string, any>;
}

function authHeaders(): Record<string, string> {
  const t = localStorage.getItem("agentflow_token");
  return t ? { Authorization: `Bearer ${t}` } : {};
}

function severityBadgeClass(s: string) {
  switch (s) {
    case "critical":
      return "text-red-600 border-red-200 bg-red-50";
    case "warning":
      return "text-amber-600 border-amber-200 bg-amber-50";
    case "success":
      return "text-green-600 border-green-200 bg-green-50";
    default:
      return "text-blue-600 border-blue-200 bg-blue-50";
  }
}

function statusBadgeClass(s: string) {
  const ok = s === "success" || s === "completed";
  return ok
    ? "text-green-600 border-green-200 bg-green-50"
    : "text-red-600 border-red-200 bg-red-50";
}

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return iso;
  }
}

const SEVERITY_OPTIONS = ["all", "info", "warning", "critical", "success"];
const EVENT_TYPE_OPTIONS = [
  "all",
  "user.login",
  "agent.create",
  "agent.update",
  "agent.delete",
  "agent.deploy",
  "agent.publish",
  "workflow.create",
  "workflow.activate",
  "workflow.deactivate",
  "credential.create",
  "credential.delete",
  "security.policy_update",
];

export default function AuditLogs() {
  const [logs, setLogs] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const PER_PAGE = 50;

  const [search, setSearch] = useState("");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [eventTypeFilter, setEventTypeFilter] = useState("all");

  const fetchLogs = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!opts?.silent) setLoading(true);
      else setRefreshing(true);
      try {
        const params = new URLSearchParams({
          page: String(page),
          per_page: String(PER_PAGE),
        });
        if (search.trim()) params.set("search", search.trim());
        if (severityFilter !== "all") params.set("severity", severityFilter);
        if (eventTypeFilter !== "all")
          params.set("event_type", eventTypeFilter);

        const res = await fetch(`${API_URL}/api/audit/events?${params}`, {
          headers: authHeaders(),
        });
        const data = await res.json();
        if (data.success) {
          setLogs(data.events || []);
          setTotal(data.total || 0);
        }
      } catch (err) {
        console.error("Audit fetch error:", err);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [page, search, severityFilter, eventTypeFilter],
  );

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [search, severityFilter, eventTypeFilter]);

  function handleExportCSV() {
    if (!logs.length) return;
    const headers = [
      "ID",
      "Time",
      "Event Type",
      "Action",
      "Resource",
      "Actor",
      "Severity",
      "Status",
      "IP",
    ];
    const rows = logs.map((l) => [
      l.id,
      formatTime(l.created_at),
      l.event_type,
      l.action,
      l.resource,
      l.actor,
      l.severity,
      l.status,
      l.ip_address,
    ]);
    const csv = [headers, ...rows]
      .map((r) =>
        r.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(","),
      )
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit_log_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const totalPages = Math.ceil(total / PER_PAGE);

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar />
      <main className="flex-1 main-content">
        <Header title="Audit Logs" />
        <div className="p-8 max-w-7xl mx-auto space-y-6">
          {/* Toolbar */}
          <div className="flex flex-col md:flex-row justify-between gap-3 items-start md:items-center">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by action, actor, or resource..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              {/* Severity filter */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2 h-9">
                    <Filter className="h-3.5 w-3.5" />
                    {severityFilter === "all" ? "Severity" : severityFilter}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {SEVERITY_OPTIONS.map((s) => (
                    <DropdownMenuItem
                      key={s}
                      onClick={() => setSeverityFilter(s)}
                      className="capitalize"
                    >
                      {s === "all" ? "All severities" : s}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Event type filter */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2 h-9">
                    <Filter className="h-3.5 w-3.5" />
                    {eventTypeFilter === "all" ? "Event Type" : eventTypeFilter}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {EVENT_TYPE_OPTIONS.map((t) => (
                    <DropdownMenuItem
                      key={t}
                      onClick={() => setEventTypeFilter(t)}
                    >
                      {t === "all" ? "All types" : t}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                variant="outline"
                size="sm"
                className="gap-2 h-9"
                onClick={handleExportCSV}
                disabled={!logs.length}
              >
                <Download className="h-3.5 w-3.5" /> Export CSV
              </Button>

              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9"
                onClick={() => fetchLogs({ silent: true })}
                disabled={refreshing}
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`}
                />
              </Button>

              <div className="flex items-center gap-2 px-3 py-2 bg-muted/40 rounded-md border border-muted text-sm">
                <span className="text-muted-foreground text-xs">Total:</span>
                <span className="font-semibold">{total.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Table */}
          <Card className="border-muted/60 shadow-sm">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[160px]">Time</TableHead>
                  <TableHead>Event Type</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Actor</TableHead>
                  <TableHead>Resource</TableHead>
                  <TableHead className="w-[90px]">Severity</TableHead>
                  <TableHead className="w-[90px]">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ) : logs.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center text-muted-foreground py-12"
                    >
                      No audit events found.
                      {(search ||
                        severityFilter !== "all" ||
                        eventTypeFilter !== "all") && (
                        <Button
                          variant="link"
                          className="ml-2 h-auto p-0 text-sm"
                          onClick={() => {
                            setSearch("");
                            setSeverityFilter("all");
                            setEventTypeFilter("all");
                          }}
                        >
                          Clear filters
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log) => (
                    <TableRow key={log.id} className="hover:bg-muted/30">
                      <TableCell className="text-muted-foreground font-mono text-xs whitespace-nowrap">
                        {formatTime(log.created_at)}
                      </TableCell>
                      <TableCell>
                        <code className="text-[11px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                          {log.event_type}
                        </code>
                      </TableCell>
                      <TableCell className="font-medium text-sm max-w-[240px] truncate">
                        {log.action}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[140px] truncate">
                        {log.actor}
                        {log.ip_address && (
                          <span className="block text-[10px] text-muted-foreground/70">
                            {log.ip_address}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[160px] truncate">
                        {log.resource || "—"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-[10px] capitalize px-1.5 py-0 ${severityBadgeClass(log.severity)}`}
                        >
                          {log.severity}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-[10px] capitalize px-1.5 py-0 ${statusBadgeClass(log.status)}`}
                        >
                          {log.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>
                Page {page} of {totalPages} ({total.toLocaleString()} events)
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
