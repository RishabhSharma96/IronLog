"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  Dumbbell,
  LogOut,
  Music,
  Shield,
  Swords,
  Target,
  TrendingUp,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ProgressChart } from "@/components/progress-chart";
import {
  XpBar, fadeInUp, springGame, StaggerContainer, StaggerItem,
  CountUp, SuccessFlash, XpPopup, HoverGlowCard, PowerDown,
} from "@/components/motion";
import { DAY_LABELS, DAY_ORDER, DAY_SHORT_LABELS, dayKeyToSlug, type DayKey } from "@/lib/week";
import { METRICS_LIST, type MetricKey, METRICS, fromBaseUnit } from "@/lib/metrics";
import {
  countsFromExercises,
  formatLocalYMD,
  type QuestCountSnapshot,
} from "@/lib/quest-count-history";
import { daySplitSubtitle, emptyDayLabels, mergeDayLabels, type DayLabelsMap } from "@/lib/day-labels";

type Exercise = { _id: string; dayOfWeek: DayKey; subs: { _id: string }[] };
type MetricRow = { _id: string; metric: MetricKey; value: number; inputUnit: string; createdAt?: string };
type MainTab = "exercises" | "body";

function computeXp(exercises: Exercise[]) {
  let xp = 0;
  for (const ex of exercises) {
    xp += 25;
    xp += ex.subs.length * 15;
  }
  return xp;
}

function xpToLevel(xp: number) {
  const base = 100;
  let level = 1;
  let remaining = xp;
  let needed = base;
  while (remaining >= needed) {
    remaining -= needed;
    level++;
    needed = Math.floor(base * Math.pow(1.3, level - 1));
  }
  return { level, currentXp: remaining, neededXp: needed };
}

