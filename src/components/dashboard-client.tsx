"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Pencil, Trash2, LogOut, GripVertical, Shield, ArrowLeft, Target, Swords, Zap, ArrowUp, ArrowDown, Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ProgressChart } from "@/components/progress-chart";
import {
  fadeInUp, springGame, StaggerContainer, StaggerItem,
  SuccessFlash, ParticleBurst, XpPopup, PowerDown,
} from "@/components/motion";
import { DAY_LABELS, DAY_ORDER, type DayKey } from "@/lib/week";

type SubExercise = {
  _id: string;
  label: string;
  sets: number | null;
  reps: number | null;
  weightKg: number | null;
  durationMinutes: number | null;
  holdSeconds: number | null;
  inputUnit: "kg" | "lbs" | "minutes";
  notes: string;
  eachSide: boolean;
  order?: number;
  createdAt?: string;
};

type Exercise = {
  _id: string;
  name: string;
  dayOfWeek: DayKey;
  week: number;
  year: number;
  order?: number;
  subs: SubExercise[];
};

type Props = { username: string; initialDay?: DayKey; singleDayMode?: boolean };
type Unit = "kg" | "lbs" | "minutes";

const LB_TO_KG = 0.453592;
const blankSubForm = {
  label: "",
  sets: "",
  reps: "",
  weight: "",
  durationMinutes: "",
  holdSeconds: "",
  notes: "",
  eachSide: false,
  inputUnit: "kg" as Unit,
};

function subLabel(sub: SubExercise) {
  if (!["kg", "lbs", "minutes"].includes(sub.inputUnit)) return "";
  if (sub.inputUnit === "minutes") return `${sub.durationMinutes ?? 0} MIN`;
  const parts = [`${sub.reps ?? 0}x${sub.sets ?? 0}`];
  if (typeof sub.holdSeconds === "number" && sub.holdSeconds > 0) parts.push(`HOLD ${sub.holdSeconds}s`);
  if (typeof sub.weightKg === "number") parts.push(`${sub.weightKg}KG`);
  if (sub.eachSide) parts.push("Each side");
  return parts.join(" @ ");
}

function convertWeightInput(weight: string, from: Unit, to: Unit) {
  if (!weight || from === to) return weight;
  const value = Number(weight);
  if (!Number.isFinite(value)) return weight;
  if (from === "kg" && to === "lbs") return (value / LB_TO_KG).toFixed(2);
  if (from === "lbs" && to === "kg") return (value * LB_TO_KG).toFixed(2);
  return weight;
}

