import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Upload,
  FileText,
  Trash2,
  Send,
  Bot,
  User,
  Loader2,
  MessageSquare,
  X,
  LogIn,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import API_URL from "../config";

interface ChatDocument {
  doc_id: string;
  filename: string;
  chunks: number;
  file_hash: string;
}

interface Message {
  role: "user" | "assistant";
  content: string;
}

function getStoredToken(): string | null {
  return localStorage.getItem("agentflow_token");
}

function authHeaders(): Record<string, string> {
  const t = getStoredToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
}

export default function Chat() {
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const [documents, setDocuments] = useState<ChatDocument[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isLoading) return;
    if (!getStoredToken()) {
      navigate("/login");
      return;
    }
    fetchDocuments();
  }, [isLoading]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function fetchDocuments() {
    setLoadingDocs(true);
    try {
      const res = await fetch(`${API_URL}/api/chat/documents`, {
        headers: authHeaders(),
      });
      const data = await res.json();
      if (data.success) setDocuments(data.documents || []);
      else
        toast({
          title: data.error || "Failed to load documents",
          variant: "destructive",
        });
    } catch {
      toast({ title: "Failed to load documents", variant: "destructive" });
    } finally {
      setLoadingDocs(false);
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
        toast({ title: `"${file.name}" uploaded (${data.chunks} chunks)` });
        await fetchDocuments();
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
    try {
      const res = await fetch(`${API_URL}/api/chat/documents/${docId}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: `"${filename}" removed` });
        setDocuments((prev) => prev.filter((d) => d.doc_id !== docId));
        setSelectedDocIds((prev) => prev.filter((id) => id !== docId));
      } else {
        toast({ title: data.error || "Delete failed", variant: "destructive" });
      }
    } catch {
      toast({ title: "Delete error", variant: "destructive" });
    }
  }

  function toggleDocSelection(docId: string) {
    setSelectedDocIds((prev) =>
      prev.includes(docId)
        ? prev.filter((id) => id !== docId)
        : [...prev, docId],
    );
  }

  async function handleAsk(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    const q = question.trim();
    if (!q || documents.length === 0) return;
    setMessages((prev) => [...prev, { role: "user", content: q }]);
    setQuestion("");
    setAsking(true);
    try {
      const body: Record<string, unknown> = { question: q };
      if (selectedDocIds.length > 0) body.doc_ids = selectedDocIds;
      const res = await fetch(`${API_URL}/api/chat/query`, {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.answer },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `Error: ${data.error || "Unknown error"}`,
          },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Failed to get response. Please try again.",
        },
      ]);
    } finally {
      setAsking(false);
    }
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex">
        <Sidebar />
        <main className="main-content flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </main>
      </div>
    );
  }

  // Not logged in
  if (!user || !getStoredToken()) {
    return (
      <div className="min-h-screen flex">
        <Sidebar />
        <main className="main-content flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <LogIn className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">Please log in to use Chat.</p>
            <Button onClick={() => navigate("/login")}>Go to Login</Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      <Sidebar />

      <main className="main-content flex-1">
        <Header title="Chat with Documents" />

        <div className="p-6 max-w-7xl mx-auto flex gap-6 h-[calc(100vh-80px)]">
          {/* Left panel — Documents */}
          {/* <div className="w-80 flex-shrink-0 flex flex-col gap-4">
            <Card className="flex-shrink-0">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Documents
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept=".pdf,.txt,.md,.csv,.json,.docx"
                  onChange={handleUpload}
                />
                <Button
                  className="w-full"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4 mr-2" />
                  )}
                  {uploading ? "Uploading..." : "Add Document"}
                </Button>
                <p className="text-xs text-muted-foreground">
                  Supports: PDF, TXT, MD, CSV, JSON, DOCX
                </p>
              </CardContent>
            </Card>

            <Card className="flex-1 overflow-hidden flex flex-col">
              <CardContent className="p-3 flex-1 overflow-y-auto space-y-2">
                {loadingDocs ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : documents.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    <FileText className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    No documents yet.
                    <br />
                    Upload one to start chatting.
                  </div>
                ) : (
                  documents.map((doc) => {
                    const selected = selectedDocIds.includes(doc.doc_id);
                    return (
                      <div
                        key={doc.doc_id}
                        onClick={() => toggleDocSelection(doc.doc_id)}
                        className={`flex items-start gap-2 p-2 rounded-lg cursor-pointer border transition-colors ${
                          selected
                            ? "border-primary bg-primary/5"
                            : "border-transparent hover:bg-accent"
                        }`}
                      >
                        <FileText className="h-4 w-4 mt-0.5 flex-shrink-0 text-blue-500" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {doc.filename}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {doc.chunks} chunks
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 flex-shrink-0 text-muted-foreground hover:text-destructive"
                          onClick={(ev) => {
                            ev.stopPropagation();
                            handleDelete(doc.doc_id, doc.filename);
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    );
                  })
                )}
              </CardContent>
              {documents.length > 0 && (
                <div className="px-3 pb-3">
                  <p className="text-xs text-muted-foreground">
                    {selectedDocIds.length > 0
                      ? `${selectedDocIds.length} selected — chat restricted to selection`
                      : "Click docs to filter. All docs used if none selected."}
                  </p>
                </div>
              )}
            </Card>
          </div> */}

          {/* Right panel — Chat */}
          <Card className="flex-1 flex flex-col overflow-hidden">
            <CardHeader className="pb-3 flex-shrink-0 flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Chat
                {selectedDocIds.length > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {selectedDocIds.length} doc
                    {selectedDocIds.length > 1 ? "s" : ""} selected
                  </Badge>
                )}
              </CardTitle>
              {messages.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setMessages([])}
                  className="h-7 text-xs"
                >
                  <X className="h-3 w-3 mr-1" />
                  Clear
                </Button>
              )}
            </CardHeader>

            <CardContent className="flex-1 overflow-y-auto space-y-4 px-4 pb-4">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground text-sm gap-3">
                  <Bot className="h-12 w-12 opacity-30" />
                  <p className="text-center max-w-xs">
                    Upload documents on the Knowledge Base, then ask questions
                    about their content here.
                  </p>
                </div>
              ) : (
                messages.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    {msg.role === "assistant" && (
                      <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Bot className="h-4 w-4 text-primary" />
                      </div>
                    )}
                    <div
                      className={`max-w-[75%] rounded-xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-foreground"
                      }`}
                    >
                      {msg.content}
                    </div>
                    {msg.role === "user" && (
                      <div className="h-7 w-7 rounded-full bg-secondary flex items-center justify-center flex-shrink-0 mt-0.5">
                        <User className="h-4 w-4" />
                      </div>
                    )}
                  </div>
                ))
              )}
              {asking && (
                <div className="flex gap-3 justify-start">
                  <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                  <div className="bg-muted rounded-xl px-4 py-3">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </CardContent>

            <div className="px-4 pb-4 flex-shrink-0">
              <form onSubmit={handleAsk} className="flex gap-2">
                <Input
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder={
                    documents.length === 0
                      ? "Upload a document first..."
                      : "Ask a question about your documents..."
                  }
                  disabled={documents.length === 0 || asking}
                  className="flex-1"
                />
                <Button
                  type="submit"
                  disabled={
                    !question.trim() || documents.length === 0 || asking
                  }
                >
                  {asking ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </form>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}
