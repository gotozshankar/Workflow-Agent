import { Activity, Bot, CheckCircle2, Clock, LayoutDashboard, Network, Settings, Shield, Users, Workflow, Wrench, Globe, Database, Mail, MessageSquare, Code, FileText, Brain } from "lucide-react";

export const stats = [
  { label: "Active Workflows", value: "24", change: "+12%", icon: Workflow, color: "text-green-500", bg: "bg-green-50" },
  { label: "AI Models", value: "8", change: "3 new", icon: Bot, color: "text-blue-500", bg: "bg-blue-50" },
  { label: "Compliance Score", value: "98%", change: "Excellent", icon: Shield, color: "text-purple-500", bg: "bg-purple-50" },
  { label: "Tasks Processed", value: "12.4K", change: "+28%", icon: Activity, color: "text-orange-500", bg: "bg-orange-50" },
];

export const models = [
  { name: "GPT-4", status: "Compliant", type: "LLM", provider: "OpenAI", version: "4.0-turbo", context: "128k" },
  { name: "Claude 3 Opus", status: "Compliant", type: "LLM", provider: "Anthropic", version: "3.0", context: "200k" },
  { name: "UX Pilot-3", status: "Compliant", type: "Custom", provider: "Internal", version: "3.2.1", context: "32k" },
  { name: "Custom Model", status: "Review", type: "Internal", provider: "Internal", version: "1.0-alpha", context: "8k" },
  { name: "Mistral Large", status: "Compliant", type: "LLM", provider: "Mistral", version: "Latest", context: "32k" },
];

export const recentActivity = [
  { id: 1, title: "Customer Support Workflow executed", time: "2 minutes ago", type: "execution" },
  { id: 2, title: "New RAG agent created", time: "15 minutes ago", type: "creation" },
  { id: 3, title: "Compliance check completed", time: "1 hour ago", type: "system" },
];

export const navigation = [
  { name: "Dashboard", icon: LayoutDashboard, path: "/" },
  { name: "Workflows", icon: Network, path: "/workflows" },
  { name: "AI Agents", icon: Bot, path: "/agents" },
  { name: "Tools & Integrations", icon: Wrench, path: "/tools" },
  { name: "Knowledge Base", icon: Database, path: "/knowledge" },
  { name: "Chat", icon: MessageSquare, path: "/chat" },
];

export const complianceItems = [
  { label: "Bias Detection", status: "Active", color: "text-green-600" },
  { label: "Data Privacy", status: "Enforced", color: "text-green-600" },
  { label: "Transparency", status: "High", color: "text-green-600" },
  { label: "Accountability", status: "Tracked", color: "text-green-600" },
];

export const tools = [
  { 
    id: 1, 
    name: "Web Browser", 
    description: "Allows agents to search the internet and extract content from webpages.", 
    icon: Globe, 
    category: "Research",
    status: "Connected"
  },
  { 
    id: 2, 
    name: "PostgreSQL Connector", 
    description: "Read and write access to production databases with read-only safety modes.", 
    icon: Database, 
    category: "Data",
    status: "Connected"
  },
  { 
    id: 3, 
    name: "Gmail API", 
    description: "Send and receive emails, manage labels and filters automatically.", 
    icon: Mail, 
    category: "Communication",
    status: "Connected"
  },
  { 
    id: 4, 
    name: "Slack Bot", 
    description: "Post messages to channels and reply to direct mentions.", 
    icon: MessageSquare, 
    category: "Communication",
    status: "Disconnected"
  },
  { 
    id: 5, 
    name: "Code Interpreter", 
    description: "Execute Python code in a sandboxed environment for data analysis.", 
    icon: Code, 
    category: "Utility",
    status: "Connected"
  }
];

export const workflows = [
  {
    id: 1,
    name: "Customer Support Triager",
    description: "Analyzes incoming emails, tags them by intent, and drafts replies for human review.",
    status: "Active",
    runs: 1245,
    successRate: "98.5%",
    lastRun: "2 mins ago",
    steps: 5
  },
  {
    id: 2,
    name: "Daily News Digest",
    description: "Scrapes tech news sites, summarizes top stories, and posts to Slack channel.",
    status: "Active",
    runs: 89,
    successRate: "100%",
    lastRun: "4 hours ago",
    steps: 3
  },
  {
    id: 3,
    name: "Lead Qualification",
    description: "Enriches CRM leads with public company data and scores them based on ICP fit.",
    status: "Paused",
    runs: 450,
    successRate: "92%",
    lastRun: "2 days ago",
    steps: 6
  },
  {
    id: 4,
    name: "Invoice Processing",
    description: "Extracts data from PDF invoices and syncs with accounting software.",
    status: "Active",
    runs: 2300,
    successRate: "99.1%",
    lastRun: "10 mins ago",
    steps: 4
  }
];

export const agents = [
  {
    id: 1,
    name: "Support Specialist",
    role: "Customer Service",
    model: "GPT-4",
    status: "Online",
    capabilities: ["Email", "Knowledge Base", "Sentiment Analysis"],
    avatar: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?ixlib=rb-4.0.3&auto=format&fit=crop&w=2550&q=80"
  },
  {
    id: 2,
    name: "Data Analyst",
    role: "Analytics",
    model: "Code Interpreter",
    status: "Busy",
    capabilities: ["Python", "SQL", "Charting"],
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=2550&q=80"
  },
  {
    id: 3,
    name: "Research Assistant",
    role: "Research",
    model: "Claude 3 Opus",
    status: "Idle",
    capabilities: ["Web Search", "Summarization", "Report Writing"],
    avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?ixlib=rb-4.0.3&auto=format&fit=crop&w=2550&q=80"
  }
];

export const documents = [
  { id: 1, name: "Product Documentation.pdf", type: "PDF", size: "2.4 MB", uploaded: "2 days ago" },
  { id: 2, name: "Customer Support Guidelines.docx", type: "DOCX", size: "1.1 MB", uploaded: "1 week ago" },
  { id: 3, name: "API Reference", type: "URL", size: "N/A", uploaded: "2 weeks ago" },
  { id: 4, name: "Company Wiki", type: "Notion", size: "N/A", uploaded: "1 month ago" },
  { id: 5, name: "Q3 Financial Report.xlsx", type: "Excel", size: "4.5 MB", uploaded: "3 days ago" },
];

export const auditLogs = [
  { id: 1, action: "Workflow Modified", user: "Sarah Chen", resource: "Customer Support Triager", time: "10 mins ago", status: "Success" },
  { id: 2, action: "API Key Rotated", user: "System", resource: "OpenAI Integration", time: "1 hour ago", status: "Success" },
  { id: 3, action: "Agent Created", user: "Mike Ross", resource: "Sales Assistant", time: "3 hours ago", status: "Success" },
  { id: 4, action: "Compliance Alert", user: "System", resource: "PII Detection", time: "5 hours ago", status: "Warning" },
  { id: 5, action: "Model Updated", user: "Sarah Chen", resource: "UX Pilot-3", time: "1 day ago", status: "Success" },
];
