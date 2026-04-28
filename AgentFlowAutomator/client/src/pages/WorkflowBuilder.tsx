import { useState, useRef, useEffect, useCallback } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import API_URL from "../config";
const API_BASE_URL = API_URL;
import {
  Sparkles,
  Bot,
  RefreshCw,
  Check,
  Loader2,
  Code,
  Database,
  Globe,
  Mail,
  Users,
  Play,
  Zap,
  ArrowRight,
  Download,
  Upload,
  Maximize,
  Copy,
  Plus,
  Minus,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";

// --- Node Graph Types ---

type Node = {
  id: string;
  type: "trigger" | "action" | "condition";
  label: string;
  icon: any;
  x: number;
  y: number;
  description: string;
};

type Edge = {
  id: string;
  source: string;
  target: string;
};

import { Brain } from "lucide-react";

// --- Node Component (n8n style) ---

const NodeView = ({
  node,
  delay,
  onMouseDown,
  onConfigClick,
}: {
  node: Node;
  delay: number;
  onMouseDown: (e: React.MouseEvent, nodeId: string) => void;
  onConfigClick?: (nodeId: string) => void;
}) => {
  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay, type: "spring", stiffness: 200, damping: 20 }}
      className="absolute w-64 group cursor-move select-none"
      style={{ left: node.x, top: node.y }}
      onMouseDown={(e) => onMouseDown(e, node.id)}
    >
      {/* Connection Points */}
      {node.type !== "trigger" && (
        <div className="absolute -left-1.5 top-8 w-3 h-3 bg-muted-foreground rounded-full border-2 border-background z-10" />
      )}
      <div className="absolute -right-1.5 top-8 w-3 h-3 bg-muted-foreground rounded-full border-2 border-background z-10 group-hover:bg-primary transition-colors" />

      {/* Card Content */}
      <div
        className={`
        bg-card border rounded-xl shadow-sm hover:shadow-lg hover:border-primary/50 transition-all duration-200 overflow-hidden
        ${node.type === "trigger" ? "border-l-4 border-l-emerald-400" : ""}
        ${node.type === "condition" ? "border-l-4 border-l-amber-400" : ""}
        ${node.type === "action" ? "border-l-4 border-l-sky-400" : ""}
      `}
      >
        <div className="p-3 flex items-start gap-3">
          <div
            className={`p-2 rounded-lg flex-shrink-0 
            ${node.type === "trigger" ? "bg-emerald-100 text-emerald-600" : ""}
            ${node.type === "condition" ? "bg-amber-100 text-amber-600" : ""}
            ${node.type === "action" ? "bg-sky-100 text-sky-600" : ""}
          `}
          >
            <node.icon className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-foreground leading-tight mb-1">
              {node.label}
            </h4>
            <p className="text-[10px] text-muted-foreground line-clamp-2 leading-relaxed">
              {node.description}
            </p>
          </div>
        </div>

        {/* Hover Actions – always show when onConfigClick is provided */}
        {onConfigClick && (
          <div className="h-8 bg-muted/30 flex items-center justify-between px-2 border-t opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="flex gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div>
              <span className="text-[10px] text-muted-foreground">Active</span>
            </div>
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6 hover:bg-primary/20"
              onClick={(e) => {
                e.stopPropagation();
                onConfigClick(node.id);
              }}
              title="Configure Node"
            >
              <Plus className="h-4 w-4 text-primary" />
            </Button>
          </div>
        )}
      </div>

      {/* Label for Type */}
      <div className="absolute -top-6 left-0 text-[10px] font-medium uppercase tracking-wider text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
        {node.type}
      </div>
    </motion.div>
  );
};

// --- Edge Component (Bezier Curve) ---

const ConnectionLine = ({
  edge,
  nodes,
  delay,
}: {
  edge: Edge;
  nodes: Node[];
  delay: number;
}) => {
  const sourceNode = nodes.find((n) => n.id === edge.source);
  const targetNode = nodes.find((n) => n.id === edge.target);

  if (!sourceNode || !targetNode) return null;

  // Connection points: source right side, target left side
  const startX = sourceNode.x + 256;
  const startY = sourceNode.y + 32;
  const endX = targetNode.x;
  const endY = targetNode.y + 32;

  // Bezier control points
  const controlPointX1 = startX + 50;
  const controlPointX2 = endX - 50;

  const path = `M ${startX} ${startY} C ${controlPointX1} ${startY}, ${controlPointX2} ${endY}, ${endX} ${endY}`;

  // Arrow head – curve ends horizontally, so arrow points right
  const arrowSize = 8;
  const angle = 0; // Fixed: tangent is horizontal

  const arrowX1 = endX - arrowSize * Math.cos(angle - Math.PI / 6);
  const arrowY1 = endY - arrowSize * Math.sin(angle - Math.PI / 6);
  const arrowX2 = endX - arrowSize * Math.cos(angle + Math.PI / 6);
  const arrowY2 = endY - arrowSize * Math.sin(angle + Math.PI / 6);

  return (
    <motion.svg
      className="absolute top-0 left-0 pointer-events-none"
      style={{
        width: "100%",
        height: "100%",
        overflow: "visible",
        position: "absolute",
        top: 0,
        left: 0,
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: delay + 0.1, duration: 0.4 }}
    >
      {/* Base solid line */}
      <path
        d={path}
        stroke="#64748b"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
      />
      {/* Animated primary color overlay */}
      <path
        d={path}
        stroke="hsl(var(--primary))"
        strokeWidth="2"
        fill="none"
        strokeDasharray="6 6"
        strokeLinecap="round"
        style={{ opacity: 0.6 }}
      />
      {/* Arrow head */}
      <polyline
        points={`${arrowX1},${arrowY1} ${endX},${endY} ${arrowX2},${arrowY2}`}
        stroke="#64748b"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </motion.svg>
  );
};

