// src/pages/Login.tsx
// Split screen: pastel animated gradient left | clean pastel form right
// Logic unchanged – only design updated to light purple pastel theme

import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Sparkles, ArrowRight, Loader2 } from "lucide-react";
import logo from "/modern_abstract_purple_hexagon_logo_for_ai_software.png";
import { motion } from "framer-motion";

export default function Login() {
  const [, navigate] = useLocation();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("agentflow_token");
    if (token) {
      navigate("/dashboard");
    }
  }, []);

  async function handleSubmit(e: any) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await login(email, password);
      navigate("/dashboard");
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* ── Left Panel ─────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-[52%] relative overflow-hidden flex-col items-center justify-center p-12">
        {/* Animated pastel gradient */}
        <motion.div
          animate={{
            background: [
              "linear-gradient(135deg, #f7f4fb, #efe9f7, #e9e1f3)",
              "linear-gradient(135deg, #efe9f7, #f5f1fa, #e6def0)",
              "linear-gradient(135deg, #f4f0fa, #ebe3f5, #f3ecfb)",
              "linear-gradient(135deg, #f7f4fb, #efe9f7, #e9e1f3)",
            ],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute inset-0 z-0"
        />

        {/* Soft floating blobs */}
        <motion.div
          animate={{ y: [0, -30, 0], x: [0, 20, 0] }}
          transition={{ duration: 14, repeat: Infinity }}
          className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-[#d6c7f3]/40 blur-[120px]"
        />
        <motion.div
          animate={{ y: [0, 40, 0], x: [0, -20, 0] }}
          transition={{ duration: 16, repeat: Infinity }}
          className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-[#e7dff7]/40 blur-[120px]"
        />
        <motion.div
          animate={{ y: [0, 20, 0] }}
          transition={{ duration: 20, repeat: Infinity }}
          className="absolute top-[40%] right-[20%] w-[300px] h-[300px] rounded-full bg-[#f1e7fb]/40 blur-[100px]"
        />

        {/* Subtle grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(139,92,246,0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(139,92,246,0.2) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />

        {/* Content */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 text-center space-y-8 max-w-md"
        >
          {/* Logo */}
          <div className="mx-auto w-20 h-20 rounded-2xl bg-gradient-to-br from-[#8b5cf6] to-[#a78bfa] flex items-center justify-center shadow-lg shadow-purple-200/50">
            <img src={logo} className="h-12 w-12 object-contain rounded-xl" />
          </div>

          {/* Heading */}
          <div className="space-y-3">
            <h1 className="text-4xl font-bold text-[#2d2440] tracking-tight">
              Agent<span className="text-[#7c6cf2]">Flow</span>
            </h1>
            <p className="text-[#6b5c8f] text-lg">
              Intelligent automation for AI‑powered workflows
            </p>
          </div>

          {/* Feature pills */}
          <div className="flex flex-wrap justify-center gap-2">
            {[
              "AI Agents",
              "Workflow Builder",
              "Knowledge Base",
              "MCP Servers",
            ].map((f) => (
              <span
                key={f}
                className="px-3 py-1 text-xs font-medium rounded-full bg-white/60 backdrop-blur-sm border border-white/60 text-[#5b4b7a]"
              >
                {f}
              </span>
            ))}
          </div>

          {/* Testimonial card */}
          <div className="bg-white/60 backdrop-blur-md border border-white/40 rounded-2xl p-5 text-left space-y-3 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[#a78bfa] to-[#c084fc] flex items-center justify-center text-xs font-bold text-white">
                SC
              </div>
              <div>
                <p className="text-[#2d2440] text-sm font-medium">Sarah Chen</p>
                <p className="text-[#7c6cf2] text-xs">Head of AI Ops</p>
              </div>
            </div>
            <p className="text-[#5b4b7a] text-sm leading-relaxed italic">
              "AgentFlow reduced our automation setup time by 80%. The AI
              workflow builder is genuinely magical."
            </p>
          </div>
        </motion.div>
      </div>

      {/* ── Right Panel (Pastel Form) ────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-8 bg-[#fbf9fd]">
        <div className="w-full max-w-md space-y-6">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 lg:hidden">
            <img src={logo} className="h-10 w-10" />
            <span className="text-lg font-semibold text-[#2d2440]">
              AgentFlow
            </span>
          </div>

          <div>
            <h2 className="text-3xl font-bold text-[#2d2440]">Welcome back</h2>
            <p className="text-[#6b5c8f] text-sm">Sign in to your workspace</p>
          </div>

          {error && (
            <div className="bg-red-100/80 border border-red-200 text-red-700 text-sm px-4 py-2 rounded-lg">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <Label className="text-[#2d2440]">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="mt-1 bg-white/70 border-[#e6def3] focus:border-[#a78bfa] focus:ring-[#c4b5fd] text-[#2d2440]"
              />
            </div>

            <div>
              <Label className="text-[#2d2440]">Password</Label>
              <div className="relative mt-1">
                <Input
                  id="password"
                  type={showPw ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="pr-10 bg-white/70 border-[#e6def3] focus:border-[#a78bfa] focus:ring-[#c4b5fd] text-[#2d2440]"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7c6cf2]"
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-[#7c6cf2] hover:bg-[#6d5be8] text-white rounded-lg flex items-center justify-center gap-2 shadow-md shadow-[#cfc4ff]/40"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin h-4 w-4" />
                  Signing in...
                </>
              ) : (
                <>
                  Sign in <ArrowRight size={16} />
                </>
              )}
            </Button>
          </form>

          <div className="text-center text-sm text-[#6b5c8f]">
            Don't have an account?{" "}
            <button
              onClick={() => navigate("/register")}
              className="text-[#2d2440] font-medium hover:underline"
            >
              Create account
            </button>
          </div>

          {/* Role info hint */}
          {/* <div className="bg-white/50 backdrop-blur-sm border border-[#e6def3] rounded-xl p-4 text-xs text-[#5b4b7a] space-y-1">
            <p className="font-medium text-[#2d2440] text-xs">
              ℹ️ First time setup?
            </p>
            <p>
              The very first person to register automatically becomes{" "}
              <span className="font-semibold text-[#7c6cf2]">Super Admin</span>.
            </p>
          </div> */}
        </div>
      </div>
    </div>
  );
}
