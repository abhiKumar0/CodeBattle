"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";

// Animated typing effect for the code preview
const CODE_LINES = [
  { text: "function maxSubarray(nums) {", color: "#7dd3fc" },
  { text: "  let max = nums[0], cur = nums[0];", color: "#d1fae5" },
  { text: "  for (let i = 1; i < nums.length; i++) {", color: "#d1fae5" },
  { text: "    cur = Math.max(nums[i], cur + nums[i]);", color: "#86efac" },
  { text: "    max = Math.max(max, cur);", color: "#86efac" },
  { text: "  }", color: "#d1fae5" },
  { text: "  return max;", color: "#fde68a" },
  { text: "}", color: "#7dd3fc" },
];

const STATS = [
  { value: "1v1", label: "Real-time battles" },
  { value: "ELO", label: "Rating system" },
  { value: "Live", label: "Spectator mode" },
  { value: "30+", label: "Problems" },
];

const HOW_IT_WORKS = [
  {
    icon: "⚔️",
    title: "Find an opponent",
    desc: "Quick match by ELO rating or invite a friend with a room code.",
  },
  {
    icon: "🧩",
    title: "Solve the problem",
    desc: "Both players get the same problem. First correct submission wins.",
  },
  {
    icon: "📈",
    title: "Climb the ranks",
    desc: "ELO updates after every battle. Watch yourself rise on the leaderboard.",
  },
];

