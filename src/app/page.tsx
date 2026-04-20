"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion";
import { Shield, Swords, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { springGame, StaggerContainer, StaggerItem } from "@/components/motion";
import { toast } from "sonner";

type User = { _id: string; username: string };

/* ---------- random seed-safe helpers ---------- */
function seededAngles(count: number) {
  return Array.from({ length: count }, (_, i) => (i / count) * 360);
}

/* ---------- Boot-line data ---------- */
const BOOT_LINES = [
  { text: "> IRONLOG SYSTEM v4.2.0", color: "text-neon/70" },
  { text: "> Initializing neural-muscle link...", color: "text-dim" },
  { text: "> Loading strength protocols...", color: "text-dim" },
  { text: "> Calibrating rep counters... OK", color: "text-neon/50" },
  { text: "> XP engine online", color: "text-xp" },
  { text: "> SYSTEM READY", color: "text-neon" },
];

/* ---------- SVG Lifter silhouette (deadlift pose) ---------- */
function LifterSVG({ phase }: { phase: number }) {
  return (
    <motion.svg
      viewBox="0 0 200 260"
      className="w-44 h-auto"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Body - torso */}
      <motion.path
        d="M100,60 L100,140"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        className="text-bright"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.4 }}
      />
      {/* Head */}
      <motion.circle
        cx="100" cy="46" r="14"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        className="text-bright"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      />
      {/* Arms going down to bar */}
      <motion.path
        d="M100,80 L68,130 L60,160"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        className="text-bright"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.4, delay: 0.15 }}
      />
      <motion.path
        d="M100,80 L132,130 L140,160"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        className="text-bright"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.4, delay: 0.15 }}
      />
      {/* Legs (bent) */}
      <motion.path
        d="M100,140 L80,190 L75,230"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        className="text-bright"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      />
      <motion.path
        d="M100,140 L120,190 L125,230"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        className="text-bright"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      />

      {/* Barbell */}
      <motion.line
        x1="30" y1="160" x2="170" y2="160"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        className="text-neon"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        style={{ filter: "drop-shadow(0 0 8px rgba(0,240,255,0.6))" }}
      />
      {/* Left plates */}
      <motion.rect
        x="28" y="145" width="10" height="30" rx="2"
        className="fill-neon/20 stroke-neon"
        strokeWidth="1.5"
        initial={{ scaleY: 0 }}
        animate={{ scaleY: 1 }}
        transition={{ duration: 0.3, delay: 0.5 }}
        style={{ transformOrigin: "33px 160px" }}
      />
      <motion.rect
        x="16" y="140" width="12" height="40" rx="2"
        className="fill-neon/10 stroke-neon"
        strokeWidth="2"
        initial={{ scaleY: 0 }}
        animate={{ scaleY: 1 }}
        transition={{ duration: 0.3, delay: 0.55 }}
        style={{ transformOrigin: "22px 160px" }}
      />
      {/* Right plates */}
      <motion.rect
        x="162" y="145" width="10" height="30" rx="2"
        className="fill-neon/20 stroke-neon"
        strokeWidth="1.5"
        initial={{ scaleY: 0 }}
        animate={{ scaleY: 1 }}
        transition={{ duration: 0.3, delay: 0.5 }}
        style={{ transformOrigin: "167px 160px" }}
      />
      <motion.rect
        x="172" y="140" width="12" height="40" rx="2"
        className="fill-neon/10 stroke-neon"
        strokeWidth="2"
        initial={{ scaleY: 0 }}
        animate={{ scaleY: 1 }}
        transition={{ duration: 0.3, delay: 0.55 }}
        style={{ transformOrigin: "178px 160px" }}
      />

      {/* Power aura lines when lifting */}
      {phase >= 2 && (
        <>
          {[[-25, -10], [25, -10], [-30, 5], [30, 5], [-20, -25], [20, -25]].map(([dx, dy], i) => (
            <motion.line
              key={i}
              x1={100 + dx * 0.5}
              y1={100 + dy * 0.5}
              x2={100 + dx * 1.8}
              y2={100 + dy * 1.8}
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              className="text-xp"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: [0, 1, 0], opacity: [0, 1, 0] }}
              transition={{ duration: 0.6, delay: i * 0.06 }}
              style={{ filter: "drop-shadow(0 0 4px rgba(250,204,21,0.8))" }}
            />
          ))}
        </>
      )}
    </motion.svg>
  );
}

