import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Search,
  Filter,
  MoreVertical,
  Play,
  Pause,
  Network,
} from "lucide-react";
import API_URL from "../config";
const API_BASE_URL = API_URL;

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { Input } from "@/components/ui/input";
import { Link } from "wouter";
import { useState, useEffect } from "react";

import WorkflowBuilder from "./WorkflowBuilder";

interface Workflow {
  id: string;
  name: string;
  active: boolean;
  description: string;
  runs: number;
  successRate: string;
  lastRun: string;
  status: "Active" | "Inactive";
  createdAt: string;
  updatedAt: string;
}

export default function Workflows() {
  const [workflowList, setWorkflowList] = useState<Workflow[]>([]);
  const [statusFilter, setStatusFilter] = useState<
    "All" | "Active" | "Inactive"
  >("All");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchWorkflows = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/n8n/workflows`);
        const data = await response.json();

        const workflowsArray = Array.isArray(data)
          ? data
          : data.workflows || data.data || [];

        const formattedData = workflowsArray.map((wf: any) => ({
          ...wf,
          id: wf.id || wf.workflowId,
          status: wf.active ? "Active" : "Inactive",
          description: wf.description || "n8n Workflow",
          runs: wf.runs || 0,
          successRate: wf.successRate || "100%",
          lastRun: wf.lastRun || "Recently",
        }));

        setWorkflowList(formattedData);
      } catch (error) {
        console.error("Fetch error:", error);
      }
    };
    fetchWorkflows();
  }, []);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState<any>(null);

  const handleViewWorkflow = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/n8n/workflows/${id}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const workflow = data.workflow || data;
      setSelectedWorkflow(workflow);
      setDrawerOpen(true);
    } catch (err) {
      console.error("Error:", err);
      alert(`Failed to load workflow: ${err}`);
    }
  };

  const handleDeleteWorkflow = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this workflow?"))
      return;
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/n8n/delete-workflow/${id}`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
        },
      );
      if (response.ok) {
        setWorkflowList(workflowList.filter((wf) => wf.id !== id));
        alert("Workflow deleted successfully");
      } else {
        alert("Failed to delete workflow");
      }
    } catch (error) {
      console.error("Delete error:", error);
      alert("Error deleting workflow");
    }
  };

  const handleRegenerateWorkflow = (id: string) => {
    console.log("Regenerate workflow:", id);
  };

  const filteredWorkflows = workflowList.filter((wf) => {
    const matchesStatus =
      statusFilter === "All" ? true : wf.status === statusFilter;
    const matchesSearch = wf.name
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="min-h-screen flex">
      <Sidebar />
      <main className="main-content flex-1">
        <Header title="Workflows" />
        <div className="p-6 max-w-6xl mx-auto space-y-6">
          {/* Toolbar */}
          <div className="flex flex-col md:flex-row justify-between gap-4 items-center">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search workflows..."
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-3 w-full md:w-auto">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <Filter className="h-4 w-4" /> Filter
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => setStatusFilter("All")}>
                    All
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter("Active")}>
                    Active
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter("Inactive")}>
                    Inactive
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Link href="/workflows/new">
                <Button className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold">
                  <Plus className="h-4 w-4" /> Create Workflow
                </Button>
              </Link>
            </div>
          </div>

          {/* Pastel Workflow Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-6 lg:gap-x-6 lg:gap-y-8">
            {filteredWorkflows.map((workflow) => (
              <Card
                key={workflow.id}
                className={`overflow-hidden flex flex-col h-full shadow-sm border transition-all hover:shadow-md ${
                  workflow.status === "Active"
                    ? "bg-sky-100 border-sky-400"
                    : "bg-sky-50 border-sky-100"
                }`}
              >
                <CardContent className="p-5 flex flex-col h-full">
                  {/* Header: icon, name, description */}
                  <div className="flex items-start gap-3 mb-4">
                    <div
                      className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${
                        workflow.status === "Active"
                          ? "bg-sky-200 text-sky-800"
                          : "bg-sky-100 text-sky-700"
                      }`}
                    >
                      <Network className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-base text-sky-900 truncate">
                        {workflow.name}
                      </h3>
                      <p className="text-xs text-sky-700 line-clamp-2 mt-0.5">
                        {workflow.description}
                      </p>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-2 mb-4 text-center">
                    <div>
                      <p className="text-xs text-sky-600 uppercase tracking-wider">
                        Runs
                      </p>
                      <p className="font-semibold text-sm">
                        {workflow.runs.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-sky-600 uppercase tracking-wider">
                        Success
                      </p>
                      {/* success rate colour stays green for readability */}
                      <p className="font-semibold text-sm text-green-600">
                        {workflow.successRate}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-sky-600 uppercase tracking-wider">
                        Last Run
                      </p>
                      <p className="font-semibold text-sm">
                        {workflow.lastRun}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between border-t border-sky-200/60 pt-3 mt-auto">
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        {workflow.status === "Active" ? (
                          <Pause className="h-4 w-4" />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => handleViewWorkflow(workflow.id)}
                          >
                            View Workflow
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              handleRegenerateWorkflow(workflow.id)
                            }
                          >
                            Regenerate
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDeleteWorkflow(workflow.id)}
                            className="text-red-600"
                          >
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <span
                      className={`text-xs font-medium px-2 py-1 rounded-full ${
                        workflow.status === "Active"
                          ? "bg-sky-300 text-sky-900"
                          : "bg-sky-200 text-sky-800"
                      }`}
                    >
                      {workflow.status}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Workflow Viewer Modal */}
          {drawerOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
              <div
                className="relative bg-white rounded-xl shadow-2xl w-[80vw] mx-auto"
                style={{ minHeight: "80vh", maxHeight: "90vh" }}
              >
                <div className="flex justify-between items-center p-6 border-b sticky top-0 bg-white">
                  <h2 className="font-bold text-xl">Workflow Viewer</h2>
                  <Button variant="ghost" onClick={() => setDrawerOpen(false)}>
                    Close
                  </Button>
                </div>
                <div
                  className="p-6 overflow-auto"
                  style={{ height: "calc(90vh - 80px)" }}
                >
                  {selectedWorkflow && (
                    <WorkflowBuilder
                      initialWorkflow={selectedWorkflow}
                      readOnly={true}
                    />
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