export function DashboardOverviewClient({ username }: { username: string }) {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [metricRows, setMetricRows] = useState<MetricRow[]>([]);
  const [questHistory, setQuestHistory] = useState<QuestCountSnapshot[]>([]);
  const [mainTab, setMainTab] = useState<MainTab>("exercises");
  const [activeMetric, setActiveMetric] = useState<MetricKey>("weight");
  const [metricUnit, setMetricUnit] = useState<string>("kg");
  const [metricInput, setMetricInput] = useState("");
  const [showProgress, setShowProgress] = useState<Record<MetricKey, boolean>>({} as Record<MetricKey, boolean>);
  const [logTrigger, setLogTrigger] = useState(0);
  const [poweringDown, setPoweringDown] = useState(false);
  const [dayLabels, setDayLabels] = useState<DayLabelsMap>(() => emptyDayLabels());

  const activeCfg = METRICS[activeMetric];

  const loadQuestSnapshots = async () => {
    const res = await fetch(`/api/quest-snapshots?username=${encodeURIComponent(username)}&days=90`);
    const payload = await res.json();
    const list = payload?.snapshots;
    setQuestHistory(Array.isArray(list) ? list : []);
  };

  async function syncQuestSnapshotForExercises(list: Exercise[]) {
    const counts = countsFromExercises(list);
    const date = formatLocalYMD(new Date());
    try {
      const res = await fetch("/api/quest-snapshots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, date, counts }),
      });
      if (!res.ok) toast.error("Could not save quest history");
    } catch {
      toast.error("Could not save quest history");
    } finally {
      await loadQuestSnapshots();
    }
  }

  const loadExercises = async () => {
    const res = await fetch(`/api/exercises?username=${username}`);
    const data = await res.json();
    const next = Array.isArray(data) ? data : [];
    setExercises(next);
    await syncQuestSnapshotForExercises(next);
  };

  const loadMetrics = async () => {
    const res = await fetch(`/api/body-metrics?username=${username}`);
    const data = await res.json();
    setMetricRows(Array.isArray(data) ? data : []);
  };

  const loadDayLabels = async () => {
    const res = await fetch(`/api/day-labels?username=${encodeURIComponent(username)}`);
    const data = await res.json().catch(() => ({}));
    setDayLabels(mergeDayLabels(data?.labels));
  };

  useEffect(() => {
    loadExercises();
    loadMetrics();
    loadDayLabels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function selectMetric(key: MetricKey) {
    setActiveMetric(key);
    setMetricInput("");
    const cfg = METRICS[key];
    setMetricUnit(cfg.units[0] || "");
  }

  async function logMetric() {
    const value = Number(metricInput);
    if (!Number.isFinite(value) || value <= 0) {
      toast.error("Enter a valid number");
      return;
    }
    const res = await fetch("/api/body-metrics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, metric: activeMetric, value, inputUnit: metricUnit }),
    });
    if (!res.ok) {
      const payload = await res.json().catch(() => ({}));
      toast.error(payload?.error ?? "Failed to save");
      return;
    }
    setMetricInput("");
    setLogTrigger((t) => t + 1);
    toast.success(`${activeCfg.label} logged — +10 XP`);
    await loadMetrics();
  }

  function switchUnit(nextUnit: string) {
    if (metricUnit === nextUnit) return;
    const value = Number(metricInput);
    if (Number.isFinite(value) && value > 0) {
      setMetricInput(fromBaseUnit(value, nextUnit).toFixed(2));
    }
    setMetricUnit(nextUnit);
  }

  const handleLogoutComplete = useCallback(() => {
    window.location.assign("/");
  }, []);

  async function logout() {
    setPoweringDown(true);
    await fetch("/api/auth/logout", { method: "POST" });
  }

  const totalXp = computeXp(exercises);
  const { level, currentXp, neededXp } = xpToLevel(totalXp);
  const totalMovements = exercises.length;
  const totalEntries = exercises.reduce((s, e) => s + e.subs.length, 0);

  const metricsWithData = METRICS_LIST.filter((m) => metricRows.some((r) => r.metric === m.key));

  return (
    <>
      <PowerDown active={poweringDown} onComplete={handleLogoutComplete} />

      <div className="mx-auto w-full max-w-6xl px-4 py-8 md:px-6">
        {/* Header */}
        <motion.header
          className="mb-8 flex flex-wrap items-start justify-between gap-4"
          variants={fadeInUp}
          initial="hidden"
          animate="visible"
        >
          <div>
            <div className="flex items-center gap-3">
              <motion.div
                className="relative flex h-12 w-12 items-center justify-center rounded-sm border-2 border-neon/30 bg-neon/5 shadow-[0_0_20px_rgba(0,240,255,0.12)]"
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ ...springGame, delay: 0.1 }}
              >
                <Shield className="h-6 w-6 text-neon" style={{ filter: "drop-shadow(0 0 6px rgba(0,240,255,0.5))" }} />
              </motion.div>
              <div>
                <h1 className="font-mono text-2xl font-black tracking-[0.06em] text-bright neon-text md:text-3xl">
                  IRONLOG
                </h1>
                <p className="font-mono text-[10px] tracking-[0.2em] text-muted">
                  PLAYER: <span className="text-neon">{username.toUpperCase()}</span>
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/music">
              <Button variant="ghost" size="sm">
                <Music className="h-3.5 w-3.5" /> MUSIC
              </Button>
            </Link>
            <Button variant="ghost" size="sm" onClick={logout}>
              <LogOut className="h-3.5 w-3.5" /> LOGOUT
            </Button>
          </div>
        </motion.header>

        {/* Player Stats Bar */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, ...springGame }}
        >
          <Card className="mb-8 p-0">
            <div className="grid grid-cols-2 gap-px bg-slate-border/30 sm:grid-cols-4">
              {[
                { icon: Zap, label: "LEVEL", value: level, color: "text-xp" },
                { icon: Target, label: "TOTAL XP", value: totalXp, color: "text-neon" },
                { icon: Swords, label: "MOVEMENTS", value: totalMovements, color: "text-plasma" },
                { icon: TrendingUp, label: "ENTRIES", value: totalEntries, color: "text-crit" },
              ].map((stat, i) => (
                <motion.div
                  key={stat.label}
                  className="group relative flex items-center gap-3 bg-slate-deep/90 px-4 py-4 overflow-hidden"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + i * 0.08, ...springGame }}
                  whileHover={{ backgroundColor: "rgba(0,240,255,0.03)" }}
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.3 + i * 0.08, type: "spring", stiffness: 500, damping: 20 }}
                  >
                    <stat.icon className={`h-4 w-4 ${stat.color}`} style={{ filter: "drop-shadow(0 0 4px currentColor)" }} />
                  </motion.div>
                  <div>
                    <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted">{stat.label}</p>
                    <p className={`font-mono text-lg font-bold ${stat.color}`}>
                      <CountUp to={stat.value} delay={0.4 + i * 0.1} />
                    </p>
                  </div>
                  <div className="pointer-events-none absolute -right-4 -top-4 h-16 w-16 rounded-full bg-neon/0 transition-all duration-500 group-hover:bg-neon/5 group-hover:blur-xl" />
                </motion.div>
              ))}
            </div>
            <div className="border-t border-slate-border/30 px-4 py-3">
              <div className="mb-1.5 flex items-center justify-between font-mono text-[9px] uppercase tracking-[0.2em]">
                <span className="text-xp/70">LVL {level} → LVL {level + 1}</span>
                <span className="text-muted">{currentXp} / {neededXp} XP</span>
              </div>
              <XpBar value={currentXp} max={neededXp} />
            </div>
          </Card>
        </motion.div>

        {/* ===== Main Tab Switcher ===== */}
        <motion.div
          className="mb-6"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18 }}
        >
          <div className="relative flex rounded-sm border border-slate-border bg-slate-deep/80 p-1">
            {([
              { key: "exercises" as MainTab, label: "QUEST BOARD", icon: Dumbbell },
              { key: "body" as MainTab, label: "BODY STATS", icon: Activity },
            ]).map((tab) => {
              const isActive = mainTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setMainTab(tab.key)}
                  className={`relative flex flex-1 items-center justify-center gap-2 rounded-sm px-4 py-3 font-mono text-[10px] font-bold uppercase tracking-[0.15em] transition-colors ${isActive ? "text-void" : "text-muted hover:text-soft"}`}
                >
                  {isActive && (
                    <motion.span
                      layoutId="mainTabPill"
                      className="absolute inset-0 rounded-sm bg-neon shadow-[0_0_15px_rgba(0,240,255,0.3)]"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                  <tab.icon className="relative z-10 h-3.5 w-3.5" />
                  <span className="relative z-10">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* ===== Tab Content ===== */}
        <AnimatePresence mode="wait">
          {mainTab === "exercises" ? (
            <motion.div
              key="exercises"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            >
              <StaggerContainer className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {DAY_ORDER.map((day) => {
                  const dayExercises = exercises.filter((e) => e.dayOfWeek === day);
                  const subCount = dayExercises.reduce((s, e) => s + e.subs.length, 0);
                  const hasQuests = dayExercises.length > 0;
                  const splitLabel = daySplitSubtitle(day, dayLabels);
                  return (
                    <StaggerItem key={day}>
                      <Link href={`/dashboard/day/${dayKeyToSlug(day)}`} className="group block h-full">
                        <HoverGlowCard className="h-full" glowColor={hasQuests ? "neon" : "plasma"}>
                          <Card className="relative h-full overflow-hidden p-5 scanlines">
                            <motion.div
                              className={`absolute right-4 top-4 h-2 w-2 rounded-full ${hasQuests ? "bg-neon shadow-[0_0_8px_rgba(0,240,255,0.6)]" : "bg-steel"}`}
                              style={hasQuests ? { animation: "pulse-neon 2s ease-in-out infinite" } : undefined}
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ delay: 0.5, type: "spring", stiffness: 500, damping: 15 }}
                            />
                            <motion.div
                              className="absolute left-0 top-0 h-full w-[2px] bg-gradient-to-b from-neon/60 via-plasma/30 to-transparent"
                              initial={{ scaleY: 0 }}
                              animate={{ scaleY: 1 }}
                              transition={{ duration: 0.6, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
                              style={{ transformOrigin: "top" }}
                            />
                            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                              <span className="font-mono text-[11px] font-bold tracking-[0.2em] text-neon">
                                {DAY_SHORT_LABELS[day]}
                              </span>
                              <p className="text-lg font-bold uppercase tracking-wide">{DAY_LABELS[day]}</p>
                            </div>
                            {splitLabel ? (
                              <p className="mt-1 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-plasma">
                                {splitLabel}
                              </p>
                            ) : null}
                            <div className="mt-3 space-y-1 font-mono text-[10px] tracking-wider">
                              <div className="flex items-center gap-2">
                                <Target className="h-3 w-3 text-neon/60" />
                                <span className="text-muted">QUESTS:</span>
                                <span className="font-bold text-neon"><CountUp to={dayExercises.length} delay={0.6} /></span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Zap className="h-3 w-3 text-xp/60" />
                                <span className="text-muted">ENTRIES:</span>
                                <span className="font-bold text-xp"><CountUp to={subCount} delay={0.7} /></span>
                              </div>
                              {questHistory.length > 0 && (
                                <div className="mt-3 border-t border-slate-border/25 pt-3">
                                  <p className="mb-1.5 font-mono text-[9px] uppercase tracking-[0.15em] text-muted/90">
                                    Quest count (daily)
                                  </p>
                                  <ProgressChart
                                    compact
                                    compactDateAxis
                                    values={questHistory.map((s) => s.counts[day])}
                                    dates={questHistory.map((s) => `${s.date}T12:00:00`)}
                                  />
                                </div>
                              )}
                            </div>
                          </Card>
                        </HoverGlowCard>
                      </Link>
                    </StaggerItem>
                  );
                })}
              </StaggerContainer>
            </motion.div>
          ) : (
            <motion.div
              key="body"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            >
              {/* Metric selector pills */}
              <div className="mb-5 flex flex-wrap gap-1.5">
                {METRICS_LIST.map((m) => {
                  const isActive = activeMetric === m.key;
                  const rows = metricRows.filter((r) => r.metric === m.key);
                  const latest = rows.length ? rows[rows.length - 1].value : null;
                  return (
                    <button
                      key={m.key}
                      type="button"
                      onClick={() => selectMetric(m.key)}
                      className={`relative rounded-sm px-3 py-2 font-mono text-[9px] font-bold uppercase tracking-wider transition-colors ${isActive ? "text-void" : rows.length ? "text-soft hover:text-neon" : "text-muted hover:text-soft"}`}
                    >
                      {isActive && (
                        <motion.span
                          layoutId="metricPill"
                          className="absolute inset-0 rounded-sm bg-neon shadow-[0_0_10px_rgba(0,240,255,0.25)]"
                          transition={{ type: "spring", stiffness: 400, damping: 30 }}
                        />
                      )}
                      <span className="relative z-10 flex items-center gap-1.5">
                        {m.shortLabel}
                        {latest !== null && !isActive && (
                          <span className="text-neon/50">{latest}</span>
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Active metric card */}
              <Card className="relative mb-6 overflow-hidden p-0">
                <SuccessFlash trigger={logTrigger} color="xp" />
                <XpPopup trigger={logTrigger} amount={10} />

                {/* Header */}
                <div className="border-b border-slate-border/30 px-5 py-4">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Activity className={`h-4 w-4 ${activeCfg.color} opacity-70`} style={{ filter: "drop-shadow(0 0 4px currentColor)" }} />
                      <p className="font-mono text-xs font-bold uppercase tracking-[0.15em]">
                        {activeCfg.label}
                      </p>
                    </div>
                    <p className="font-mono text-[10px] tracking-wider text-muted">
                      CURRENT: <span className={activeCfg.color}>
                        {(() => {
                          const rows = metricRows.filter((r) => r.metric === activeMetric);
                          return rows.length ? `${rows[rows.length - 1].value} ${activeCfg.baseUnit.toUpperCase()}` : "—";
                        })()}
                      </span>
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {activeCfg.units.length > 1 && activeCfg.units.map((u) => (
                      <Button key={u} size="sm" variant={metricUnit === u ? "default" : "outline"} onClick={() => switchUnit(u)}>
                        {u.toUpperCase()}
                      </Button>
                    ))}
                    <Input
                      type="number"
                      step="0.1"
                      value={metricInput}
                      onChange={(e) => setMetricInput(e.target.value)}
                      placeholder={`${activeCfg.label} (${metricUnit || activeCfg.baseUnit})`}
                      className="min-w-[130px] flex-1"
                      onKeyDown={(e) => e.key === "Enter" && logMetric()}
                    />
                    <Button size="sm" onClick={logMetric}>LOG</Button>
                  </div>
                </div>

                {/* Graph */}
                <div className="px-5 py-3">
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full"
                    onClick={() => setShowProgress((p) => ({ ...p, [activeMetric]: !p[activeMetric] }))}
                  >
                    {showProgress[activeMetric] ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingUp className="h-3.5 w-3.5" />}
                    PROGRESS GRAPH
                  </Button>
                  <AnimatePresence initial={false}>
                    {showProgress[activeMetric] && (
                      <motion.div
                        layout
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                        className="overflow-hidden"
                      >
                        <motion.div
                          className="mt-3 space-y-2 rounded-sm border border-slate-border/30 bg-abyss/50 p-3"
                          initial={{ scale: 0.95, filter: "blur(4px)" }}
                          animate={{ scale: 1, filter: "blur(0px)" }}
                          transition={{ duration: 0.4, delay: 0.1 }}
                        >
                          {(() => {
                            const rows = metricRows.filter((r) => r.metric === activeMetric);
                            const first = rows.length ? rows[0].value : null;
                            const latest = rows.length ? rows[rows.length - 1].value : null;
                            const d = first !== null && latest !== null && rows.length > 1 ? (latest - first).toFixed(2) : "0";
                            const unit = activeCfg.baseUnit.toUpperCase();
                            return (
                              <>
                                <div className="flex items-center justify-between font-mono text-[10px] tracking-wider text-muted">
                                  <span>START: {first !== null ? `${first} ${unit}` : "—"}</span>
                                  <span>DELTA: <span className="text-xp">{d} {unit}</span></span>
                                </div>
                                <ProgressChart values={rows.map((r) => r.value)} dates={rows.map((r) => r.createdAt ?? "")} suffix={unit ? ` ${unit}` : ""} />
                              </>
                            );
                          })()}
                        </motion.div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </Card>

              {/* Summary grid of all metrics that have data */}
              {metricsWithData.length > 0 && (
                <>
                  <div className="mb-3 flex items-center gap-2">
                    <Activity className="h-3 w-3 text-neon/40" />
                    <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-neon/40">All Stats</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                    {metricsWithData.map((m) => {
                      const rows = metricRows.filter((r) => r.metric === m.key);
                      const latest = rows[rows.length - 1].value;
                      const first = rows[0].value;
                      const d = rows.length > 1 ? latest - first : 0;
                      const unit = m.baseUnit.toUpperCase();
                      return (
                        <motion.button
                          key={m.key}
                          type="button"
                          onClick={() => selectMetric(m.key)}
                          className="group text-left"
                          whileHover={{ scale: 1.02 }}
                          transition={{ type: "spring", stiffness: 400, damping: 25 }}
                        >
                          <Card className="relative overflow-hidden p-4">
                            <div className={`absolute left-0 top-0 h-full w-[2px] ${m.color === "text-neon" ? "bg-neon/50" : m.color === "text-xp" ? "bg-xp/50" : m.color === "text-plasma" ? "bg-plasma/50" : m.color === "text-hp" ? "bg-hp/50" : "bg-crit/50"}`} />
                            <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted">{m.label}</p>
                            <p className={`mt-1 font-mono text-lg font-bold ${m.color}`}>
                              {latest}
                              <span className="ml-1 text-[10px] text-muted">{unit}</span>
                            </p>
                            {d !== 0 && (
                              <p className={`mt-0.5 font-mono text-[9px] tracking-wider ${d > 0 ? "text-xp" : "text-hp"}`}>
                                {d > 0 ? "+" : ""}{d.toFixed(1)} {unit}
                              </p>
                            )}
                          </Card>
                        </motion.button>
                      );
                    })}
                  </div>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