export function DashboardClient({ username, initialDay = "Mon", singleDayMode = false }: Props) {
  const [activeDay, setActiveDay] = useState<DayKey>(initialDay);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [addExerciseDay, setAddExerciseDay] = useState<DayKey | null>(null);
  const [exerciseName, setExerciseName] = useState("");
  const [pastNames, setPastNames] = useState<string[]>([]);
  const [editingExerciseId, setEditingExerciseId] = useState<string | null>(null);
  const [editingExerciseName, setEditingExerciseName] = useState("");
  const [subFormByExercise, setSubFormByExercise] = useState<Record<string, typeof blankSubForm>>({});
  const [editingSubId, setEditingSubId] = useState<string | null>(null);
  const [showProgressBySub, setShowProgressBySub] = useState<Record<string, boolean>>({});
  const [draggingSub, setDraggingSub] = useState<{ exerciseId: string; subId: string } | null>(null);
  const [dragOverSubId, setDragOverSubId] = useState<string | null>(null);
  const [questAddTrigger, setQuestAddTrigger] = useState(0);
  const [entryTriggers, setEntryTriggers] = useState<Record<string, number>>({});
  const [deleteTriggers, setDeleteTriggers] = useState<Record<string, number>>({});
  const [poweringDown, setPoweringDown] = useState(false);
  const [cloneSourceExercise, setCloneSourceExercise] = useState<Exercise | null>(null);
  const [cloneSubmittingDay, setCloneSubmittingDay] = useState<DayKey | null>(null);

  async function loadExercises() { setLoading(true); const res = await fetch(`/api/exercises?username=${username}`); setExercises(await res.json()); setLoading(false); }
  async function loadExerciseNames() { const res = await fetch(`/api/exercises/names?username=${username}`); setPastNames(await res.json()); }
  useEffect(() => { loadExercises(); loadExerciseNames(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  async function addExercise() {
    if (!addExerciseDay || !exerciseName.trim()) return;
    const res = await fetch("/api/exercises", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username, name: exerciseName, dayOfWeek: addExerciseDay }) });
    if (!res.ok) return toast.error("Failed to add quest");
    setQuestAddTrigger((t) => t + 1);
    toast.success("New quest added — +25 XP");
    setExerciseName(""); setAddExerciseDay(null); await loadExercises();
  }

  async function saveExerciseRename(id: string) {
    if (!editingExerciseName.trim()) return;
    const res = await fetch(`/api/exercises/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: editingExerciseName }) });
    if (!res.ok) return toast.error("Rename failed");
    toast.success("Quest renamed"); setEditingExerciseId(null); await loadExercises();
  }

  async function deleteExercise(id: string) {
    if (!confirm("Delete this quest and all entries?")) return;
    setDeleteTriggers((p) => ({ ...p, [id]: (p[id] ?? 0) + 1 }));
    await fetch(`/api/exercises/${id}`, { method: "DELETE" });
    toast.success("Quest removed"); await loadExercises();
  }

  async function cloneExerciseToDay(targetDay: DayKey) {
    if (!cloneSourceExercise) return;
    setCloneSubmittingDay(targetDay);
    const res = await fetch(`/api/exercises/${cloneSourceExercise._id}/clone`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username,
        dayOfWeek: targetDay,
        subs: cloneSourceExercise.subs ?? [],
      }),
    });

    if (!res.ok) {
      toast.error("Failed to clone quest");
      setCloneSubmittingDay(null);
      return;
    }

    const data = await res.json();
    const clonedSubCount = Number(data?.clonedSubCount ?? 0);
    toast.success(`Quest cloned to ${DAY_LABELS[targetDay]} (${clonedSubCount} entries)`);
    setCloneSourceExercise(null);
    setCloneSubmittingDay(null);
    await loadExercises();
  }

  async function reorderExercises(day: DayKey, sourceExerciseId: string, targetExerciseId: string) {
    if (sourceExerciseId === targetExerciseId) return;
    const dayExercises = grouped[day];
    const current = [...dayExercises];
    const sourceIndex = current.findIndex((exercise) => exercise._id === sourceExerciseId);
    const targetIndex = current.findIndex((exercise) => exercise._id === targetExerciseId);
    if (sourceIndex < 0 || targetIndex < 0) return;

    const [moved] = current.splice(sourceIndex, 1);
    current.splice(targetIndex, 0, moved);

    setExercises((prev) => {
      const next = [...prev];
      const currentById = new Map(current.map((exercise, index) => [exercise._id, { ...exercise, order: index }]));
      return next.map((exercise) => currentById.get(exercise._id) ?? exercise);
    });

    const res = await fetch("/api/exercises", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, dayOfWeek: day, exerciseIds: current.map((exercise) => exercise._id) }),
    });

    if (!res.ok) {
      toast.error("Quest reorder failed");
      await loadExercises();
      return;
    }

    toast.success("Quest order updated");
    await loadExercises();
  }

  function startSubForm(exerciseId: string, sub?: SubExercise) {
    setEditingSubId(sub?._id ?? null);
    setSubFormByExercise((prev) => ({
      ...prev,
      [exerciseId]: sub
        ? {
          label: sub.label ?? "",
          sets: sub.sets?.toString() ?? "",
          reps: sub.reps?.toString() ?? "",
          weight: typeof sub.weightKg === "number" ? (sub.inputUnit === "lbs" ? (sub.weightKg / LB_TO_KG).toFixed(2) : sub.weightKg.toString()) : "",
          durationMinutes: sub.durationMinutes?.toString() ?? "",
          holdSeconds: sub.holdSeconds?.toString() ?? "",
          notes: sub.notes ?? "",
          eachSide: Boolean(sub.eachSide),
          inputUnit: sub.inputUnit,
        }
        : blankSubForm,
    }));
  }

  async function saveSub(exerciseId: string) {
    const form = subFormByExercise[exerciseId] ?? blankSubForm;
    const payload = {
      username,
      label: form.label,
      notes: form.notes,
      eachSide: form.eachSide,
      inputUnit: form.inputUnit,
      sets: form.inputUnit === "minutes" ? null : Number(form.sets || 0),
      reps: form.inputUnit === "minutes" ? null : Number(form.reps || 0),
      weight: form.inputUnit === "minutes" ? null : Number(form.weight || 0),
      durationMinutes: form.inputUnit === "minutes" ? Number(form.durationMinutes || 0) : null,
      holdSeconds: form.inputUnit === "minutes" ? null : Number(form.holdSeconds || 0),
    };
    const endpoint = editingSubId ? `/api/exercises/${exerciseId}/subs/${editingSubId}` : `/api/exercises/${exerciseId}/subs`;
    const res = await fetch(endpoint, { method: editingSubId ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    if (!res.ok) return toast.error("Failed to save entry");
    setEntryTriggers((p) => ({ ...p, [exerciseId]: (p[exerciseId] ?? 0) + 1 }));
    toast.success(editingSubId ? "Entry updated" : "Entry logged — +15 XP");
    setSubFormByExercise((prev) => ({ ...prev, [exerciseId]: blankSubForm })); setEditingSubId(null); await loadExercises();
  }

  async function deleteSub(exerciseId: string, sid: string) {
    setDeleteTriggers((p) => ({ ...p, [sid]: (p[sid] ?? 0) + 1 }));
    await fetch(`/api/exercises/${exerciseId}/subs/${sid}`, { method: "DELETE" });
    toast.success("Entry removed"); await loadExercises();
  }

  async function reorderSubs(exerciseId: string, sourceSubId: string, targetSubId: string) {
    if (sourceSubId === targetSubId) return;
    const exercise = exercises.find((i) => i._id === exerciseId); if (!exercise) return;
    const current = [...exercise.subs]; const si = current.findIndex((i) => i._id === sourceSubId); const ti = current.findIndex((i) => i._id === targetSubId); if (si < 0 || ti < 0) return;
    const [moved] = current.splice(si, 1); current.splice(ti, 0, moved);
    setExercises((prev) => prev.map((i) => (i._id === exerciseId ? { ...i, subs: current } : i)));
    const res = await fetch(`/api/exercises/${exerciseId}/subs`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ subIds: current.map((i) => i._id) }) });
    if (!res.ok) { toast.error("Reorder failed"); await loadExercises(); return; }
    toast.success("Reordered");
  }

  const handleLogoutComplete = useCallback(() => { window.location.assign("/"); }, []);
  async function logout() { setPoweringDown(true); await fetch("/api/auth/logout", { method: "POST" }); }

  const grouped = DAY_ORDER.reduce<Record<DayKey, Exercise[]>>((acc, day) => {
    acc[day] = exercises
      .filter((exercise) => exercise.dayOfWeek === day)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    return acc;
  }, { Mon: [], Tue: [], Wed: [], Thu: [], Fri: [], Sat: [] });

  const activeDayQuestNames = grouped[activeDay].map((exercise) => exercise.name);

  return (
    <>
      <PowerDown active={poweringDown} onComplete={handleLogoutComplete} />

      <div className="mx-auto w-full max-w-7xl px-4 py-8 md:px-6">
        {/* Header */}
        <motion.header className="mb-8 flex flex-wrap items-center justify-between gap-4" variants={fadeInUp} initial="hidden" animate="visible">
          <div className="flex items-center gap-3">
            {singleDayMode && <Link href="/dashboard"><Button variant="outline" size="sm"><ArrowLeft className="h-3.5 w-3.5" /> HQ</Button></Link>}
            <div className="flex items-center gap-3">
              <motion.div
                className="flex h-10 w-10 items-center justify-center rounded-sm border-2 border-neon/30 bg-neon/5 shadow-[0_0_15px_rgba(0,240,255,0.1)]"
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ ...springGame, delay: 0.1 }}
              >
                <Shield className="h-5 w-5 text-neon" style={{ filter: "drop-shadow(0 0 4px rgba(0,240,255,0.5))" }} />
              </motion.div>
              <div>
                <h1 className="font-mono text-xl font-black tracking-[0.06em] text-bright neon-text md:text-2xl">IRONLOG</h1>
                <p className="font-mono text-[9px] tracking-[0.2em] text-muted">{singleDayMode ? `QUEST LOG: ${DAY_LABELS[activeDay].toUpperCase()}` : "MISSION CONTROL"}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <p className="font-mono text-[10px] tracking-wider text-muted">{username.toUpperCase()}</p>
            <Button variant="ghost" size="sm" onClick={logout}><LogOut className="h-3.5 w-3.5" /> EXIT</Button>
          </div>
        </motion.header>

        {/* Day picker (mobile) */}
        {!singleDayMode && (
          <motion.div
            className="mb-6 md:hidden"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="relative flex rounded-sm border border-slate-border bg-slate-deep/80 p-1">
              {DAY_ORDER.map((day) => {
                const isActive = activeDay === day;
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => setActiveDay(day)}
                    className={`relative flex-1 rounded-sm px-1 py-2.5 font-mono text-[10px] font-bold uppercase tracking-wider ${isActive ? "text-void" : "text-muted hover:text-soft"}`}
                  >
                    {isActive && (
                      <motion.span
                        layoutId="dayPillIndicator"
                        className="absolute inset-0 rounded-sm bg-neon shadow-[0_0_12px_rgba(0,240,255,0.3)]"
                        transition={{ type: "spring", stiffness: 380, damping: 32 }}
                      />
                    )}
                    <span className="relative z-10">{DAY_LABELS[day].slice(0, 3)}</span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}

        <motion.div
          className="mb-6 rounded-sm border border-slate-border/50 bg-slate-deep/70 px-4 py-3"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
        >
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-neon/60">
            {DAY_LABELS[activeDay]} Quest Queue
          </p>
          {activeDayQuestNames.length ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {activeDayQuestNames.map((name, index) => (
                <span key={`${name}-${index}`} className="rounded-sm border border-neon/30 bg-neon/5 px-2 py-1 font-mono text-[10px] uppercase tracking-wide text-soft">
                  {name}
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-2 font-mono text-[10px] tracking-wide text-muted">No quests planned for this day.</p>
          )}
        </motion.div>

        {/* Main Grid */}
        <div className={`grid gap-5 ${singleDayMode ? "" : "md:grid-cols-6"}`}>
          {(singleDayMode ? [activeDay] : DAY_ORDER).map((day) => {
            const isHidden = day !== activeDay;
            return (
              <section key={day} className={`${singleDayMode ? "block" : isHidden ? "hidden md:block" : "block"}`}>
                <motion.div
                  className="mb-3 flex items-center gap-2"
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.15 }}
                >
                  <Target className="h-3 w-3 text-neon/40" />
                  <h2 className="font-mono text-[10px] uppercase tracking-[0.25em] text-neon/40">{DAY_LABELS[day]}</h2>
                </motion.div>
                <StaggerContainer className="space-y-4">
                  {grouped[day].map((exercise) => {
                    const form = subFormByExercise[exercise._id];
                    const isEditingExercise = editingExerciseId === exercise._id;
                    return (
                      <StaggerItem key={exercise._id}>
                        <Card className="relative overflow-hidden p-0">
                          <SuccessFlash trigger={entryTriggers[exercise._id] ?? 0} color="neon" />
                          <XpPopup trigger={entryTriggers[exercise._id] ?? 0} amount={15} />
                          <ParticleBurst trigger={deleteTriggers[exercise._id] ?? 0} count={8} colors={["bg-hp", "bg-hp/60", "bg-xp"]} radius={50} />
                          <motion.div
                            className="absolute left-0 top-0 h-full w-[2px] bg-gradient-to-b from-neon/50 via-plasma/30 to-transparent"
                            initial={{ scaleY: 0 }}
                            animate={{ scaleY: 1 }}
                            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                            style={{ transformOrigin: "top" }}
                          />

                          {/* Quest header */}
                          <div className="border-b border-slate-border/30 px-5 py-3">
                            <div className="flex items-center justify-between gap-2">
                              {isEditingExercise ? (
                                <motion.div
                                  className="flex w-full flex-col gap-2 sm:flex-row"
                                  initial={{ opacity: 0, scale: 0.95 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  transition={springGame}
                                >
                                  <Input value={editingExerciseName} onChange={(e) => setEditingExerciseName(e.target.value)} className="flex-1" />
                                  <Button size="sm" onClick={() => saveExerciseRename(exercise._id)}>SAVE</Button>
                                </motion.div>
                              ) : (
                                <>
                                  <div className="flex items-center gap-2">
                                    <Swords className="h-3.5 w-3.5 text-neon/50" />
                                    <p className="text-sm font-bold uppercase tracking-wide">{exercise.name}</p>
                                  </div>
                                  <div className="flex gap-0.5">
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => {
                                        const dayExercises = grouped[day];
                                        const currentIndex = dayExercises.findIndex((item) => item._id === exercise._id);
                                        if (currentIndex <= 0) return;
                                        void reorderExercises(day, exercise._id, dayExercises[currentIndex - 1]._id);
                                      }}
                                    >
                                      <ArrowUp className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => {
                                        const dayExercises = grouped[day];
                                        const currentIndex = dayExercises.findIndex((item) => item._id === exercise._id);
                                        if (currentIndex < 0 || currentIndex >= dayExercises.length - 1) return;
                                        void reorderExercises(day, exercise._id, dayExercises[currentIndex + 1]._id);
                                      }}
                                    >
                                      <ArrowDown className="h-3 w-3" />
                                    </Button>
                                    <Button size="sm" variant="ghost" onClick={() => { setEditingExerciseId(exercise._id); setEditingExerciseName(exercise.name); }}><Pencil className="h-3 w-3" /></Button>
                                    <Button size="sm" variant="ghost" onClick={() => setCloneSourceExercise(exercise)}><Copy className="h-3 w-3" /></Button>
                                    <Button size="sm" variant="ghost" onClick={() => deleteExercise(exercise._id)}><Trash2 className="h-3 w-3 text-hp" /></Button>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Entries */}
                          <div className="divide-y divide-slate-border/20">
                            {exercise.subs.map((sub, index) => {
                              const progressOpen = Boolean(showProgressBySub[sub._id]);
                              const groupName = sub.label?.trim() || `Entry ${index + 1}`;
                              const lineInfo = subLabel(sub);
                              const ordered = exercise.subs.filter((i, ii) => (i.label?.trim() || `Entry ${ii + 1}`) === groupName).sort((a, b) => new Date(a.createdAt ?? 0).getTime() - new Date(b.createdAt ?? 0).getTime());
                              const weightEntries = ordered.filter((i) => typeof i.weightKg === "number" && Number.isFinite(i.weightKg));
                              const weightPoints = weightEntries.map((i) => i.weightKg!);
                              const weightDates = weightEntries.map((i) => i.createdAt ?? "");
                              const minuteEntries = ordered.filter((i) => typeof i.durationMinutes === "number" && Number.isFinite(i.durationMinutes));
                              const minutePoints = minuteEntries.map((i) => i.durationMinutes!);
                              const minuteDates = minuteEntries.map((i) => i.createdAt ?? "");

                              return (
                                <motion.div
                                  key={sub._id}
                                  layout
                                  draggable
                                  onDragStart={() => setDraggingSub({ exerciseId: exercise._id, subId: sub._id })}
                                  onDragEnd={() => { setDraggingSub(null); setDragOverSubId(null); }}
                                  onDragOver={(e) => { if (draggingSub?.exerciseId !== exercise._id || draggingSub.subId === sub._id) return; e.preventDefault(); setDragOverSubId(sub._id); }}
                                  onDrop={(e) => { e.preventDefault(); if (draggingSub?.exerciseId !== exercise._id || draggingSub.subId === sub._id) return; void reorderSubs(exercise._id, draggingSub.subId, sub._id); setDraggingSub(null); setDragOverSubId(null); }}
                                  className={`relative px-5 py-3 ${dragOverSubId === sub._id ? "bg-[rgba(0,240,255,0.05)]" : "hover:bg-[rgba(28,34,46,0.5)]"}`}
                                  whileDrag={{ scale: 1.03, boxShadow: "0 0 40px rgba(0,240,255,0.2)", zIndex: 50 }}
                                  initial={{ opacity: 0, x: -8 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={springGame}
                                >
                                  <ParticleBurst trigger={deleteTriggers[sub._id] ?? 0} count={6} colors={["bg-hp", "bg-hp/60"]} radius={40} />
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-start gap-2">
                                      <GripVertical className="mt-0.5 h-3 w-3 shrink-0 cursor-grab text-steel active:text-neon" />
                                      <p className="font-mono text-xs font-bold uppercase tracking-wider text-soft">{groupName}</p>
                                    </div>
                                    <div className="flex gap-0.5">
                                      <Button size="sm" variant="ghost" onClick={() => startSubForm(exercise._id, sub)}><Pencil className="h-2.5 w-2.5" /></Button>
                                      <Button size="sm" variant="ghost" onClick={() => deleteSub(exercise._id, sub._id)}><Trash2 className="h-2.5 w-2.5 text-hp" /></Button>
                                    </div>
                                  </div>
                                  {lineInfo && (
                                    <p className="mt-1 pl-5 font-mono text-[10px] tracking-wider text-muted">{lineInfo}</p>
                                  )}
                                  {sub.notes?.trim() && (
                                    <p className="mt-1 pl-5 text-[11px] text-soft/80">{sub.notes}</p>
                                  )}
                                  <div className="mt-2 pl-5">
                                    <Button size="sm" variant="outline" onClick={() => setShowProgressBySub((p) => ({ ...p, [sub._id]: !p[sub._id] }))}>
                                      <Zap className="h-2.5 w-2.5" /> {progressOpen ? "HIDE" : "STATS"}
                                    </Button>
                                  </div>
                                  <AnimatePresence initial={false}>
                                    {progressOpen && (
                                      <motion.div
                                        key="chart"
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: "auto", opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                                        className="overflow-hidden pl-5"
                                      >
                                        <motion.div
                                          className="mt-3 rounded-sm border border-slate-border/30 bg-abyss/40 p-3"
                                          initial={{ scale: 0.95, filter: "blur(3px)" }}
                                          animate={{ scale: 1, filter: "blur(0px)" }}
                                          transition={{ duration: 0.35, delay: 0.05 }}
                                        >
                                          <ProgressChart values={weightPoints.length ? weightPoints : minutePoints} dates={weightPoints.length ? weightDates : minuteDates} suffix={weightPoints.length ? " KG" : " MIN"} />
                                        </motion.div>
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </motion.div>
                              );
                            })}
                          </div>

                          {/* Add entry */}
                          <div className="border-t border-slate-border/20 px-5 py-3">
                            <AnimatePresence mode="wait">
                              {form ? (
                                <motion.div
                                  key="form"
                                  className="space-y-3 rounded-sm border border-neon/10 bg-abyss/30 p-3"
                                  initial={{ opacity: 0, height: 0, scale: 0.95 }}
                                  animate={{ opacity: 1, height: "auto", scale: 1 }}
                                  exit={{ opacity: 0, height: 0, scale: 0.95 }}
                                  transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                                >
                                  <Input placeholder="LABEL (OPTIONAL)" value={form.label} onChange={(e) => setSubFormByExercise((p) => ({ ...p, [exercise._id]: { ...form, label: e.target.value } }))} />
                                  <div className="grid grid-cols-3 gap-2">
                                    {(["kg", "lbs", "minutes"] as Unit[]).map((unit) => (
                                      <Button key={unit} variant={form.inputUnit === unit ? "default" : "outline"} size="sm" onClick={() => setSubFormByExercise((p) => ({ ...p, [exercise._id]: { ...form, inputUnit: unit, weight: convertWeightInput(form.weight, form.inputUnit, unit) } }))}>{unit.toUpperCase()}</Button>
                                    ))}
                                  </div>
                                  {form.inputUnit === "minutes" ? (
                                    <Input type="number" placeholder="DURATION (MIN)" value={form.durationMinutes} onChange={(e) => setSubFormByExercise((p) => ({ ...p, [exercise._id]: { ...form, durationMinutes: e.target.value } }))} />
                                  ) : (
                                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                      <Input type="number" placeholder="REPS" value={form.reps} onChange={(e) => setSubFormByExercise((p) => ({ ...p, [exercise._id]: { ...form, reps: e.target.value } }))} />
                                      <Input type="number" placeholder="SETS" value={form.sets} onChange={(e) => setSubFormByExercise((p) => ({ ...p, [exercise._id]: { ...form, sets: e.target.value } }))} />
                                      <Input type="number" placeholder={form.inputUnit === "lbs" ? "LBS" : "KG"} value={form.weight} onChange={(e) => setSubFormByExercise((p) => ({ ...p, [exercise._id]: { ...form, weight: e.target.value } }))} />
                                      <Input type="number" placeholder="HOLD (SEC)" value={form.holdSeconds} onChange={(e) => setSubFormByExercise((p) => ({ ...p, [exercise._id]: { ...form, holdSeconds: e.target.value } }))} />
                                    </div>
                                  )}
                                  <Input placeholder="NOTES (OPTIONAL)" value={form.notes} onChange={(e) => setSubFormByExercise((p) => ({ ...p, [exercise._id]: { ...form, notes: e.target.value } }))} />
                                  {form.inputUnit !== "minutes" && (
                                    <label className="flex items-center gap-2 text-xs text-soft">
                                      <input
                                        type="checkbox"
                                        checked={form.eachSide}
                                        onChange={(e) => setSubFormByExercise((p) => ({ ...p, [exercise._id]: { ...form, eachSide: e.target.checked } }))}
                                      />
                                      Each side
                                    </label>
                                  )}
                                  <div className="flex gap-2">
                                    <Button size="sm" onClick={() => saveSub(exercise._id)}>CONFIRM</Button>
                                    <Button size="sm" variant="ghost" onClick={() => { setEditingSubId(null); setSubFormByExercise((p) => { const c = { ...p }; delete c[exercise._id]; return c; }); }}>ABORT</Button>
                                  </div>
                                </motion.div>
                              ) : (
                                <motion.div key="add-btn" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                  <Button variant="dashed" size="sm" className="w-full" onClick={() => startSubForm(exercise._id)}>+ LOG ENTRY</Button>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </Card>
                      </StaggerItem>
                    );
                  })}
                  <Button variant="dashed" className="w-full" onClick={() => setAddExerciseDay(day)}>+ NEW QUEST</Button>
                </StaggerContainer>
              </section>
            );
          })}
        </div>

        {/* Add quest modal */}
        <AnimatePresence>
          {addExerciseDay && (
            <motion.div
              className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <motion.button
                type="button"
                aria-label="Close"
                className="absolute inset-0 bg-[rgba(10,12,16,0.85)] backdrop-blur-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setAddExerciseDay(null)}
              />
              <motion.div
                className="relative z-10 w-full max-w-md px-4 pb-10 pt-2 sm:pb-4"
                initial={{ y: "100%", opacity: 0.8, scale: 0.9 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: "100%", opacity: 0, scale: 0.9 }}
                transition={springGame}
              >
                {/* Energy burst ring behind modal */}
                <motion.div
                  className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                  initial={{ width: 0, height: 0, opacity: 0.8 }}
                  animate={{ width: 300, height: 300, opacity: 0 }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                >
                  <div className="h-full w-full rounded-full border border-neon/20" style={{ filter: "drop-shadow(0 0 10px rgba(0,240,255,0.3))" }} />
                </motion.div>

                <Card className="relative overflow-hidden p-0">
                  <SuccessFlash trigger={questAddTrigger} color="neon" />
                  <XpPopup trigger={questAddTrigger} amount={25} />
                  <div className="pointer-events-none absolute -top-10 left-1/2 h-20 w-40 -translate-x-1/2 rounded-full bg-neon/10 blur-3xl" />
                  <div className="relative border-b border-slate-border/30 px-5 py-4">
                    <div className="flex items-center gap-2">
                      <motion.div
                        initial={{ rotate: -30, scale: 0 }}
                        animate={{ rotate: 0, scale: 1 }}
                        transition={{ delay: 0.15, type: "spring", stiffness: 400, damping: 15 }}
                      >
                        <Swords className="h-4 w-4 text-neon/60" />
                      </motion.div>
                      <h3 className="font-mono text-base font-bold uppercase tracking-[0.1em]">New Quest</h3>
                    </div>
                    <p className="mt-1 font-mono text-[9px] tracking-[0.2em] text-muted">{DAY_LABELS[addExerciseDay].toUpperCase()}</p>
                  </div>
                  <motion.div
                    className="space-y-3 px-5 py-4"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                  >
                    <Input list="exercise-names" value={exerciseName} onChange={(e) => setExerciseName(e.target.value)} placeholder="QUEST NAME..." onKeyDown={(e) => e.key === "Enter" && addExercise()} />
                    <datalist id="exercise-names">{pastNames.map((n) => <option key={n} value={n} />)}</datalist>
                    <div className="flex gap-2">
                      <Button onClick={addExercise} className="flex-1">ACCEPT QUEST</Button>
                      <Button variant="ghost" onClick={() => setAddExerciseDay(null)}>CANCEL</Button>
                    </div>
                  </motion.div>
                </Card>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Clone quest modal */}
        <AnimatePresence>
          {cloneSourceExercise && (
            <motion.div
              className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <motion.button
                type="button"
                aria-label="Close clone modal"
                className="absolute inset-0 bg-[rgba(10,12,16,0.85)] backdrop-blur-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => { if (!cloneSubmittingDay) setCloneSourceExercise(null); }}
              />
              <motion.div
                className="relative z-10 w-full max-w-md px-4 pb-10 pt-2 sm:pb-4"
                initial={{ y: "100%", opacity: 0.8, scale: 0.9 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: "100%", opacity: 0, scale: 0.9 }}
                transition={springGame}
              >
                <Card className="relative overflow-hidden p-0">
                  <div className="relative border-b border-slate-border/30 px-5 py-4">
                    <div className="flex items-center gap-2">
                      <Copy className="h-4 w-4 text-neon/60" />
                      <h3 className="font-mono text-base font-bold uppercase tracking-[0.1em]">Clone Quest</h3>
                    </div>
                    <p className="mt-1 font-mono text-[9px] tracking-[0.2em] text-muted">{cloneSourceExercise.name.toUpperCase()}</p>
                  </div>
                  <div className="space-y-3 px-5 py-4">
                    <p className="font-mono text-[10px] tracking-[0.18em] text-muted">SELECT TARGET DAY</p>
                    <div className="grid grid-cols-3 gap-2">
                      {DAY_ORDER.map((day) => (
                        <Button
                          key={day}
                          size="sm"
                          variant="outline"
                          onClick={() => void cloneExerciseToDay(day)}
                          disabled={Boolean(cloneSubmittingDay)}
                        >
                          {cloneSubmittingDay === day ? "..." : DAY_LABELS[day].slice(0, 3).toUpperCase()}
                        </Button>
                      ))}
                    </div>
                    <Button
                      variant="ghost"
                      onClick={() => setCloneSourceExercise(null)}
                      disabled={Boolean(cloneSubmittingDay)}
                    >
                      CANCEL
                    </Button>
                  </div>
                </Card>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Loading */}
        <AnimatePresence>
          {loading && (
            <motion.div
              className="mt-10 flex flex-col items-center justify-center gap-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {/* Animated barbell loader */}
              <motion.svg viewBox="0 0 80 30" className="w-20 h-auto">
                <motion.rect x="5" y="5" width="8" height="20" rx="2" className="fill-neon/20 stroke-neon" strokeWidth="1"
                  animate={{ scaleY: [1, 1.15, 1] }} transition={{ repeat: Infinity, duration: 0.8, ease: "easeInOut" }} style={{ transformOrigin: "9px 15px" }} />
                <motion.line x1="13" y1="15" x2="67" y2="15" className="stroke-bright" strokeWidth="2.5" strokeLinecap="round"
                  animate={{ opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 1.2 }} />
                <motion.rect x="67" y="5" width="8" height="20" rx="2" className="fill-neon/20 stroke-neon" strokeWidth="1"
                  animate={{ scaleY: [1, 1.15, 1] }} transition={{ repeat: Infinity, duration: 0.8, ease: "easeInOut", delay: 0.1 }} style={{ transformOrigin: "71px 15px" }} />
              </motion.svg>
              <div className="flex items-center gap-3">
                <div className="flex gap-1">
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
                <span className="font-mono text-[10px] tracking-[0.2em] text-muted">LOADING QUEST DATA...</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
