import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Link } from "wouter";
import {
  Workflow,
  Activity,
  TrendingUp,
  Cpu,
  ArrowRight,
  Sparkles,
  Play,
  Plus,
  ShieldCheck,
  Bot,
  Zap,
  Star,
} from "lucide-react";
import workflowBg from "/abstract_network_connection_illustration_for_workflow_builder.png";
import { useState, useEffect } from "react";
import API_URL from "../config";
import { motion, AnimatePresence } from "framer-motion";
const API_BASE_URL = API_URL;

interface Stat {
  label: string;
  value: string | number;
  change: string;
  bg: string;
  color: string;
  icon: React.ComponentType<{ className?: string }>;
}
interface Model {
  name: string;
  status: "Compliant" | "Non-Compliant" | string;
}
interface RecentActivity {
  id: string;
  type: string;
  title: string;
  time: string;
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Workflow,
  Activity,
  TrendingUp,
  Cpu,
};

// Updated pastel palette — richer, more intentional
const PASTEL_CARDS = [
  {
    bg: "rgba(232,222,255,0.7)",
    iconBg: "#EDE8F5",
    dot: "#7858C8",
    accent: "rgba(232,222,255,0.5)",
    border: "rgba(178,148,240,0.22)",
  },
  {
    bg: "rgba(255,218,238,0.7)",
    iconBg: "#FDEEE8",
    dot: "#D23C78",
    accent: "rgba(255,218,238,0.5)",
    border: "rgba(255,160,200,0.22)",
  },
  {
    bg: "rgba(208,244,228,0.7)",
    iconBg: "#E8F5EE",
    dot: "#2AA06E",
    accent: "rgba(208,244,228,0.5)",
    border: "rgba(100,200,160,0.22)",
  },
  {
    bg: "rgba(208,234,255,0.7)",
    iconBg: "#E8F0FD",
    dot: "#3278DC",
    accent: "rgba(208,234,255,0.5)",
    border: "rgba(100,170,255,0.22)",
  },
];

const ACTIVITY_STYLE: Record<
  string,
  { bg: string; color: string; icon: React.ReactNode }
> = {
  execution: {
    bg: "#D0EAFF",
    color: "#3278DC",
    icon: <Play className="h-3.5 w-3.5" />,
  },
  creation: {
    bg: "#D0F4E4",
    color: "#2AA06E",
    icon: <Plus className="h-3.5 w-3.5" />,
  },
  security: {
    bg: "#FFDAEE",
    color: "#D23C78",
    icon: <ShieldCheck className="h-3.5 w-3.5" />,
  },
  system: {
    bg: "#E8DEFF",
    color: "#7858C8",
    icon: <Sparkles className="h-3.5 w-3.5" />,
  },
};

const MOCK_STATS: Stat[] = [
  {
    label: "Active Workflows",
    value: "24",
    change: "+12%",
    bg: "bg-[#E8DEFF]",
    color: "text-[#7858C8]",
    icon: Workflow,
  },
  {
    label: "AI Models",
    value: "8",
    change: "3 new",
    bg: "bg-[#D0EAFF]",
    color: "text-[#3278DC]",
    icon: Bot,
  },
  {
    label: "Compliance Score",
    value: "98%",
    change: "Excellent",
    bg: "bg-[#D0F4E4]",
    color: "text-[#2AA06E]",
    icon: ShieldCheck,
  },
  {
    label: "Tasks Processed",
    value: "12.4K",
    change: "+28%",
    bg: "bg-[#FFDAEE]",
    color: "text-[#D23C78]",
    icon: Activity,
  },
];

const MOCK_MODELS: Model[] = [
  { name: "GPT-4", status: "Compliant" },
  { name: "Claude 3 Opus", status: "Compliant" },
  { name: "UX Pilot-3", status: "Compliant" },
  { name: "Custom Model", status: "Review" },
  { name: "Mistral Large", status: "Compliant" },
];

const MOCK_ACTIVITY: RecentActivity[] = [
  {
    id: "1",
    type: "execution",
    title: "Customer Support Workflow executed",
    time: "2 min ago",
  },
  {
    id: "2",
    type: "creation",
    title: "New RAG agent created",
    time: "15 min ago",
  },
  {
    id: "3",
    type: "security",
    title: "Compliance check completed",
    time: "1 hour ago",
  },
];

const container = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.06,
    },
  },
};

const item = {
  hidden: { opacity: 0, y: 10 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.25, ease: "easeOut" },
  },
};

