import { useState, useEffect, useRef } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Search,
  Upload,
  FileText,
  Database,
  HardDrive,
  Trash2,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import API_URL from "../config";

interface KBDocument {
  doc_id: string;
  filename: string;
  file_size_bytes: number;
  characters: number;
  uploaded_at: number;
  chunks: number;
}

interface Stats {
  total_documents: number;
  total_chunks: number;
  storage_used: string;
}

function getToken() {
  return localStorage.getItem("agentflow_token");
}

function authHeaders(): Record<string, string> {
  const t = getToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
}

function formatBytes(bytes: number): string {
  if (!bytes) return "—";
  if (bytes >= 1_073_741_824) return `${(bytes / 1_073_741_824).toFixed(1)} GB`;
  if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

function formatDate(ts: number): string {
  if (!ts) return "—";
  return new Date(ts * 1000).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function fileExt(filename: string): string {
  return filename.includes(".")
    ? filename.split(".").pop()!.toUpperCase()
    : "FILE";
}

export default function KnowledgeBase() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [documents, setDocuments] = useState<KBDocument[]>([]);
  const [stats, setStats] = useState<Stats>({
    total_documents: 0,
    total_chunks: 0,
    storage_used: "0 B",
  });
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchAll();
  }, []);

  async function fetchAll() {
    setLoading(true);
    try {
      const [docsRes, statsRes] = await Promise.all([
        fetch(`${API_URL}/api/chat/documents`, { headers: authHeaders() }),
        fetch(`${API_URL}/api/chat/stats`, { headers: authHeaders() }),
      ]);
      const docsData = await docsRes.json();
      const statsData = await statsRes.json();
      if (docsData.success) setDocuments(docsData.documents || []);
      if (statsData.success)
        setStats({
          total_documents: statsData.total_documents,
          total_chunks: statsData.total_chunks,
          storage_used: statsData.storage_used,
        });
    } catch {
      toast({ title: "Failed to load knowledge base", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`${API_URL}/api/chat/upload`, {
        method: "POST",
        headers: authHeaders(),
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        toast({
          title: `"${file.name}" uploaded — ${data.chunks} chunks indexed`,
        });
        await fetchAll();
      } else {
        toast({ title: data.error || "Upload failed", variant: "destructive" });
      }
    } catch {
      toast({ title: "Upload error", variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleDelete(docId: string, filename: string) {
    setDeletingId(docId);
    try {
      const res = await fetch(`${API_URL}/api/chat/documents/${docId}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: `"${filename}" removed from knowledge base` });
        await fetchAll();
      } else {
        toast({ title: data.error || "Delete failed", variant: "destructive" });
      }
    } catch {
      toast({ title: "Delete error", variant: "destructive" });
    } finally {
      setDeletingId(null);
    }
  }

  const filtered = documents.filter((d) =>
    d.filename.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="min-h-screen flex">
      <Sidebar />

      <main className="main-content flex-1">
        <Header title="Knowledge Base" />

        <div className="p-8 max-w-7xl mx-auto space-y-8">
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardContent className="p-6 flex items-center gap-4">
                <div className="p-3 bg-sky-100 rounded-xl text-sky-600">
                  <FileText className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    Total Documents
                  </p>
                  <h3 className="text-2xl font-bold">
                    {loading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      stats.total_documents
                    )}
                  </h3>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 flex items-center gap-4">
                <div className="p-3 bg-emerald-100 rounded-xl text-emerald-600">
                  <Database className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Vector Chunks</p>
                  <h3 className="text-2xl font-bold">
                    {loading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      stats.total_chunks.toLocaleString()
                    )}
                  </h3>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 flex items-center gap-4">
                <div className="p-3 bg-violet-100 rounded-xl text-violet-600">
                  <HardDrive className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Storage Used</p>
                  <h3 className="text-2xl font-bold">
                    {loading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      stats.storage_used
                    )}
                  </h3>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Table */}
          <Card className="border-muted/60 shadow-sm">
            <div className="p-6 flex flex-col md:flex-row justify-between gap-4 items-center border-b">
              <div className="relative w-full md:w-96">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search documents..."
                  className="pl-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="flex gap-3 w-full md:w-auto">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchAll}
                  disabled={loading}
                >
                  <RefreshCw
                    className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
                  />
                  Refresh
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept=".pdf,.txt,.md,.csv,.json,.docx"
                  onChange={handleUpload}
                />
                <Button
                  className="gap-2"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  {uploading ? "Uploading..." : "Upload File"}
                </Button>
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Chunks</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Uploaded</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center py-12 text-muted-foreground"
                    >
                      <FileText className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      {search
                        ? "No documents match your search."
                        : "No documents yet. Upload a file to get started."}
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((doc) => (
                    <TableRow key={doc.doc_id} className="group">
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-muted rounded text-muted-foreground">
                            <FileText className="h-4 w-4" />
                          </div>
                          <span className="truncate max-w-xs">
                            {doc.filename}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{fileExt(doc.filename)}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {doc.chunks}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatBytes(doc.file_size_bytes)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(doc.uploaded_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                          disabled={deletingId === doc.doc_id}
                          onClick={() => handleDelete(doc.doc_id, doc.filename)}
                        >
                          {deletingId === doc.doc_id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </div>
      </main>
    </div>
  );
}