/* ---------- Glitch text component ---------- */
function GlitchText({ text, className }: { text: string; className?: string }) {
  return (
    <span className={`relative inline-block ${className ?? ""}`}>
      <motion.span
        className="absolute inset-0 text-hp/60"
        style={{ clipPath: "inset(20% 0 40% 0)" }}
        animate={{ x: [0, -3, 2, -1, 0], opacity: [0, 1, 1, 1, 0] }}
        transition={{ duration: 0.15, repeat: 3, repeatDelay: 0.8 }}
      >
        {text}
      </motion.span>
      <motion.span
        className="absolute inset-0 text-neon/60"
        style={{ clipPath: "inset(60% 0 5% 0)" }}
        animate={{ x: [0, 2, -3, 1, 0], opacity: [0, 1, 1, 1, 0] }}
        transition={{ duration: 0.15, repeat: 3, repeatDelay: 1.1, delay: 0.05 }}
      >
        {text}
      </motion.span>
      <span className="relative">{text}</span>
    </span>
  );
}

/* ==========  INTRO SPLASH  ========== */

function IntroSplash({ onComplete }: { onComplete: () => void }) {
  // phases: 0=boot terminal, 1=lifter appears, 2=power up (aura), 3=title slam, 4=shatter exit
  const [phase, setPhase] = useState(0);
  const [bootLine, setBootLine] = useState(0);
  const progress = useMotionValue(0);
  const progressWidth = useTransform(progress, [0, 1], ["0%", "100%"]);

  const angles = useMemo(() => seededAngles(24), []);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    BOOT_LINES.forEach((_, i) => {
      timers.push(setTimeout(() => setBootLine(i + 1), 150 + i * 200));
    });
    timers.push(setTimeout(() => setPhase(1), 1350));
    timers.push(setTimeout(() => setPhase(2), 2050));
    timers.push(setTimeout(() => setPhase(3), 2550));
    timers.push(setTimeout(() => setPhase(4), 3250));
    timers.push(setTimeout(onComplete, 3800));
    return () => timers.forEach(clearTimeout);
  }, [onComplete]);

  // Animate progress bar
  useEffect(() => {
    const dur = 3500;
    const start = performance.now();
    let raf: number;
    function tick(now: number) {
      const t = Math.min((now - start) / dur, 1);
      progress.set(t);
      if (t < 1) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [progress]);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-void overflow-hidden"
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* ---- Background grid pulse ---- */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(0,240,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(0,240,255,0.08) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.15, 0.05] }}
        transition={{ duration: 2, ease: "easeOut" }}
      />

      {/* ---- Heartbeat EKG line across screen ---- */}
      <motion.svg
        className="absolute top-1/2 left-0 w-full h-20 -translate-y-1/2 pointer-events-none"
        viewBox="0 0 1200 80"
        preserveAspectRatio="none"
        initial={{ opacity: 0 }}
        animate={phase >= 1 ? { opacity: [0, 0.6, 0.2] } : {}}
        transition={{ duration: 1.5 }}
      >
        <motion.polyline
          points="0,40 200,40 250,40 270,15 290,65 310,25 330,55 350,40 500,40 600,40 650,40 670,15 690,65 710,25 730,55 750,40 900,40 1000,40 1050,40 1070,15 1090,65 1110,25 1130,55 1150,40 1200,40"
          fill="none"
          stroke="rgba(0,240,255,0.5)"
          strokeWidth="2"
          initial={{ pathLength: 0 }}
          animate={phase >= 1 ? { pathLength: 1 } : {}}
          transition={{ duration: 1.8, ease: "easeInOut" }}
          style={{ filter: "drop-shadow(0 0 6px rgba(0,240,255,0.4))" }}
        />
      </motion.svg>

      {/* ---- Phase 0: Boot Terminal ---- */}
      <AnimatePresence>
        {phase < 1 && (
          <motion.div
            className="absolute top-[15%] left-1/2 -translate-x-1/2 w-80 font-mono text-[11px] leading-relaxed"
            exit={{ opacity: 0, y: -30, filter: "blur(4px)" }}
            transition={{ duration: 0.4 }}
          >
            {BOOT_LINES.slice(0, bootLine).map((line, i) => (
              <motion.div
                key={i}
                className={line.color}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.15 }}
              >
                {line.text}
                {i === bootLine - 1 && (
                  <motion.span
                    className="inline-block w-2 h-3.5 bg-neon ml-1 align-middle"
                    animate={{ opacity: [1, 0] }}
                    transition={{ repeat: Infinity, duration: 0.6 }}
                  />
                )}
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ---- Phase 1-3: Lifter Silhouette ---- */}
      <AnimatePresence>
        {phase >= 1 && phase < 4 && (
          <motion.div
            className="relative z-10"
            initial={{ opacity: 0, scale: 0.8, y: 30 }}
            animate={
              phase === 2
                ? { opacity: 1, scale: 1.05, y: -10 }
                : phase === 3
                  ? { opacity: 1, scale: 0.6, y: -120 }
                  : { opacity: 1, scale: 1, y: 0 }
            }
            exit={{ opacity: 0, scale: 2, filter: "blur(20px)" }}
            transition={
              phase === 2
                ? { duration: 0.5, ease: [0.22, 1, 0.36, 1] }
                : phase === 3
                  ? { duration: 0.6, ease: [0.22, 1, 0.36, 1] }
                  : { duration: 0.5, type: "spring", stiffness: 200, damping: 20 }
            }
          >
            {/* Neon aura behind lifter */}
            {phase >= 2 && (
              <motion.div
                className="absolute inset-0 -m-16"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
                <div
                  className="w-full h-full rounded-full"
                  style={{
                    background: "radial-gradient(circle, rgba(0,240,255,0.15) 0%, rgba(168,85,247,0.08) 40%, transparent 70%)",
                    filter: "blur(25px)",
                  }}
                />
              </motion.div>
            )}

            <LifterSVG phase={phase} />

            {/* Energy burst ring on power-up */}
            {phase >= 2 && (
              <>
                <motion.div
                  className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-xp/40"
                  initial={{ width: 0, height: 0, opacity: 1 }}
                  animate={{ width: 350, height: 350, opacity: 0 }}
                  transition={{ duration: 1.2, ease: "easeOut" }}
                  style={{ filter: "drop-shadow(0 0 10px rgba(250,204,21,0.5))" }}
                />
                {/* Flying particles */}
                {angles.map((angle, i) => {
                  const rad = (angle * Math.PI) / 180;
                  const dist = 80 + (i % 3) * 40;
                  return (
                    <motion.div
                      key={i}
                      className={`absolute left-1/2 top-1/2 rounded-full ${i % 3 === 0 ? "bg-xp h-1.5 w-1.5" : i % 3 === 1 ? "bg-neon h-1 w-1" : "bg-plasma h-1 w-1"}`}
                      initial={{ x: 0, y: 0, opacity: 0, scale: 0 }}
                      animate={{
                        x: Math.cos(rad) * dist,
                        y: Math.sin(rad) * dist,
                        opacity: [0, 1, 0],
                        scale: [0, 2, 0],
                      }}
                      transition={{ duration: 1, delay: i * 0.02, ease: "easeOut" }}
                      style={{ filter: `drop-shadow(0 0 3px ${i % 3 === 0 ? "rgba(250,204,21,0.8)" : i % 3 === 1 ? "rgba(0,240,255,0.8)" : "rgba(168,85,247,0.8)"})` }}
                    />
                  );
                })}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ---- Phase 3: Title SLAM ---- */}
      <AnimatePresence>
        {phase >= 3 && phase < 4 && (
          <motion.div
            className="relative z-20 text-center"
            initial={{ opacity: 0, scale: 3, y: 0 }}
            animate={{ opacity: 1, scale: 1, y: 20 }}
            exit={{ opacity: 0, scale: 0.5, y: 50, filter: "blur(10px)" }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
          >
            <h1 className="font-mono text-6xl sm:text-7xl font-black tracking-[0.15em] text-bright">
              <GlitchText text="IRONLOG" className="neon-text" />
            </h1>

            {/* Underline slash */}
            <motion.div
              className="mx-auto mt-4 h-1 rounded-full bg-gradient-to-r from-transparent via-neon to-transparent"
              initial={{ width: 0 }}
              animate={{ width: 280 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
              style={{ boxShadow: "0 0 20px rgba(0,240,255,0.5)" }}
            />

            <motion.p
              className="mt-4 font-mono text-xs tracking-[0.35em] text-xp/70 uppercase"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
            >
              Forge Your Strength
            </motion.p>

            {/* Stat badges */}
            <motion.div
              className="mt-5 flex items-center justify-center gap-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              {[
                { label: "STR", color: "text-hp" },
                { label: "END", color: "text-neon" },
                { label: "PWR", color: "text-xp" },
                { label: "VIT", color: "text-plasma" },
              ].map((stat, i) => (
                <motion.div
                  key={stat.label}
                  className={`font-mono text-[10px] tracking-[0.2em] ${stat.color} border border-current/20 px-2.5 py-1 rounded-sm`}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.45 + i * 0.06, type: "spring", stiffness: 500, damping: 20 }}
                  style={{ textShadow: "0 0 8px currentColor" }}
                >
                  {stat.label}
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ---- Phase 4: Shatter overlay (screen crack lines) ---- */}
      <AnimatePresence>
        {phase >= 4 && (
          <>
            {/* Screen flash */}
            <motion.div
              className="absolute inset-0 z-40 bg-neon/20"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 1, 0] }}
              transition={{ duration: 0.3 }}
            />
            {/* Crack lines */}
            <motion.svg
              className="absolute inset-0 z-30 w-full h-full pointer-events-none"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.8, 0] }}
              transition={{ duration: 0.7 }}
            >
              {[
                "M50,50 L20,10", "M50,50 L80,5", "M50,50 L95,35",
                "M50,50 L90,70", "M50,50 L70,95", "M50,50 L30,90",
                "M50,50 L5,65", "M50,50 L10,30",
                "M50,50 L40,5", "M50,50 L60,95", "M50,50 L5,50", "M50,50 L95,50",
              ].map((d, i) => (
                <motion.path
                  key={i}
                  d={d}
                  fill="none"
                  stroke="rgba(0,240,255,0.6)"
                  strokeWidth="0.3"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.25, delay: i * 0.015 }}
                  style={{ filter: "drop-shadow(0 0 3px rgba(0,240,255,0.5))" }}
                />
              ))}
            </motion.svg>
            {/* Falling shards */}
            {Array.from({ length: 10 }).map((_, i) => {
              const left = 15 + (i * 7) % 70;
              const top = 10 + (i * 13) % 60;
              const rot = -30 + (i * 47) % 60;
              return (
                <motion.div
                  key={i}
                  className="absolute z-30 border border-neon/30 bg-neon/5"
                  style={{ left: `${left}%`, top: `${top}%`, width: 20 + (i % 3) * 15, height: 15 + (i % 4) * 10 }}
                  initial={{ opacity: 0, rotate: 0 }}
                  animate={{ opacity: [0, 0.6, 0], y: [0, 200 + i * 20], rotate: rot, scale: [1, 0.5] }}
                  transition={{ duration: 0.7, delay: 0.1 + i * 0.03, ease: "easeIn" }}
                />
              );
            })}
          </>
        )}
      </AnimatePresence>

      {/* ---- Progress bar ---- */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-56">
        <motion.div
          className="h-1 rounded-full overflow-hidden bg-slate-deep/60 border border-slate-border/30"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-neon via-plasma to-xp"
            style={{ width: progressWidth, boxShadow: "0 0 12px rgba(0,240,255,0.4)" }}
          />
        </motion.div>
        <motion.p
          className="mt-2 text-center font-mono text-[9px] tracking-[0.3em] text-steel uppercase"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          Initializing
        </motion.p>
      </div>

      {/* Scanlines */}
      <div className="absolute inset-0 pointer-events-none scanlines" />
    </motion.div>
  );
}