export default function Dashboard() {
  const [stats, setStats] = useState<Stat[]>(MOCK_STATS);
  const [models, setModels] = useState<Model[]>(MOCK_MODELS);
  const [recentActivity, setRecentActivity] =
    useState<RecentActivity[]>(MOCK_ACTIVITY);
  const [openId, setOpenId] = useState(null);
  useEffect(() => {
    const load = async () => {
      try {
        const [sRes, mRes, aRes] = await Promise.all([
          fetch(`${API_BASE_URL}/api/stats`),
          fetch(`${API_BASE_URL}/api/models`),
          fetch(`${API_BASE_URL}/api/activity`),
        ]);
        const [sData, mData, aData] = await Promise.all([
          sRes.json(),
          mRes.json(),
          aRes.json(),
        ]);
        if (Array.isArray(sData) && sData.length)
          setStats(
            sData.map((i) => ({ ...i, icon: iconMap[i.icon] || Workflow })),
          );
        if (Array.isArray(mData) && mData.length) setModels(mData);
        if (Array.isArray(aData) && aData.length) setRecentActivity(aData);
      } catch {
        /* use mock data */
      }
    };
    load();
  }, []);

  return (
    <div className="flex min-h-screen relative">
      {/* ── Floating pastel orbs ── */}
      <div className="bg-orb bg-orb-1" aria-hidden />
      <div className="bg-orb bg-orb-2" aria-hidden />
      <div className="bg-orb bg-orb-3" aria-hidden />
      <div className="bg-orb bg-orb-4" aria-hidden />

      <Sidebar />

      <main className="main-content flex-1 flex flex-col min-h-screen relative z-10">
        <Header title="Dashboard" />

        <div className="flex-1 p-6 space-y-6 max-w-6xl mx-auto w-full">
          {/* ─── Hero welcome ─── */}
          <div>
            <h2
              className="text-2xl font-semibold text-foreground mb-1"
              style={{ fontFamily: "Lora, serif" }}
            >
              Welcome to the Dashboard ✨
            </h2>
            <p className="text-sm text-muted-foreground">
              Your AI workspace is running smoothly today.
            </p>
          </div>

          {/* ─── Stat cards ─── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {stats.map((stat, i) => {
              const p = PASTEL_CARDS[i % 4];
              return (
                <div
                  key={stat.label}
                  className="rounded-2xl p-4 border backdrop-blur-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
                  style={{
                    background: p.bg,
                    borderColor: p.border,
                    boxShadow:
                      "0 2px 12px rgba(100,60,180,0.06), inset 0 1px 0 rgba(255,255,255,0.7)",
                  }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div
                      className={`h-9 w-9 rounded-xl flex items-center justify-center ${stat.bg}`}
                      style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
                    >
                      <stat.icon className={`h-4.5 w-4.5 ${stat.color}`} />
                    </div>
                    <span
                      className="text-[10px] font-bold px-2.5 py-0.5 rounded-full"
                      style={{
                        background: "rgba(255,255,255,0.65)",
                        color: p.dot,
                      }}
                    >
                      {stat.change}
                    </span>
                  </div>
                  <p
                    className="text-2xl font-extrabold tracking-tight"
                    style={{ color: p.dot }}
                  >
                    {stat.value}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5 font-medium">
                    {stat.label}
                  </p>
                </div>
              );
            })}
          </div>

          {/* ─── Middle row ─── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Workflow Builder CTA */}
            <div
              className="lg:col-span-2 rounded-2xl overflow-hidden relative group"
              style={{
                background:
                  "linear-gradient(135deg, rgba(232,222,255,0.80) 0%, rgba(255,218,238,0.72) 50%, rgba(208,244,228,0.72) 100%)",
                border: "1px solid rgba(178,148,240,0.22)",
                boxShadow:
                  "0 4px 24px rgba(140,100,220,0.10), inset 0 1px 0 rgba(255,255,255,0.8)",
                minHeight: 230,
              }}
            >
              <img
                src={workflowBg}
                alt=""
                className="absolute inset-0 w-full h-full object-cover opacity-[0.04] group-hover:opacity-[0.08] transition-opacity duration-700 pointer-events-none"
              />
              {/* Decorative blobs */}
              <div
                className="absolute -top-12 -right-12 w-52 h-52 rounded-full opacity-60 pointer-events-none"
                style={{
                  background:
                    "radial-gradient(circle, rgba(178,148,240,0.35), transparent 70%)",
                }}
              />
              <div
                className="absolute -bottom-8 left-1/4 w-40 h-40 rounded-full opacity-50 pointer-events-none"
                style={{
                  background:
                    "radial-gradient(circle, rgba(255,175,210,0.30), transparent 70%)",
                }}
              />

              <div className="relative z-10 flex flex-col items-center justify-center h-full py-12 px-8 text-center space-y-4">
                <div
                  className="h-14 w-14 rounded-2xl flex items-center justify-center"
                  style={{
                    background: "rgba(255,255,255,0.75)",
                    boxShadow:
                      "0 4px 16px rgba(140,100,220,0.18), inset 0 1px 0 rgba(255,255,255,0.9)",
                  }}
                >
                  <Sparkles className="h-7 w-7" style={{ color: "#7858C8" }} />
                </div>
                <div>
                  <h3
                    className="text-xl font-semibold text-foreground mb-2"
                    style={{ fontFamily: "Lora, serif" }}
                  >
                    Build Your Next Workflow
                  </h3>
                  <p className="text-sm text-muted-foreground max-w-sm">
                    Drag-and-drop automation with AI at its core. Describe what
                    you need, we build it.
                  </p>
                </div>
                <Link href="/workflows/new">
                  <button
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 hover:-translate-y-0.5"
                    style={{
                      background: "linear-gradient(135deg, #9B7FD4, #D472A8)",
                      boxShadow: "0 4px 18px rgba(155,127,212,0.38)",
                    }}
                  >
                    <Zap className="h-4 w-4" />
                    Start Building
                  </button>
                </Link>
              </div>
            </div>

            {/* Model Compliance */}
            <div
              className="rounded-2xl p-4 backdrop-blur-sm"
              style={{
                background: "rgba(255,255,255,0.74)",
                border: "1px solid rgba(178,148,240,0.18)",
                boxShadow:
                  "0 2px 14px rgba(140,100,220,0.07), inset 0 1px 0 rgba(255,255,255,0.85)",
              }}
            >
              <h3
                className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2"
                style={{ fontFamily: "Lora, serif" }}
              >
                <Star className="h-4 w-4" style={{ color: "#7858C8" }} />
                Model Status
              </h3>
              <div className="space-y-1.5">
                {models.slice(0, 5).map((m) => (
                  <div
                    key={m.name}
                    className="flex items-center justify-between px-3 py-2 rounded-xl transition-colors"
                    style={{ background: "rgba(248,244,255,0.6)" }}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="h-2 w-2 rounded-full"
                        style={{
                          background:
                            m.status === "Compliant" ? "#2AA06E" : "#E8956D",
                        }}
                      />
                      <span className="text-xs font-medium text-foreground">
                        {m.name}
                      </span>
                    </div>
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={
                        m.status === "Compliant"
                          ? { background: "#D0F4E4", color: "#2AA06E" }
                          : { background: "#FFDAEE", color: "#D23C78" }
                      }
                    >
                      {m.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* RECENT ACTIVITY */}
          <div className="rounded-2xl p-4 bg-white/70">
            <h3 className="text-sm font-semibold mb-4 flex gap-2">
              <Activity className="h-4 w-4 text-purple-600" />
              Recent Activity
            </h3>

            <motion.div
              variants={container}
              initial="hidden"
              animate="show"
              className="space-y-2"
            >
              {recentActivity.map((act) => {
                const s = ACTIVITY_STYLE[act.type] || ACTIVITY_STYLE.system;

                const isFailed = act.title.toLowerCase().includes("failed");

                const isSuccess = act.title.toLowerCase().includes("success");

                const isActive = act.type === "execution" && !isFailed;

                /* 🎨 Pastel Logic */
                const bgColor = isFailed
                  ? "rgba(255, 210, 218, 0.55)" // 🔴 soft red/pink (FAILED)
                  : isSuccess
                    ? "rgba(208, 244, 228, 0.55)" // 🟢 soft green (SUCCESS)
                    : isActive
                      ? "rgba(178,148,240,0.45)" // 🟣 deeper purple (ACTIVE)
                      : "rgba(248,244,255,0.55)"; // ⚪ neutral

                const borderColor = isFailed
                  ? "#ef4444"
                  : isSuccess
                    ? "#22c55e"
                    : isActive
                      ? "#7c3aed"
                      : "#c4b5fd";

                return (
                  <motion.div
                    key={act.id}
                    variants={item}
                    layout
                    whileHover={{ y: -4, scale: 1.01 }}
                    onClick={() => setOpenId(openId === act.id ? null : act.id)}
                    className="p-3 rounded-xl cursor-pointer group"
                    style={{
                      background: bgColor,
                      borderLeft: `3px solid ${borderColor}`,
                    }}
                  >
                    <div className="flex items-center gap-3">
                      {/* STATUS DOT */}
                      <motion.div
                        className="h-2.5 w-2.5 rounded-full"
                        animate={
                          isActive
                            ? { scale: [1, 1.4, 1] }
                            : isFailed
                              ? { opacity: [1, 0.4, 1] }
                              : {}
                        }
                        transition={{
                          repeat: Infinity,
                          duration: 1.2,
                        }}
                        style={{
                          background: isFailed
                            ? "#ef4444"
                            : isSuccess
                              ? "#22c55e"
                              : isActive
                                ? "#7c3aed"
                                : s.color,
                        }}
                      />

                      {/* ICON */}
                      <div
                        className="h-8 w-8 rounded-lg flex items-center justify-center"
                        style={{
                          background: s.bg,
                          color: s.color,
                        }}
                      >
                        {s.icon}
                      </div>

                      {/* TEXT */}
                      <div className="flex-1">
                        <p className="text-sm font-medium group-hover:text-[#7858C8] transition">
                          {act.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {act.time}
                        </p>
                      </div>

                      <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition" />
                    </div>

                    {/* EXPAND */}
                    <AnimatePresence>
                      {openId === act.id && (
                        <motion.div
                          initial={{
                            opacity: 0,
                            height: 0,
                          }}
                          animate={{
                            opacity: 1,
                            height: "auto",
                          }}
                          exit={{
                            opacity: 0,
                            height: 0,
                          }}
                          className="text-xs mt-2 pl-6 text-muted-foreground"
                        >
                          {act.details}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </motion.div>
          </div>
        </div>
      </main>
    </div>
  );
}
