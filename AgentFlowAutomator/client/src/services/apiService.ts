// API Service for fetching dashboard data
const API_BASE_URL = "/api";

// Types
interface Stat {
  label: string;
  value: string | number;
  change: string;
  bg: string;
  icon: any;
  color: string;
}

interface Model {
  name: string;
  status: "Compliant" | "Non-Compliant";
}

// Unified RecentActivity type for dashboard and service
export interface RecentActivity {
  id: string;
  type: "execution" | "creation" | "security";
  title: string;
  time: string;
}

interface ComplianceItem {
  label: string;
  status: string;
  color: string;
}

// Mock data for fallback
const mockStats: Stat[] = [
  {
    label: "Total Workflows",
    value: 12,
    change: "+2 this week",
    bg: "bg-blue-100",
    icon: "Workflow",
    color: "text-blue-600",
  },
  {
    label: "Active Executions",
    value: 8,
    change: "+1 today",
    bg: "bg-green-100",
    icon: "Activity",
    color: "text-green-600",
  },
  {
    label: "Success Rate",
    value: "98.5%",
    change: "+0.5% improvement",
    bg: "bg-purple-100",
    icon: "TrendingUp",
    color: "text-purple-600",
  },
  {
    label: "Models",
    value: 5,
    change: "All compliant",
    bg: "bg-orange-100",
    icon: "Cpu",
    color: "text-orange-600",
  },
];

const mockModels: Model[] = [
  { name: "GPT-4", status: "Compliant" },
  { name: "Claude", status: "Compliant" },
  { name: "Llama 2", status: "Compliant" },
  { name: "Mistral", status: "Compliant" },
  { name: "PaLM", status: "Non-Compliant" },
];

// Remove mockRecentActivity, only use real n8n data

const mockComplianceItems: ComplianceItem[] = [
  { label: "Data Privacy", status: "Verified", color: "text-green-600" },
  { label: "Fair Use", status: "Verified", color: "text-green-600" },
  { label: "Output Safety", status: "Monitored", color: "text-amber-600" },
  {
    label: "Bias Detection",
    status: "Enabled",
    color: "text-green-600",
  },
];

// API Functions
export async function fetchStats(): Promise<Stat[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/stats`);
    if (!response.ok) {
      console.warn("Failed to fetch stats from API, using mock data");
      return mockStats;
    }
    return await response.json();
  } catch (error) {
    console.warn("Error fetching stats:", error);
    return mockStats;
  }
}

export async function fetchModels(): Promise<Model[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/models`);
    if (!response.ok) {
      console.warn("Failed to fetch models from API, using mock data");
      return mockModels;
    }
    return await response.json();
  } catch (error) {
    console.warn("Error fetching models:", error);
    return mockModels;
  }
}

// Fetch from n8n executions endpoint
export async function fetchRecentActivity(): Promise<RecentActivity[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/n8n/executions`);
    if (!response.ok) {
      throw new Error("Failed to fetch activity from backend");
    }
    const data = await response.json();
    // Map n8n executions to RecentActivity type
    return (data.data || []).map((exec: any) => ({
      id: exec.id?.toString() || Math.random().toString(),
      type: "execution",
      title: exec.workflowName ? `Workflow '${exec.workflowName}' executed` : "Workflow executed",
      time: exec.startedAt ? new Date(exec.startedAt).toLocaleString() : "Unknown time",
    }));
  } catch (error) {
    console.warn("Error fetching recent activity from backend:", error);
    return [];
  }
}

export async function fetchComplianceItems(): Promise<ComplianceItem[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/compliance`);
    if (!response.ok) {
      console.warn(
        "Failed to fetch compliance items from API, using mock data"
      );
      return mockComplianceItems;
    }
    return await response.json();
  } catch (error) {
    console.warn("Error fetching compliance items:", error);
    return mockComplianceItems;
  }
}

// Fetch n8n dashboard stats directly from n8n instance
export async function fetchN8nStats(): Promise<Stat[]> {
  const N8N_BASE_URL = "https://n8n-1-123-5-kjot.onrender.com/api/v1";
  try {
    // Fetch workflows
    const workflowsRes = await fetch(`${N8N_BASE_URL}/workflows`);
    const workflowsData = await workflowsRes.json();
    const totalWorkflows = Array.isArray(workflowsData.data)
      ? workflowsData.data.length
      : (workflowsData.length || 0);

    // Fetch executions (success, error, active)
    const [successRes, errorRes, activeRes] = await Promise.all([
      fetch(`${N8N_BASE_URL}/executions?status=success`),
      fetch(`${N8N_BASE_URL}/executions?status=error`),
      fetch(`${N8N_BASE_URL}/executions?status=active`),
    ]);
    const successData = await successRes.json();
    const errorData = await errorRes.json();
    const activeData = await activeRes.json();
    const totalSuccess = successData.data?.length || 0;
    const totalError = errorData.data?.length || 0;
    const totalActive = activeData.data?.length || 0;
    const totalExecutions = totalSuccess + totalError;
    const successRate = totalExecutions > 0 ? `${((totalSuccess / totalExecutions) * 100).toFixed(1)}%` : "0%";

    // Models: n8n does not have models, so show 0 or custom logic
    const modelsCount = 0;

    return [
      {
        label: "Total Workflows",
        value: totalWorkflows,
        change: "",
        bg: "bg-blue-100",
        icon: "Workflow",
        color: "text-blue-600",
      },
      {
        label: "Active Executions",
        value: totalActive,
        change: "",
        bg: "bg-green-100",
        icon: "Activity",
        color: "text-green-600",
      },
      {
        label: "Success Rate",
        value: successRate,
        change: "",
        bg: "bg-purple-100",
        icon: "TrendingUp",
        color: "text-purple-600",
      },
      {
        label: "Models",
        value: modelsCount,
        change: "No models found",
        bg: "bg-orange-100",
        icon: "Cpu",
        color: "text-orange-600",
      },
    ];
  } catch (error) {
    console.warn("Error fetching n8n stats:", error);
    return mockStats;
  }
}