export default function WorkflowBuilder({
  initialWorkflow,
  readOnly = false,
}: {
  initialWorkflow?: any;
  readOnly?: boolean;
}) {
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [lastMouse, setLastMouse] = useState({ x: 0, y: 0 });
  const [draggedNode, setDraggedNode] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [n8nWorkflow, setN8nWorkflow] = useState<any>(null);
  const [selectedNodeConfig, setSelectedNodeConfig] = useState<string | null>(
    null,
  );

  // Fetch saved workflows (only in edit mode)
  useEffect(() => {
    if (readOnly) return;
    const fetchWorkflows = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/n8n/workflows`);
        const data = await res.json();
        setWorkflows(data);
        if (data.length > 0) setSelectedId(data[0].id);
      } catch (err) {
        console.error("Failed to load workflows", err);
      }
    };
    fetchWorkflows();
  }, [readOnly]);

  // Global mouse move/up listeners for smooth panning
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!isPanning) return;
      const dx = e.clientX - lastMouse.x;
      const dy = e.clientY - lastMouse.y;
      setPan((prev) => ({
        x: prev.x + dx,
        y: prev.y + dy,
      }));
      setLastMouse({ x: e.clientX, y: e.clientY });
    };
    const handleGlobalMouseUp = () => setIsPanning(false);
    if (isPanning) {
      document.addEventListener("mousemove", handleGlobalMouseMove);
      document.addEventListener("mouseup", handleGlobalMouseUp);
    }
    return () => {
      document.removeEventListener("mousemove", handleGlobalMouseMove);
      document.removeEventListener("mouseup", handleGlobalMouseUp);
    };
  }, [isPanning, lastMouse]);

  // Pan & Zoom Handlers
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    const zoomSpeed = 0.1;
    const newZoom = Math.max(
      0.5,
      Math.min(3, zoom - e.deltaY * zoomSpeed * 0.01),
    );
    setZoom(newZoom);
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button === 0 && !draggedNode) {
      e.preventDefault();
      setIsPanning(true);
      setLastMouse({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseUp = () => setDraggedNode(null);

  // Node dragging
  const handleNodeMouseDown = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    if (!canvasRef.current) return;
    setDraggedNode(nodeId);
    const node = nodes.find((n) => n.id === nodeId);
    if (node && canvasRef.current) {
      const canvasRect = canvasRef.current.getBoundingClientRect();
      const clientX = e.clientX - canvasRect.left;
      const clientY = e.clientY - canvasRect.top;
      const canvasX = (clientX - pan.x) / zoom;
      const canvasY = (clientY - pan.y) / zoom;
      setDragOffset({ x: canvasX - node.x, y: canvasY - node.y });
    }
  };

  useEffect(() => {
    const handleGlobalNodeDrag = (e: MouseEvent) => {
      if (!draggedNode || !canvasRef.current) return;
      const canvasRect = canvasRef.current.getBoundingClientRect();
      const clientX = e.clientX - canvasRect.left;
      const clientY = e.clientY - canvasRect.top;
      const canvasX = (clientX - pan.x) / zoom;
      const canvasY = (clientY - pan.y) / zoom;
      const newX = canvasX - dragOffset.x;
      const newY = canvasY - dragOffset.y;
      setNodes((prevNodes) =>
        prevNodes.map((n) =>
          n.id === draggedNode ? { ...n, x: newX, y: newY } : n,
        ),
      );
    };
    const handleGlobalMouseUp = () => setDraggedNode(null);
    if (draggedNode) {
      document.addEventListener("mousemove", handleGlobalNodeDrag);
      document.addEventListener("mouseup", handleGlobalMouseUp);
    }
    return () => {
      document.removeEventListener("mousemove", handleGlobalNodeDrag);
      document.removeEventListener("mouseup", handleGlobalMouseUp);
    };
  }, [draggedNode, dragOffset, pan, zoom]);

  // Fit to view
  const handleFitToView = () => {
    if (nodes.length === 0) return;
    const minX = Math.min(...nodes.map((n) => n.x));
    const maxX = Math.max(...nodes.map((n) => n.x + 256));
    const minY = Math.min(...nodes.map((n) => n.y));
    const maxY = Math.max(...nodes.map((n) => n.y + 120));
    const width = maxX - minX;
    const height = maxY - minY;
    if (canvasRef.current) {
      const canvasWidth = canvasRef.current.offsetWidth;
      const canvasHeight = canvasRef.current.offsetHeight;
      const scaleX = canvasWidth / (width + 100);
      const scaleY = canvasHeight / (height + 100);
      const newZoom = Math.min(scaleX, scaleY, 1);
      setZoom(newZoom);
      setPan({
        x: canvasWidth / 2 - (minX + width / 2) * newZoom,
        y: canvasHeight / 2 - (minY + height / 2) * newZoom,
      });
    }
  };

  const handleZoomIn = useCallback(() => {
    setZoom((prevZoom) => Math.min(3, prevZoom + 0.1));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((prevZoom) => Math.max(0.5, prevZoom - 0.1));
  }, []);

  // Node/edge creation utilities
  const addNode = (nodeData: any) => {
    const newNode: Node = {
      id: `node-${Date.now()}`,
      type: nodeData.type || "action",
      label: nodeData.label || "New Node",
      description: nodeData.description || "",
      icon: nodeData.icon || Bot,
      x: nodeData.x || 100,
      y: nodeData.y || 100,
    };
    setNodes([...nodes, newNode]);
  };

  const connectNodes = (sourceNodeId: string, targetNodeId: string) => {
    if (sourceNodeId === targetNodeId) return;
    const isDuplicate = edges.some(
      (e) => e.source === sourceNodeId && e.target === targetNodeId,
    );
    if (isDuplicate) return;
    const newEdge: Edge = {
      id: `edge-${sourceNodeId}-${targetNodeId}-${Date.now()}`,
      source: sourceNodeId,
      target: targetNodeId,
    };
    setEdges([...edges, newEdge]);
  };

  const deleteNode = (nodeId: string) => {
    setNodes(nodes.filter((n) => n.id !== nodeId));
    setEdges(edges.filter((e) => e.source !== nodeId && e.target !== nodeId));
  };

  // Position calculation for generated workflows
  const calculateNodePositions = (nodes: any[], connections: any) => {
    const nodePositions: Record<string, number[]> = {};
    const levels: Record<string, number> = {};
    const levelWidths: Record<number, number> = {};

    const startNode = nodes.find(
      (n) =>
        n.type?.includes("Trigger") ||
        n.type?.includes("trigger") ||
        n.type?.includes("Start"),
    );
    const startNodeName = startNode?.name || nodes[0]?.name;

    const queue = [startNodeName];
    levels[startNodeName] = 0;
    let maxLevel = 0;

    while (queue.length > 0) {
      const nodeName = queue.shift()!;
      const nodeConnections = connections[nodeName]?.main || [];
      const nextLevel = (levels[nodeName] || 0) + 1;
      nodeConnections.forEach((branch: any) => {
        if (Array.isArray(branch)) {
          branch.forEach((conn: any) => {
            const targetNode = conn.node;
            if (!levels[targetNode]) {
              levels[targetNode] = nextLevel;
              maxLevel = Math.max(maxLevel, nextLevel);
              queue.push(targetNode);
            }
          });
        }
      });
    }

    Object.entries(levels).forEach(([node, level]) => {
      levelWidths[level as any] = (levelWidths[level as any] || 0) + 1;
    });

    const levelCounts: Record<number, number> = {};
    nodes.forEach((node) => {
      const nodeName = node.name;
      const level = levels[nodeName] || 0;
      const positionInLevel = levelCounts[level] || 0;
      const width = levelWidths[level] || 1;
      const x = level * 400 + 100;
      const y = (positionInLevel - (width - 1) / 2) * 150 + 300;
      nodePositions[nodeName] = [x, y];
      levelCounts[level] = positionInLevel + 1;
    });

    return nodePositions;
  };

  const getNodePosition = (apiNode: any, index: number) => {
    let visualNode = nodes.find((n) => n.id === apiNode.id);
    if (!visualNode)
      visualNode = nodes.find(
        (n) =>
          n.label?.toLowerCase() ===
          (apiNode.name || apiNode.displayName)?.toLowerCase(),
      );
    if (!visualNode && index < nodes.length) visualNode = nodes[index];
    if (visualNode)
      return { x: Math.round(visualNode.x), y: Math.round(visualNode.y) };
    return { x: 200 + index * 350, y: 300 };
  };

  const rebuildWorkflowFromVisualState = () => {
    if (!n8nWorkflow || nodes.length === 0) return n8nWorkflow;
    const updatedNodes = (n8nWorkflow.nodes || []).map(
      (apiNode: any, index: number) => {
        const { x: finalX, y: finalY } = getNodePosition(apiNode, index);
        return {
          ...apiNode,
          position: [finalX, finalY],
          parameters: apiNode.parameters || {},
        };
      },
    );
    return { ...n8nWorkflow, nodes: updatedNodes };
  };

  const transformToN8NFormat = (workflow: any) => {
    if (!workflow) return null;
    const now = new Date().toISOString();
    const workflowId = workflow.id || `workflow_${Date.now()}`;
    const updatedNodes = (workflow.nodes || []).map(
      (node: any, index: number) => {
        const { x: finalX, y: finalY } = getNodePosition(node, index);
        return {
          ...node,
          position: [finalX, finalY],
          parameters: node.parameters || {},
        };
      },
    );
    return {
      id: workflowId,
      name: workflow.name || "Generated Workflow",
      nodes: updatedNodes,
      connections: workflow.connections || {},
      active: workflow.active !== undefined ? workflow.active : false,
      pinData: workflow.pinData || {},
      settings: workflow.settings || { executionOrder: "v1" },
      staticData: workflow.staticData || null,
      tags: workflow.tags || [],
      versionId: workflow.versionId || "1",
      createdAt: workflow.createdAt || now,
      updatedAt: now,
    };
  };

  // Export / save / import handlers (unchanged)
  const handleExportJSON = () => {
    if (!n8nWorkflow) {
      alert("❌ No workflow to export.");
      return;
    }
    try {
      const n8nExport = {
        name: n8nWorkflow.name || "AI Generated Flow",
        nodes: (n8nWorkflow.nodes || []).map((node: any, i: number) => {
          const { x: xPos, y: yPos } = getNodePosition(node, i);
          return {
            ...node,
            id:
              node.id || `node-${Math.random().toString(36).substring(2, 10)}`,
            position: [xPos, yPos],
          };
        }),
        connections: n8nWorkflow.connections || {},
        settings: n8nWorkflow.settings || { executionOrder: "v1" },
      };
      const dataStr = JSON.stringify(n8nExport, null, 2);
      const blob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const exportFileDefaultName = `${n8nExport.name.replace(/[^a-z0-9]/gi, "_").toLowerCase()}_${Date.now()}.json`;
      const linkElement = document.createElement("a");
      linkElement.href = url;
      linkElement.download = exportFileDefaultName;
      linkElement.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Export error:", error);
      alert("❌ Failed to export workflow");
    }
  };

  const handleCopyJSON = async () => {
    if (!n8nWorkflow) {
      alert("❌ No workflow to copy.");
      return;
    }
    const cleanWorkflow = {
      name: n8nWorkflow.name || "AI Generated Flow",
      nodes: (n8nWorkflow.nodes || []).map((node: any, i: number) => {
        const { x: xPos, y: yPos } = getNodePosition(node, i);
        return {
          ...node,
          id: node.id || `node-${Math.random().toString(36).substring(2, 10)}`,
          position: [xPos, yPos],
          parameters: node.parameters || {},
        };
      }),
      connections: n8nWorkflow.connections || {},
      settings: { executionOrder: "v1" },
    };
    const jsonStr = JSON.stringify(cleanWorkflow, null, 2);
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(jsonStr);
        alert("✅ Workflow JSON copied!");
        return;
      } catch (err1) {
        console.warn("Clipboard API failed:", err1);
      }
    }
    let textArea: HTMLTextAreaElement | null = null;
    try {
      textArea = document.createElement("textarea");
      textArea.value = jsonStr;
      textArea.style.position = "fixed";
      textArea.style.top = "-999999px";
      textArea.style.left = "-999999px";
      textArea.style.opacity = "0";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const copySucceeded = document.execCommand("copy");
      document.body.removeChild(textArea);
      if (copySucceeded) {
        alert("✅ Workflow JSON copied!");
        return;
      }
    } catch (err2) {
      console.error("Fallback copy failed:", err2);
      if (textArea && document.body.contains(textArea))
        document.body.removeChild(textArea);
    }
    alert("⚠️ Copy failed. Please use Export.");
  };

  const handleSaveWorkflow = async () => {
    const freshWorkflow = rebuildWorkflowFromVisualState();
    const n8nWorkflowFormat = transformToN8NFormat(freshWorkflow);
    if (!n8nWorkflowFormat) {
      alert("❌ No workflow to save.");
      return;
    }
    if (!n8nWorkflowFormat.nodes || n8nWorkflowFormat.nodes.length === 0) {
      alert("❌ No nodes in workflow!");
      return;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/api/save-workflow`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workflow: n8nWorkflowFormat,
          name: n8nWorkflowFormat.name,
        }),
      });
      const data = await res.json();
      if (!res.ok && res.status !== 206)
        throw new Error(data.error || `HTTP ${res.status}`);
      let successMsg = `✅ Workflow Saved!\n\nName: ${data.workflow_name}\n📊 Nodes: ${n8nWorkflowFormat.nodes.length}`;
      if (data.n8n_created) {
        successMsg += `\n✅ Created in N8N!\n🔗 N8N URL: ${data.n8n_url}\n\n📌 The workflow is now in your N8N dashboard.`;
      } else if (data.database_id) {
        successMsg += `\n⚠️ Saved to database but N8N creation failed.\n📝 Error: ${data.error || "Unknown"}\n\nDatabase ID: ${data.database_id}`;
      }
      alert(successMsg);
    } catch (err: any) {
      console.error("❌ Save failed:", err);
      alert(`⚠️ Save Failed:\n\n${err.message}`);
    }
  };

  const handleImportJSON = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = (e: any) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event: any) => {
        try {
          const data = JSON.parse(event.target.result);
          if (!data.nodes || !Array.isArray(data.nodes)) {
            alert("❌ Invalid JSON format.");
            return;
          }
          const mappedNodes = data.nodes.map((node: any, index: number) => {
            let nodeType: "trigger" | "action" | "condition" = "action";
            const typeStr = (node.type || "").toLowerCase();
            if (typeStr.includes("trigger") || typeStr.includes("start"))
              nodeType = "trigger";
            else if (typeStr.includes("if") || typeStr.includes("switch"))
              nodeType = "condition";
            let x = 100 + index * 300;
            let y = 150;
            if (Array.isArray(node.position) && node.position.length >= 2) {
              x = node.position[0];
              y = node.position[1];
            } else if (node.position && typeof node.position === "object") {
              x = node.position.x ?? x;
              y = node.position.y ?? y;
            }
            return {
              id: node.id || `node-${index}-${Date.now()}`,
              type: nodeType,
              label: node.name || `Node ${index + 1}`,
              description: node.description || typeStr,
              icon: Bot,
              x: Math.round(x),
              y: Math.round(y),
            };
          });
          const connections = data.connections || {};
          const mappedEdges: Edge[] = [];
          Object.entries(connections).forEach(
            ([sourceName, connData]: [string, any]) => {
              const sourceNode = mappedNodes.find(
                (n: any) => n.label === sourceName,
              );
              if (!sourceNode) return;
              Object.entries(connData).forEach(
                ([connType, branches]: [string, any]) => {
                  if (!Array.isArray(branches)) return;
                  branches.forEach((branch: any) => {
                    if (Array.isArray(branch)) {
                      branch.forEach((conn: any) => {
                        const targetNode = mappedNodes.find(
                          (n: any) => n.label === conn.node,
                        );
                        if (
                          targetNode &&
                          !mappedEdges.some(
                            (e: any) =>
                              e.source === sourceNode.id &&
                              e.target === targetNode.id,
                          )
                        ) {
                          mappedEdges.push({
                            id: `edge-${sourceNode.id}-${targetNode.id}-${connType}-${Math.random()}`,
                            source: sourceNode.id,
                            target: targetNode.id,
                          });
                        }
                      });
                    }
                  });
                },
              );
            },
          );
          if (mappedEdges.length === 0 && mappedNodes.length > 1) {
            mappedNodes.forEach((node: any, index: number) => {
              if (index < mappedNodes.length - 1) {
                mappedEdges.push({
                  id: `seq-edge-${node.id}-${mappedNodes[index + 1].id}`,
                  source: node.id,
                  target: mappedNodes[index + 1].id,
                });
              }
            });
          }
          setNodes(mappedNodes);
          setEdges(mappedEdges);
          setN8nWorkflow(data);
          setTimeout(() => handleFitToView(), 100);
          alert(`✅ Imported! ${mappedNodes.length} nodes loaded.`);
        } catch (err) {
          console.error("Import error:", err);
          alert("❌ Failed to parse JSON file.");
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    try {
      setIsGenerating(true);
      setNodes([]);
      setEdges([]);
      const res = await fetch(`${API_BASE_URL}/api/generate-workflow-new`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
        signal: AbortSignal.timeout(300000),
      });
      if (!res.ok) {
        const errorData = await res
          .json()
          .catch(() => ({ error: "Unknown error" }));
        throw new Error(errorData.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      if (!data.success || !data.workflow)
        throw new Error(data.error || "No workflow in response");
      setN8nWorkflow(data.workflow);
      const workflow = data.workflow;
      const iconMap: Record<string, any> = {
        Mail,
        Code,
        Database,
        Globe,
        Users,
        Zap,
        Bot,
      };
      const apiNodes = workflow.nodes || [];
      const connections = workflow.connections || {};
      const nodePositions = calculateNodePositions(apiNodes, connections);
      const mappedNodes: Node[] = apiNodes.map((node: any, index: number) => {
        let nodeType: "trigger" | "action" | "condition" = "action";
        const nodeTypeStr = (node.type || "").toLowerCase();
        if (nodeTypeStr.includes("trigger") || nodeTypeStr.includes("start"))
          nodeType = "trigger";
        else if (
          nodeTypeStr.includes("if") ||
          nodeTypeStr.includes("switch") ||
          nodeTypeStr.includes("condition")
        )
          nodeType = "condition";
        let xPos = 100 + index * 350;
        let yPos = 150;
        if (nodePositions[node.name]) [xPos, yPos] = nodePositions[node.name];
        return {
          id: node.id || `node-${index}`,
          type: nodeType,
          label: node.name || node.displayName || `Node ${index + 1}`,
          description: node.description || `${node.type || "Unknown"} node`,
          icon: iconMap[node.icon] || Bot,
          x: Math.round(xPos),
          y: Math.round(yPos),
        };
      });
      const mappedEdges: Edge[] = [];
      Object.entries(connections).forEach(
        ([sourceName, connData]: [string, any]) => {
          const sourceNode = mappedNodes.find(
            (n) => n.label === sourceName || n.id === sourceName,
          );
          if (!sourceNode) return;
          Object.entries(connData).forEach(
            ([connType, branches]: [string, any]) => {
              if (!Array.isArray(branches)) return;
              branches.forEach((branch: any, branchIndex: number) => {
                if (Array.isArray(branch)) {
                  branch.forEach((conn: any, connIndex: number) => {
                    const targetName = conn.node;
                    const targetNode = mappedNodes.find(
                      (n) => n.label === targetName || n.id === targetName,
                    );
                    if (
                      targetNode &&
                      !mappedEdges.some(
                        (e) =>
                          e.source === sourceNode.id &&
                          e.target === targetNode.id,
                      )
                    ) {
                      mappedEdges.push({
                        id: `${sourceNode.id}-${targetNode.id}-${connType}-${branchIndex}-${connIndex}`,
                        source: sourceNode.id,
                        target: targetNode.id,
                      });
                    }
                  });
                }
              });
            },
          );
        },
      );
      if (mappedEdges.length === 0 && mappedNodes.length > 1) {
        mappedNodes.forEach((node, index) => {
          if (index < mappedNodes.length - 1) {
            mappedEdges.push({
              id: `seq-edge-${node.id}-${mappedNodes[index + 1].id}`,
              source: node.id,
              target: mappedNodes[index + 1].id,
            });
          }
        });
      }
      setNodes(mappedNodes);
      setEdges(mappedEdges);
      setTimeout(() => handleFitToView(), 100);
    } catch (err: any) {
      console.error("❌ Generation failed:", err);
      alert(`⚠️ Workflow Generation Failed:\n\n${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  // Load initialWorkflow (for viewer and editor prefill)
  useEffect(() => {
    if (initialWorkflow) {
      setN8nWorkflow(initialWorkflow);
      const workflow = initialWorkflow.workflow || initialWorkflow;
      const iconMap: Record<string, any> = {
        Mail,
        Code,
        Database,
        Globe,
        Users,
        Zap,
        Bot,
      };
      const apiNodes = workflow.nodes || [];
      const connections = workflow.connections || {};
      const mappedNodes: Node[] = apiNodes.map((node: any, index: number) => {
        let nodeType: "trigger" | "action" | "condition" = "action";
        const nodeTypeStr = (node.type || "").toLowerCase();
        if (nodeTypeStr.includes("trigger") || nodeTypeStr.includes("start"))
          nodeType = "trigger";
        else if (
          nodeTypeStr.includes("if") ||
          nodeTypeStr.includes("switch") ||
          nodeTypeStr.includes("condition")
        )
          nodeType = "condition";
        return {
          id: node.id || `node-${index}`,
          type: nodeType,
          label: node.name || node.displayName || `Node ${index + 1}`,
          description: node.description || `${node.type || "Unknown"} node`,
          icon: iconMap[node.icon] || Bot,
          x: 100 + index * 350,
          y: 150 + (index % 2) * 200,
        };
      });
      const mappedEdges: Edge[] = [];
      Object.entries(connections).forEach(
        ([sourceName, connData]: [string, any]) => {
          const sourceNode = mappedNodes.find(
            (n) => n.label === sourceName || n.id === sourceName,
          );
          if (!sourceNode) return;
          if (Array.isArray(connData)) {
            connData.forEach((conn: any, idx: number) => {
              const targetName = conn.node || conn.target || conn.name;
              const targetNode = mappedNodes.find(
                (n) => n.label === targetName || n.id === targetName,
              );
              if (
                targetNode &&
                !mappedEdges.some(
                  (e) =>
                    e.source === sourceNode.id && e.target === targetNode.id,
                )
              ) {
                mappedEdges.push({
                  id: `edge-${sourceNode.id}-${targetNode.id}-${idx}`,
                  source: sourceNode.id,
                  target: targetNode.id,
                });
              }
            });
          } else if (typeof connData === "object") {
            Object.entries(connData).forEach(
              ([connType, branches]: [string, any]) => {
                if (!Array.isArray(branches)) return;
                branches.forEach((branch: any, bi: number) => {
                  if (Array.isArray(branch)) {
                    branch.forEach((conn: any, ci: number) => {
                      const targetName = conn.node;
                      const targetNode = mappedNodes.find(
                        (n) => n.label === targetName || n.id === targetName,
                      );
                      if (
                        targetNode &&
                        !mappedEdges.some(
                          (e) =>
                            e.source === sourceNode.id &&
                            e.target === targetNode.id,
                        )
                      ) {
                        mappedEdges.push({
                          id: `edge-${sourceNode.id}-${targetNode.id}-${connType}-${bi}-${ci}`,
                          source: sourceNode.id,
                          target: targetNode.id,
                        });
                      }
                    });
                  }
                });
              },
            );
          }
        },
      );
      if (mappedEdges.length === 0 && mappedNodes.length > 1) {
        mappedNodes.forEach((node, index) => {
          if (index < mappedNodes.length - 1) {
            mappedEdges.push({
              id: `seq-edge-${node.id}-${mappedNodes[index + 1].id}`,
              source: node.id,
              target: mappedNodes[index + 1].id,
            });
          }
        });
      }
      setNodes(mappedNodes);
      setEdges(mappedEdges);
      setTimeout(() => handleFitToView(), 100);
    }
  }, [initialWorkflow]);

  // Auto‑fit when nodes appear
  useEffect(() => {
    if (nodes.length > 0) setTimeout(() => handleFitToView(), 100);
  }, [nodes.length]);

  // ====================================================
  // RENDER: Two modes – editor and viewer (both editable)
  // ====================================================

  // Common graph rendering function to avoid repeating
  const renderGraph = () => (
    <div
      className="relative w-full h-full"
      style={{
        transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
        transformOrigin: "0 0",
        transition:
          isPanning || draggedNode ? "none" : "transform 0.05s ease-out",
        minWidth: "200%",
        minHeight: "200%",
      }}
    >
      {/* Edges */}
      <div className="absolute inset-0 pointer-events-none">
        {edges.map((edge, i) => (
          <ConnectionLine
            key={edge.id}
            edge={edge}
            nodes={nodes}
            delay={i * 0.1}
          />
        ))}
      </div>
      {/* Nodes – with config button always enabled */}
      <div className="absolute inset-0">
        {nodes.map((node, i) => (
          <NodeView
            key={node.id}
            node={node}
            delay={i * 0.15}
            onMouseDown={handleNodeMouseDown}
            onConfigClick={setSelectedNodeConfig} // always editable
          />
        ))}
      </div>
    </div>
  );

  // ====================
  // READ-ONLY VIEWER (editable)
  // ====================
  if (readOnly) {
    return (
      <div className="w-full h-full">
        <div
          ref={canvasRef}
          className="w-full h-[70vh] bg-muted/10 relative overflow-hidden cursor-grab active:cursor-grabbing rounded-xl"
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          style={{ backgroundSize: `${24 * zoom}px ${24 * zoom}px` }}
        >
          {/* Grid */}
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                "radial-gradient(circle, #cbd5e1 1px, transparent 1px)",
              backgroundSize: `${24 * zoom}px ${24 * zoom}px`,
              backgroundPosition: `${pan.x}px ${pan.y}px`,
              opacity: 0.4,
            }}
          />

          {renderGraph()}

          {/* Canvas Controls Toolbar */}
          <div className="absolute top-4 right-4 z-50 flex gap-2 bg-background/80 backdrop-blur-sm border border-border rounded-lg p-2 shadow-lg">
            <Button
              variant="outline"
              size="icon"
              onClick={handleZoomOut}
              title="Zoom Out"
              className="h-9 w-9"
            >
              <Minus className="h-4 w-4" />
            </Button>
            <div className="flex items-center px-2 text-sm font-medium min-w-[60px] justify-center border-l border-r border-border/50">
              {Math.round(zoom * 100)}%
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={handleZoomIn}
              title="Zoom In"
              className="h-9 w-9"
            >
              <Plus className="h-4 w-4" />
            </Button>
            <div className="w-px bg-border/50" />
            <Button
              variant="outline"
              size="icon"
              onClick={handleFitToView}
              title="Fit All Nodes"
              className="h-9 w-9"
            >
              <Maximize className="h-4 w-4" />
            </Button>
          </div>

          {/* Node Configuration Slider (edit options) */}
          <AnimatePresence>
            {selectedNodeConfig && (
              <motion.div
                key="config-panel"
                initial={{ x: -400, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -400, opacity: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="absolute left-0 top-0 bottom-0 w-80 bg-background border-l border-border shadow-2xl z-40 rounded-l-2xl overflow-hidden flex flex-col"
              >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b bg-muted/50">
                  <div>
                    <h3 className="font-semibold text-foreground">
                      Configure Node
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {nodes.find((n) => n.id === selectedNodeConfig)?.label}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setSelectedNodeConfig(null)}
                  >
                    <Plus className="h-4 w-4 rotate-45" />
                  </Button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {/* Label */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Label</label>
                    <Input
                      value={
                        nodes.find((n) => n.id === selectedNodeConfig)?.label ||
                        ""
                      }
                      onChange={(e) =>
                        setNodes(
                          nodes.map((n) =>
                            n.id === selectedNodeConfig
                              ? { ...n, label: e.target.value }
                              : n,
                          ),
                        )
                      }
                      placeholder="Node label"
                      className="h-9"
                    />
                  </div>

                  {/* Description */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Description</label>
                    <Textarea
                      value={
                        nodes.find((n) => n.id === selectedNodeConfig)
                          ?.description || ""
                      }
                      onChange={(e) =>
                        setNodes(
                          nodes.map((n) =>
                            n.id === selectedNodeConfig
                              ? { ...n, description: e.target.value }
                              : n,
                          ),
                        )
                      }
                      placeholder="Node description"
                      className="resize-none h-20 text-xs"
                    />
                  </div>

                  {/* Node Type */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Type</label>
                    <div className="flex gap-2">
                      {(["trigger", "action", "condition"] as const).map(
                        (type) => (
                          <Button
                            key={type}
                            variant={
                              nodes.find((n) => n.id === selectedNodeConfig)
                                ?.type === type
                                ? "default"
                                : "outline"
                            }
                            size="sm"
                            className="flex-1 text-xs h-8"
                            onClick={() =>
                              setNodes(
                                nodes.map((n) =>
                                  n.id === selectedNodeConfig
                                    ? { ...n, type }
                                    : n,
                                ),
                              )
                            }
                          >
                            {type}
                          </Button>
                        ),
                      )}
                    </div>
                  </div>

                  {/* Delete Node */}
                  <Button
                    variant="destructive"
                    className="w-full"
                    onClick={() => {
                      deleteNode(selectedNodeConfig);
                      setSelectedNodeConfig(null);
                    }}
                  >
                    Delete Node
                  </Button>
                </div>

                {/* Footer */}
                <div className="p-4 border-t bg-muted/30">
                  <p className="text-[10px] text-muted-foreground text-center">
                    ID: {selectedNodeConfig}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    );
  }

  // ====================
  // EDIT MODE (full designer)
  // ====================
  return (
    <div className="min-h-screen flex">
      <Sidebar />
      <main className="main-content flex-1">
        <Header title="Workflow Designer" />
        <div className="h-[calc(100vh-64px)] flex flex-col">
          {/* Toolbar */}
          <div className="bg-background border-b p-4 z-10 shadow-sm">
            <div className="max-w-5xl mx-auto w-full flex gap-4 items-start">
              <div className="flex-1 relative">
                <div className="absolute left-3 top-3 text-muted-foreground">
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
                <Textarea
                  placeholder="Describe your workflow automation... (e.g. 'Check for urgent emails and escalate to Slack')"
                  className="pl-10 min-h-[50px] h-[50px] py-3 resize-none focus-visible:ring-primary/20"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleGenerate();
                    }
                  }}
                />
              </div>
              <Button
                onClick={handleGenerate}
                disabled={!prompt || isGenerating}
                className="h-[50px] px-6 bg-primary hover:bg-primary/90 text-black shadow-lg shadow-primary/20 transition-all"
              >
                {isGenerating ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  "Generate Flow"
                )}
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="bg-background shadow-sm h-9 w-9"
                onClick={handleImportJSON}
                title="Import workflow from JSON"
              >
                <Upload className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="bg-background shadow-sm h-9 w-9"
                onClick={handleExportJSON}
                title="Export workflow as JSON"
              >
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Canvas */}
          <div
            ref={canvasRef}
            className="flex-1 bg-muted/10 relative overflow-hidden cursor-grab active:cursor-grabbing"
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            style={{ backgroundSize: `${24 * zoom}px ${24 * zoom}px` }}
          >
            {/* Grid */}
            <div
              className="absolute inset-0"
              style={{
                backgroundImage:
                  "radial-gradient(circle, #cbd5e1 1px, transparent 1px)",
                backgroundSize: `${24 * zoom}px ${24 * zoom}px`,
                backgroundPosition: `${pan.x}px ${pan.y}px`,
                opacity: 0.4,
              }}
            />

            {/* Empty State */}
            {!nodes.length && !isGenerating && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center space-y-4 max-w-md p-8 rounded-2xl bg-background/50 backdrop-blur-sm border border-border/50 shadow-xl">
                  <div className="h-16 w-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Bot className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold">
                    AI Workflow Designer
                  </h3>
                  <p className="text-muted-foreground">
                    Describe your process above, and our AI will generate nodes,
                    connections, and logic.
                  </p>
                  <div className="flex flex-wrap justify-center gap-2 pt-4">
                    {[
                      "Email Auto-Responder",
                      "Lead Scoring Pipeline",
                      "Slack Notification Bot",
                    ].map((tag) => (
                      <Badge
                        key={tag}
                        variant="outline"
                        className="bg-background cursor-pointer hover:border-primary hover:text-primary transition-colors"
                        onClick={() => setPrompt(`Create a ${tag}`)}
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Loading State */}
            {isGenerating && (
              <div className="absolute inset-0 flex items-center justify-center z-20 bg-background/20 backdrop-blur-[2px]">
                <div className="flex flex-col items-center gap-4 p-8 rounded-2xl bg-card shadow-2xl border animate-in fade-in zoom-in duration-300">
                  <div className="relative">
                    <div className="h-16 w-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin"></div>
                    <Bot className="absolute inset-0 m-auto h-6 w-6 text-primary animate-pulse" />
                  </div>
                  <div className="text-center">
                    <h3 className="font-medium text-lg">
                      Building Workflow...
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Connecting triggers and actions
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Graph */}
            {renderGraph()}

            {/* Node Configuration Slider */}
            <AnimatePresence>
              {selectedNodeConfig && (
                <motion.div
                  key="config-panel"
                  initial={{ x: 400, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: 400, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  className="absolute right-0 top-0 bottom-0 w-80 bg-background border-l border-border shadow-2xl z-40 rounded-l-2xl overflow-hidden flex flex-col"
                >
                  {/* Header */}
                  <div className="flex items-center justify-between p-4 border-b bg-muted/50">
                    <div>
                      <h3 className="font-semibold text-foreground">
                        Configure Node
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {nodes.find((n) => n.id === selectedNodeConfig)?.label}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setSelectedNodeConfig(null)}
                    >
                      <Plus className="h-4 w-4 rotate-45" />
                    </Button>
                  </div>
                  {/* Content */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Label</label>
                      <Input
                        value={
                          nodes.find((n) => n.id === selectedNodeConfig)
                            ?.label || ""
                        }
                        onChange={(e) =>
                          setNodes(
                            nodes.map((n) =>
                              n.id === selectedNodeConfig
                                ? { ...n, label: e.target.value }
                                : n,
                            ),
                          )
                        }
                        placeholder="Node label"
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Description</label>
                      <Textarea
                        value={
                          nodes.find((n) => n.id === selectedNodeConfig)
                            ?.description || ""
                        }
                        onChange={(e) =>
                          setNodes(
                            nodes.map((n) =>
                              n.id === selectedNodeConfig
                                ? { ...n, description: e.target.value }
                                : n,
                            ),
                          )
                        }
                        placeholder="Node description"
                        className="resize-none h-20 text-xs"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Type</label>
                      <div className="flex gap-2">
                        {(["trigger", "action", "condition"] as const).map(
                          (type) => (
                            <Button
                              key={type}
                              variant={
                                nodes.find((n) => n.id === selectedNodeConfig)
                                  ?.type === type
                                  ? "default"
                                  : "outline"
                              }
                              size="sm"
                              className="flex-1 text-xs h-8"
                              onClick={() =>
                                setNodes(
                                  nodes.map((n) =>
                                    n.id === selectedNodeConfig
                                      ? { ...n, type }
                                      : n,
                                  ),
                                )
                              }
                            >
                              {type}
                            </Button>
                          ),
                        )}
                      </div>
                    </div>
                    <Button
                      variant="destructive"
                      className="w-full"
                      onClick={() => {
                        deleteNode(selectedNodeConfig);
                        setSelectedNodeConfig(null);
                      }}
                    >
                      Delete Node
                    </Button>
                  </div>
                  <div className="p-4 border-t bg-muted/30">
                    <p className="text-[10px] text-muted-foreground text-center">
                      ID: {selectedNodeConfig}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Floating Controls */}
            {nodes.length > 0 && (
              <div className="absolute bottom-8 right-8 flex gap-2 animate-in slide-in-from-bottom-10 fade-in duration-500">
                <Button
                  variant="outline"
                  size="icon"
                  className="bg-background shadow-sm h-9 w-9"
                  onClick={handleZoomIn}
                >
                  <Plus className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="bg-background shadow-sm h-9 w-9"
                  onClick={handleZoomOut}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="bg-background shadow-sm h-9 w-9"
                  onClick={handleExportJSON}
                >
                  <Download className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="bg-background shadow-sm h-9 w-9"
                  onClick={handleCopyJSON}
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="bg-background shadow-sm h-9 w-9"
                  onClick={handleImportJSON}
                >
                  <Upload className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  className="bg-background shadow-sm"
                  onClick={() => {
                    setZoom(1);
                    setPan({ x: 0, y: 0 });
                  }}
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
                <Button
                  className="shadow-lg shadow-primary/20 bg-green-600 hover:bg-green-700 text-white"
                  onClick={handleSaveWorkflow}
                >
                  <Check className="h-4 w-4 mr-2" /> Save
                </Button>
                <Button className="shadow-lg shadow-primary/20">
                  <Play className="h-4 w-4 mr-2" /> Test Run
                </Button>
              </div>
            )}

            {/* Zoom Info */}
            {nodes.length > 0 && (
              <div className="absolute bottom-8 left-8 flex flex-col gap-2 text-xs text-muted-foreground bg-background/70 backdrop-blur px-3 py-2 rounded-lg border border-border/50 animate-in fade-in duration-500">
                <div>
                  <strong>🔍 Zoom:</strong> {Math.round(zoom * 100)}%
                </div>
                <div>
                  <strong>📍 Pan:</strong> Left-click + Drag Canvas
                </div>
                <div>
                  <strong>Nodes:</strong> {nodes.length} |{" "}
                  <strong>Edges:</strong> {edges.length}
                </div>
                {edges.length === 0 && nodes.length > 1 && (
                  <button
                    className="mt-1 px-2 py-1 bg-primary text-black text-xs rounded font-semibold"
                    onClick={() => {
                      const newEdges: Edge[] = [];
                      nodes.forEach((node, index) => {
                        if (index < nodes.length - 1)
                          newEdges.push({
                            id: `auto-edge-${node.id}-${nodes[index + 1].id}`,
                            source: node.id,
                            target: nodes[index + 1].id,
                          });
                      });
                      setEdges(newEdges);
                    }}
                  >
                    Auto-connect nodes
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
