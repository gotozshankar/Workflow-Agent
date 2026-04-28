// src/pages/Register.tsx

import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, ArrowRight, Loader2, CheckCircle2 } from "lucide-react";
import logo from "/modern_abstract_purple_hexagon_logo_for_ai_software.png";
import { motion } from "framer-motion";

const FEATURES = [
  "AI-powered workflow automation",
  "Multi-agent orchestration",
  "Real-time audit & compliance",
  "100+ tool integrations",
];

export default function Register() {
  const [, navigate] = useLocation();
  const { register } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Password strength logic (UNCHANGED)
  const strength = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ];
  const strengthScore = strength.filter(Boolean).length;
  const strengthLabel = ["", "Weak", "Fair", "Good", "Strong"][strengthScore];
  const strengthColor = [
    "",
    "bg-red-400",
    "bg-amber-400",
    "bg-yellow-400",
    "bg-green-400",
  ][strengthScore];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setLoading(true);
    try {
      await register(name, email, password);
      navigate("/");
    } catch (err: any) {
      setError(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex font-sans bg-[#f7f4fb]">
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

        {/* Blobs */}
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

        {/* Grid */}
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
              Join Agent<span className="text-[#7c6cf2]">Flow</span>
            </h1>
            <p className="text-[#6b5c8f] text-lg">
              Start automating with AI in minutes
            </p>
          </div>

          {/* Features */}
          <div className="space-y-3 text-left">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="flex items-center gap-3"
              >
                <div className="h-5 w-5 rounded-full bg-white/70 shadow-sm flex items-center justify-center">
                  <CheckCircle2 className="h-3 w-3 text-[#7c6cf2]" />
                </div>
                <span className="text-[#5b4b7a] text-sm">{f}</span>
              </motion.div>
            ))}
          </div>

          {/* Role Card */}
          {/* <div className="bg-white/60 backdrop-blur-md border border-white/40 rounded-2xl p-5 text-left space-y-3 shadow-sm">
            <p className="text-[#2d2440] font-semibold text-sm">
              🔐 Role System
            </p>
            <div className="space-y-2">
              {[
                {
                  role: "Super Admin",
                  desc: "Full access",
                  color: "text-amber-700",
                },
                {
                  role: "Admin",
                  desc: "Manage system",
                  color: "text-[#7c6cf2]",
                },
                {
                  role: "User",
                  desc: "Limited access",
                  color: "text-sky-600",
                },
              ].map((r) => (
                <div key={r.role} className="flex items-start gap-2">
                  <span className={`text-xs font-bold ${r.color} min-w-[80px]`}>
                    {r.role}
                  </span>
                  <span className="text-[#6b5c8f] text-xs">{r.desc}</span>
                </div>
              ))}
            </div>
          </div> */}
        </motion.div>
      </div>

      {/* ── Right Panel ────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-8 bg-[#fbf9fd]">
        <div className="w-full max-w-md space-y-6">
          <div className="flex items-center gap-3 lg:hidden">
            <img src={logo} className="h-10 w-10" />
            <span className="text-lg font-semibold text-[#2d2440]">
              AgentFlow
            </span>
          </div>

          <div>
            <h2 className="text-3xl font-bold text-[#2d2440]">
              Create account
            </h2>
            <p className="text-[#6b5c8f] text-sm">
              Start your journey with AgentFlow
            </p>
          </div>

          {error && (
            <div className="bg-red-100/80 border border-red-200 text-red-700 text-sm px-4 py-2 rounded-lg">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <Label className="text-[#2d2440]">Full Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 bg-white/70 border-[#e6def3] focus:border-[#a78bfa] focus:ring-[#c4b5fd] text-[#2d2440]"
                required
              />
            </div>

            <div>
              <Label className="text-[#2d2440]">Email</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 bg-white/70 border-[#e6def3] focus:border-[#a78bfa] focus:ring-[#c4b5fd] text-[#2d2440]"
                required
              />
            </div>

            <div>
              <Label className="text-[#2d2440]">Password</Label>
              <div className="relative mt-1">
                <Input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pr-10 bg-white/70 border-[#e6def3] focus:border-[#a78bfa] focus:ring-[#c4b5fd] text-[#2d2440]"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7c6cf2]"
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {password && (
                <div className="space-y-1.5 pt-1">
                  <div className="flex gap-1">
                    {[0, 1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className={`h-1.5 flex-1 rounded-full ${
                          i < strengthScore ? strengthColor : "bg-[#e6def3]"
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-xs font-medium">
                    {strengthLabel} password
                  </p>
                </div>
              )}
            </div>

            <div>
              <Label className="text-[#2d2440]">Confirm Password</Label>
              <Input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className={`mt-1 bg-white/70 border-[#e6def3] ${
                  confirm && confirm !== password ? "border-red-300" : ""
                }`}
                required
              />
              {confirm && confirm !== password && (
                <p className="text-xs text-red-500 mt-1">
                  Passwords don't match
                </p>
              )}
            </div>

            <Button
              type="submit"
              disabled={loading || (!!confirm && confirm !== password)}
              className="w-full h-11 bg-[#7c6cf2] hover:bg-[#6d5be8] text-white rounded-lg flex items-center justify-center gap-2 shadow-md shadow-[#cfc4ff]/40"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin h-4 w-4" />
                  Creating...
                </>
              ) : (
                <>
                  Create account <ArrowRight size={16} />
                </>
              )}
            </Button>
          </form>

          <p className="text-sm text-[#6b5c8f] text-center">
            Already have an account?{" "}
            <span
              onClick={() => navigate("/login")}
              className="text-[#2d2440] font-medium cursor-pointer hover:underline"
            >
              Sign in
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