export default function LandingPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [typedLines, setTypedLines] = useState<string[]>([]);
  const [currentLine, setCurrentLine] = useState(0);
  const [currentChar, setCurrentChar] = useState(0);
  const [showCursor, setShowCursor] = useState(true);
  const [verdict, setVerdict] = useState<"" | "running" | "accepted">("running");
  const animRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Redirect logged-in users straight to dashboard
  useEffect(() => {
    if (isAuthenticated) router.replace("/dashboard");
  }, [isAuthenticated]);

  // Blinking cursor
  useEffect(() => {
    const id = setInterval(() => setShowCursor((v) => !v), 530);
    return () => clearInterval(id);
  }, []);

  // Typing animation
  useEffect(() => {
    if (currentLine >= CODE_LINES.length) {
      // All lines typed — show verdict after short delay
      setTimeout(() => setVerdict("running"), 600);
      setTimeout(() => setVerdict("accepted"), 1800);
      return;
    }
    const line = CODE_LINES[currentLine].text;
    if (currentChar < line.length) {
      animRef.current = setTimeout(() => setCurrentChar((c) => c + 1), 28);
    } else {
      animRef.current = setTimeout(() => {
        setTypedLines((prev) => [...prev, line]);
        setCurrentLine((l) => l + 1);
        setCurrentChar(0);
      }, 80);
    }
    return () => { if (animRef.current) clearTimeout(animRef.current); };
  }, [currentLine, currentChar]);

  if (isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-background">
      {/* ── NAV ─────────────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 h-14 flex items-center justify-between px-6 md:px-12
        bg-background/80 backdrop-blur-md border-b border-border"
        style={{ borderBottomColor: "rgba(34,197,94,0.12)" }}>
        <div className="flex items-center gap-2">
          <div className="relative w-7 h-7 flex items-center justify-center">
            <div className="absolute inset-0 border border-green-500/50 rotate-45" />
            <span className="text-green-500 relative z-10 text-sm">⚔</span>
          </div>
          <span className="font-mono font-bold text-green-400 tracking-widest text-sm">CODEBATTLE</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/auth/login"
            className="font-mono text-xs text-muted-foreground hover:text-foreground transition-colors tracking-wider">
            LOGIN
          </Link>
          <Link href="/auth/register"
            className="btn-primary text-xs px-5 py-2">
            GET STARTED →
          </Link>
        </div>
      </nav>

      {/* ── HERO ────────────────────────────────────────────────────────────── */}
      <section className="min-h-screen flex items-center pt-14 px-6 md:px-12 relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/3 left-1/4 w-[500px] h-[500px] bg-green-500/4 rounded-full blur-3xl" />
          <div className="absolute top-1/2 right-1/4 w-[300px] h-[300px] bg-cyan-500/3 rounded-full blur-3xl" />
        </div>

        <div className="max-w-7xl mx-auto w-full grid lg:grid-cols-2 gap-16 items-center py-20">
          {/* Left — headline */}
          <div className="space-y-8 animate-fade-up">
            <div>
              {/* <span className="font-mono text-xs text-green-500 tracking-[0.25em] uppercase">
                // Real-time competitive coding
              </span> */}
              <h1 className="font-display mt-3 leading-none">
                <span className="block text-6xl md:text-7xl font-bold text-foreground tracking-tight">
                  Code.
                </span>
                <span className="block text-6xl md:text-7xl font-bold text-foreground tracking-tight">
                  Battle.
                </span>
                <span className="block text-6xl md:text-7xl font-bold text-green-400 tracking-tight glow-text">
                  Conquer.
                </span>
              </h1>
            </div>

            <p className="font-mono text-sm text-muted-foreground leading-relaxed max-w-md">
              1v1 coding duels against real opponents. Same problem, same clock.
              Solve it first — win the ELO. Lose — come back stronger.
            </p>

            <div className="flex items-center gap-4 flex-wrap">
              <Link href="/auth/register" className="btn-primary text-sm px-8 py-3">
                START BATTLING →
              </Link>
              <Link href="/auth/login"
                className="font-mono text-xs text-muted-foreground hover:text-green-400 transition-colors tracking-wider">
                Already have an account? Login
              </Link>
            </div>

            {/* Stats row */}
            <div className="flex gap-8 pt-4 border-t border-border">
              {STATS.map(({ value, label }) => (
                <div key={label}>
                  <div className="font-display text-2xl font-bold text-green-400">{value}</div>
                  <div className="font-mono text-xs text-muted-foreground mt-0.5">{label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right — live code editor mockup */}
          <div className="animate-fade-up stagger-2">
            <div className="cb-card corner-tl overflow-hidden relative">
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-green-500/50 to-transparent" />

              {/* Editor chrome */}
              <div className="flex items-center justify-between px-4 py-3 bg-card border-b border-border"
                style={{ borderBottomColor: "rgba(34,197,94,0.1)" }}>
                <div className="flex items-center gap-3">
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500/40" />
                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/40" />
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500/40" />
                  </div>
                  <span className="font-mono text-xs text-muted-foreground">solution.js</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-cyan-400/70">vs ByteWiz ⚡1801</span>
                  <span className="font-mono text-xs text-yellow-400">⏱ 14:32</span>
                </div>
              </div>

              {/* Code content */}
              <div className="p-5 bg-[#0a0f0d] min-h-56 font-mono text-sm">
                {typedLines.map((line, i) => (
                  <div key={i} className="leading-7">
                    <span className="text-green-500/30 mr-4 select-none text-xs">{i + 1}</span>
                    <span style={{ color: CODE_LINES[i].color }}>{line}</span>
                  </div>
                ))}
                {currentLine < CODE_LINES.length && (
                  <div className="leading-7">
                    <span className="text-green-500/30 mr-4 select-none text-xs">{currentLine + 1}</span>
                    <span style={{ color: CODE_LINES[currentLine].color }}>
                      {CODE_LINES[currentLine].text.slice(0, currentChar)}
                    </span>
                    {showCursor && (
                      <span className="inline-block w-0.5 h-4 bg-green-400 align-middle ml-0.5" />
                    )}
                  </div>
                )}
              </div>

              {/* Bottom bar — verdict */}
              <div className="px-5 py-3 border-t border-border flex items-center justify-between"
                style={{ borderTopColor: "rgba(34,197,94,0.1)" }}>
                <span className="font-mono text-xs text-muted-foreground">Maximum Subarray · MEDIUM</span>
                {verdict === "" && (
                  <span className="font-mono text-xs text-muted-foreground">—</span>
                )}
                {verdict === "running" && (
                  <span className="font-mono text-xs text-cyan-400 animate-pulse flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                    JUDGING...
                  </span>
                )}
                {verdict === "accepted" && (
                  <span className="font-mono text-xs text-green-400 flex items-center gap-1.5"
                    style={{ animation: "fadeSlideIn 0.3s ease-out" }}>
                    ✓ ACCEPTED — YOU WIN!
                  </span>
                )}
              </div>
            </div>

            {/* Floating opponent status */}
            {verdict === "accepted" && (
              <div className="mt-3 cb-card px-4 py-3 flex items-center justify-between border-red-500/20 bg-red-500/3"
                style={{ animation: "fadeSlideIn 0.4s ease-out 0.1s both" }}>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 border border-red-500/30 flex items-center justify-center font-mono text-xs text-red-400">B</div>
                  <span className="font-display text-sm font-semibold">ByteWiz</span>
                </div>
                <span className="font-mono text-xs text-red-400">Still solving... -18 ELO</span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ────────────────────────────────────────────────────── */}
      <section className="px-6 md:px-12 py-24 border-t border-border"
        style={{ borderTopColor: "rgba(34,197,94,0.08)" }}>
        <div className="max-w-5xl mx-auto">
          <p className="font-mono text-xs text-green-500 tracking-[0.25em] mb-2">// HOW IT WORKS</p>
          <h2 className="font-display text-4xl font-bold mb-16">Three steps to glory.</h2>

          <div className="grid md:grid-cols-3 gap-6">
            {HOW_IT_WORKS.map(({ icon, title, desc }, i) => (
              <div key={i} className="cb-card corner-tl p-7 relative group hover:border-green-500/30 transition-all duration-300">
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-green-500/0 group-hover:via-green-500/30 to-transparent transition-all duration-500" />
                <div className="text-4xl mb-5">{icon}</div>
                <h3 className="font-display text-xl font-bold mb-2">{title}</h3>
                <p className="font-mono text-xs text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ────────────────────────────────────────────────────────── */}
      <section className="px-6 md:px-12 py-24 border-t border-border"
        style={{ borderTopColor: "rgba(34,197,94,0.08)" }}>
        <div className="max-w-5xl mx-auto">
          <p className="font-mono text-xs text-green-500 tracking-[0.25em] mb-2">// FEATURES</p>
          <h2 className="font-display text-4xl font-bold mb-16">Built for competitors.</h2>

          <div className="grid md:grid-cols-2 gap-4">
            {[
              { icon: "🏆", title: "ELO Rating System", desc: "Every win and loss adjusts your rating. The same algorithm used by chess grandmasters." },
              { icon: "👁", title: "Spectator Mode", desc: "Watch live battles in real-time. See the code as players type it — read only." },
              { icon: "⚡", title: "Instant Matchmaking", desc: "Matched against opponents within 100 ELO points of you in seconds." },
              { icon: "🔔", title: "Live Notifications", desc: "Friend requests, challenges, match results — pushed instantly via WebSocket." },
              { icon: "👥", title: "Friends & Challenges", desc: "Search friends by username, send challenges, or create private rooms." },
              { icon: "📊", title: "Match History", desc: "Full battle history on your profile — every problem, every opponent, every rating change." },
            ].map(({ icon, title, desc }) => (
              <div key={title} className="cb-card p-6 flex items-start gap-4 hover:border-green-500/25 transition-all duration-200">
                <div className="text-2xl shrink-0 mt-0.5">{icon}</div>
                <div>
                  <h3 className="font-display font-bold text-base mb-1">{title}</h3>
                  <p className="font-mono text-xs text-muted-foreground leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────────────────── */}
      <section className="px-6 md:px-12 py-32 border-t border-border"
        style={{ borderTopColor: "rgba(34,197,94,0.08)" }}>
        <div className="max-w-3xl mx-auto text-center">
          <p className="font-mono text-xs text-green-500 tracking-[0.25em] mb-4">// READY TO COMPETE?</p>
          <h2 className="font-display text-5xl md:text-6xl font-bold mb-6 leading-tight">
            Your first battle<br />
            <span className="text-green-400 glow-text">starts free.</span>
          </h2>
          <p className="font-mono text-sm text-muted-foreground mb-10 max-w-md mx-auto leading-relaxed">
            Create an account and get matched immediately.
            Your ELO starts at 1200 — a blank slate, fair for everyone.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link href="/auth/register" className="btn-primary text-sm px-10 py-3.5">
              CREATE ACCOUNT →
            </Link>
            <Link href="/auth/login"
              className="font-mono text-xs text-muted-foreground hover:text-green-400 transition-colors tracking-wider">
              Sign in instead
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────────────── */}
      <footer className="px-6 md:px-12 py-8 border-t border-border"
        style={{ borderTopColor: "rgba(34,197,94,0.08)" }}>
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 border border-green-500/30 rotate-45 flex items-center justify-center">
              <span className="text-green-500 text-xs -rotate-45">⚔</span>
            </div>
            <span className="font-mono text-xs text-muted-foreground tracking-widest">CODEBATTLE</span>
          </div>
          <p className="font-mono text-xs text-muted-foreground">
            Built by Ronit Khanuja · MCA MNNIT Allahabad
          </p>
        </div>
      </footer>

      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}