/* ==========  MAIN PAGE  ========== */

export default function Home() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [username, setUsername] = useState("");
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [showIntro, setShowIntro] = useState(true);

  async function loadUsers() {
    setLoadingUsers(true);
    try {
      const res = await fetch("/api/users");
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Could not load users. Check connection.");
      setUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  }

  useEffect(() => { loadUsers(); }, []);

  const handleIntroComplete = useCallback(() => setShowIntro(false), []);

  async function login(chosen: string) {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: chosen }),
    });
    if (!res.ok) {
      toast.error("Username must be 3-24 chars (a-z, 0-9, _.-)");
      return;
    }
    toast.success(`Player ${chosen.toLowerCase()} loaded`);
    router.push("/dashboard");
  }

  return (
    <>
      <AnimatePresence>{showIntro && <IntroSplash onComplete={handleIntroComplete} />}</AnimatePresence>

      {!showIntro && (
        <main className="relative mx-auto flex min-h-screen w-full max-w-lg flex-col items-center justify-center px-5 py-16">
          {/* Ambient neon glow */}
          <div className="pointer-events-none absolute left-1/2 top-[20%] -translate-x-1/2">
            <div className="h-[350px] w-[450px] rounded-full bg-neon/[0.04] blur-[100px]" />
          </div>
          <div className="pointer-events-none absolute bottom-[15%] right-0">
            <div className="h-[200px] w-[200px] rounded-full bg-plasma/[0.04] blur-[80px]" />
          </div>

          {/* Logo + Title */}
          <motion.div
            className="relative mb-14 text-center"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            <motion.div
              className="relative mx-auto mb-6 flex h-20 w-20 items-center justify-center"
              initial={{ scale: 0, rotate: -30 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ ...springGame, delay: 0.15 }}
            >
              <div className="absolute inset-0 rounded-xl border-2 border-neon/30 bg-neon/5 shadow-[0_0_30px_rgba(0,240,255,0.15),inset_0_0_20px_rgba(0,240,255,0.05)]" />
              <Shield className="relative h-9 w-9 text-neon" style={{ filter: "drop-shadow(0 0 8px rgba(0,240,255,0.5))" }} />
            </motion.div>
            <h1 className="font-mono text-4xl font-black tracking-[0.08em] text-bright neon-text">
              IRONLOG
            </h1>
            <div className="mx-auto mt-3 flex items-center justify-center gap-2">
              <div className="h-px w-8 bg-gradient-to-r from-transparent to-neon/30" />
              <p className="font-mono text-[10px] tracking-[0.3em] text-neon/50">
                STRENGTH &bull; TRACKER &bull; RPG
              </p>
              <div className="h-px w-8 bg-gradient-to-l from-transparent to-neon/30" />
            </div>
          </motion.div>

          {/* Player Select */}
          {loadingUsers && (
            <motion.div
              className="mb-8 flex w-full flex-col items-center gap-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <div className="flex items-center gap-2">
                <Swords className="h-3.5 w-3.5 text-neon/60" />
                <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-neon/50">
                  Scanning Players
                </p>
              </div>
              <Card className="w-full overflow-hidden p-0">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className={`flex items-center gap-3 px-5 py-4 ${i !== 2 ? "border-b border-slate-border/50" : ""}`}
                  >
                    <motion.div
                      className="h-8 w-8 rounded-sm bg-neon/5 border border-neon/10"
                      animate={{ opacity: [0.3, 0.6, 0.3] }}
                      transition={{ repeat: Infinity, duration: 1.4, ease: "easeInOut", delay: i * 0.15 }}
                    />
                    <motion.div
                      className="h-3 rounded-sm bg-slate-border/40"
                      style={{ width: `${100 - i * 20}px` }}
                      animate={{ opacity: [0.2, 0.5, 0.2] }}
                      transition={{ repeat: Infinity, duration: 1.4, ease: "easeInOut", delay: i * 0.15 }}
                    />
                  </div>
                ))}
              </Card>
              <div className="flex items-center gap-2">
                {[0, 1, 2].map((i) => (
                  <motion.span
                    key={i}
                    className="h-1.5 w-1.5 rounded-full bg-neon"
                    animate={{ opacity: [0.2, 1, 0.2], scale: [0.8, 1.2, 0.8] }}
                    transition={{ repeat: Infinity, duration: 1, ease: "easeInOut", delay: i * 0.12 }}
                    style={{ filter: "drop-shadow(0 0 3px rgba(0,240,255,0.6))" }}
                  />
                ))}
              </div>
            </motion.div>
          )}
          {!loadingUsers && users.length > 0 && (
            <StaggerContainer className="mb-8 w-full">
              <div className="mb-3 flex items-center gap-2">
                <Swords className="h-3.5 w-3.5 text-neon/60" />
                <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-neon/50">
                  Select Player
                </p>
              </div>
              <Card className="overflow-hidden p-0">
                {users.map((user, index) => (
                  <StaggerItem key={user._id}>
                    <motion.button
                      type="button"
                      className={`group flex w-full items-center justify-between px-5 py-4 text-left transition-all hover:bg-neon/5 active:bg-neon/10 ${
                        index !== users.length - 1 ? "border-b border-slate-border/50" : ""
                      }`}
                      onClick={() => login(user.username)}
                      whileTap={{ scale: 0.985 }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-sm border border-neon/20 bg-neon/5 font-mono text-xs font-bold text-neon">
                          {user.username.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-base font-semibold uppercase tracking-wide text-soft group-hover:text-neon">
                          {user.username}
                        </span>
                      </div>
                      <ChevronRight className="h-4 w-4 text-steel transition-all group-hover:translate-x-1 group-hover:text-neon" />
                    </motion.button>
                  </StaggerItem>
                ))}
              </Card>
            </StaggerContainer>
          )}

          {/* New Player */}
          <motion.div
            className="w-full"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: users.length ? 0.35 : 0.12, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="mb-3 flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-xp shadow-[0_0_6px_rgba(250,204,21,0.5)]" />
              <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-xp/60">
                Create Player
              </p>
            </div>
            <Card className="overflow-hidden p-0">
              <div className="border-b border-slate-border/50 px-5 py-4">
                <Input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="ENTER CALLSIGN..."
                  onKeyDown={(e) => e.key === "Enter" && login(username)}
                />
              </div>
              <div className="px-5 py-4">
                <Button onClick={() => login(username)} className="w-full">
                  <Swords className="h-3.5 w-3.5" /> Begin Quest
                </Button>
              </div>
            </Card>
          </motion.div>

          {/* Bottom HUD decoration */}
          <motion.div
            className="mt-16 flex items-center gap-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.6 }}
          >
            <div className="h-px w-12 bg-gradient-to-r from-transparent to-slate-border" />
            <div className="h-1.5 w-1.5 rotate-45 border border-neon/30 bg-neon/10" />
            <div className="h-px w-12 bg-gradient-to-l from-transparent to-slate-border" />
          </motion.div>
        </main>
      )}
    </>
  );
}
