"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState } from "react";
import Link from "next/link";
import { Pencil, Trash2, LogOut, GripVertical } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ProgressChart } from "@/components/progress-chart";
import { DAY_LABELS, DAY_ORDER, type DayKey } from "@/lib/week";

type SubExercise = {
  _id: string;
  label: string;
  sets: number | null;
  reps: number | null;
  weightKg: number | null;
  durationMinutes: number | null;
  inputUnit: "kg" | "lbs" | "minutes";
  order?: number;
  createdAt?: string;
};

type Exercise = {
  _id: string;
  name: string;
  dayOfWeek: DayKey;
  week: number;
  year: number;
  subs: SubExercise[];
};

type Props = {
  username: string;
  initialDay?: DayKey;
  singleDayMode?: boolean;
};

type Unit = "kg" | "lbs" | "minutes";

const LB_TO_KG = 0.453592;
const blankSubForm = { label: "", sets: "", reps: "", weight: "", durationMinutes: "", inputUnit: "kg" as Unit };

function subLabel(sub: SubExercise) {
  if (sub.inputUnit === "minutes") return `${sub.durationMinutes ?? 0} min`;
  const parts = [`${sub.sets ?? 0} sets`, `${sub.reps ?? 0} reps`];
  if (typeof sub.weightKg === "number") parts.push(`${sub.weightKg} kg`);
  return parts.join(" | ");
}

function convertWeightInput(weight: string, from: Unit, to: Unit) {
  if (!weight || from === to) return weight;
  const value = Number(weight);
  if (!Number.isFinite(value)) return weight;

  if (from === "kg" && to === "lbs") {
    return (value / LB_TO_KG).toFixed(2);
  }

  if (from === "lbs" && to === "kg") {
    return (value * LB_TO_KG).toFixed(2);
  }

  return weight;
}

export function DashboardClient({
  username,
  initialDay = "Mon",
  singleDayMode = false,
}: Props) {
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

  async function loadExercises() {
    setLoading(true);
    const res = await fetch(`/api/exercises?username=${username}`);
    const data = await res.json();
    setExercises(data);
    setLoading(false);
  }

  async function loadExerciseNames() {
    const res = await fetch(`/api/exercises/names?username=${username}`);
    const data = await res.json();
    setPastNames(data);
  }

  useEffect(() => {
    loadExercises();
    loadExerciseNames();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function addExercise() {
    if (!addExerciseDay || !exerciseName.trim()) return;
    const res = await fetch("/api/exercises", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, name: exerciseName, dayOfWeek: addExerciseDay }),
    });

    if (!res.ok) return toast.error("Failed to add movement");
    toast.success("Movement added");
    setExerciseName("");
    setAddExerciseDay(null);
    await loadExercises();
  }

  async function saveExerciseRename(id: string) {
    if (!editingExerciseName.trim()) return;
    const res = await fetch(`/api/exercises/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editingExerciseName }),
    });

    if (!res.ok) return toast.error("Rename failed");
    toast.success("Exercise updated");
    setEditingExerciseId(null);
    await loadExercises();
  }

  async function deleteExercise(id: string) {
    if (!confirm("Delete this movement and all its exercises?")) return;
    await fetch(`/api/exercises/${id}`, { method: "DELETE" });
    toast.success("Movement deleted");
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
            weight:
              typeof sub.weightKg === "number"
                ? (sub.inputUnit === "lbs" ? (sub.weightKg / LB_TO_KG).toFixed(2) : sub.weightKg.toString())
                : "",
            durationMinutes: sub.durationMinutes?.toString() ?? "",
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
      inputUnit: form.inputUnit,
      sets: form.inputUnit === "minutes" ? null : Number(form.sets || 0),
      reps: form.inputUnit === "minutes" ? null : Number(form.reps || 0),
      weight: form.inputUnit === "minutes" ? null : Number(form.weight || 0),
      durationMinutes: form.inputUnit === "minutes" ? Number(form.durationMinutes || 0) : null,
    };

    const endpoint = editingSubId
      ? `/api/exercises/${exerciseId}/subs/${editingSubId}`
      : `/api/exercises/${exerciseId}/subs`;
    const method = editingSubId ? "PUT" : "POST";

    const res = await fetch(endpoint, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) return toast.error("Failed to save sub-exercise");
    toast.success(editingSubId ? "Sub-exercise updated" : "Sub-exercise added");
    setSubFormByExercise((prev) => ({ ...prev, [exerciseId]: blankSubForm }));
    setEditingSubId(null);
    await loadExercises();
  }

  async function deleteSub(exerciseId: string, sid: string) {
    await fetch(`/api/exercises/${exerciseId}/subs/${sid}`, { method: "DELETE" });
    toast.success("Sub-exercise deleted");
    await loadExercises();
  }

  async function reorderSubs(exerciseId: string, sourceSubId: string, targetSubId: string) {
    if (sourceSubId === targetSubId) return;
    const exercise = exercises.find((item) => item._id === exerciseId);
    if (!exercise) return;

    const current = [...exercise.subs];
    const sourceIndex = current.findIndex((item) => item._id === sourceSubId);
    const targetIndex = current.findIndex((item) => item._id === targetSubId);
    if (sourceIndex < 0 || targetIndex < 0) return;

    const [moved] = current.splice(sourceIndex, 1);
    current.splice(targetIndex, 0, moved);
    const subIds = current.map((item) => item._id);

    setExercises((prev) =>
      prev.map((item) =>
        item._id === exerciseId
          ? {
              ...item,
              subs: current,
            }
          : item,
      ),
    );

    const res = await fetch(`/api/exercises/${exerciseId}/subs`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subIds }),
    });
    if (!res.ok) {
      toast.error("Failed to reorder exercises");
      await loadExercises();
      return;
    }

    toast.success("Exercises reordered");
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.assign("/");
  }

  const grouped = DAY_ORDER.reduce<Record<DayKey, Exercise[]>>((acc, day) => {
    acc[day] = exercises.filter((exercise) => exercise.dayOfWeek === day);
    return acc;
  }, { Mon: [], Tue: [], Wed: [], Thu: [], Fri: [], Sat: [] });

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 text-zinc-100 md:px-6">
      <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {singleDayMode && (
            <Link href="/dashboard">
              <Button variant="outline" size="sm">Back</Button>
            </Link>
          )}
          <h1 className="text-3xl uppercase tracking-wide">IronLog</h1>
        </div>
        <div className="flex items-center gap-3">
          <p className="text-sm text-zinc-300">{username}</p>
          <Button variant="ghost" size="sm" onClick={logout}><LogOut className="h-4 w-4" /> Logout</Button>
        </div>
      </header>

      {!singleDayMode && (
        <div className="mb-3 flex gap-2 overflow-x-auto md:hidden">
          {DAY_ORDER.map((day) => (
            <Button key={day} size="sm" variant={activeDay === day ? "default" : "outline"} onClick={() => setActiveDay(day)}>{DAY_LABELS[day]}</Button>
          ))}
        </div>
      )}

      <div className={`grid gap-4 ${singleDayMode ? "" : "md:grid-cols-6"}`}>
        {(singleDayMode ? [activeDay] : DAY_ORDER).map((day) => {
          const isHidden = day !== activeDay;
          return (
            <section key={day} className={`${singleDayMode ? "block" : isHidden ? "hidden md:block" : "block"}`}>
              <h2 className="mb-2 text-sm font-semibold uppercase text-zinc-400">{DAY_LABELS[day]}</h2>
              <div className="space-y-3">
                {grouped[day].map((exercise) => {
                  const form = subFormByExercise[exercise._id];
                  const isEditingExercise = editingExerciseId === exercise._id;
                  return (
                    <Card key={exercise._id} className="border-l-4 border-l-[#b9ff66] p-3">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        {isEditingExercise ? (
                          <div className="flex w-full gap-2">
                            <Input value={editingExerciseName} onChange={(e) => setEditingExerciseName(e.target.value)} />
                            <Button size="sm" onClick={() => saveExerciseRename(exercise._id)}>Save</Button>
                          </div>
                        ) : (
                          <>
                            <p className="font-semibold">{exercise.name}</p>
                            <div className="flex gap-1">
                              <Button size="sm" variant="ghost" onClick={() => { setEditingExerciseId(exercise._id); setEditingExerciseName(exercise.name); }}><Pencil className="h-4 w-4" /></Button>
                              <Button size="sm" variant="ghost" onClick={() => deleteExercise(exercise._id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                            </div>
                          </>
                        )}
                      </div>

                      <div className="space-y-2">
                        {exercise.subs.map((sub, index) => {
                          const progressOpen = Boolean(showProgressBySub[sub._id]);
                          const groupName = sub.label?.trim() || `Exercise ${index + 1}`;
                          const ordered = exercise.subs
                            .filter((item, itemIndex) => {
                              const key = item.label?.trim() || `Exercise ${itemIndex + 1}`;
                              return key === groupName;
                            })
                            .sort((a, b) => {
                              const aTime = new Date(a.createdAt ?? 0).getTime();
                              const bTime = new Date(b.createdAt ?? 0).getTime();
                              return aTime - bTime;
                            });
                          const weightPoints = ordered
                            .map((item) => item.weightKg)
                            .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
                          const minutePoints = ordered
                            .map((item) => item.durationMinutes)
                            .filter((value): value is number => typeof value === "number" && Number.isFinite(value));

                          return (
                            <div
                              key={sub._id}
                              draggable
                              onDragStart={() => setDraggingSub({ exerciseId: exercise._id, subId: sub._id })}
                              onDragEnd={() => {
                                setDraggingSub(null);
                                setDragOverSubId(null);
                              }}
                              onDragOver={(e) => {
                                if (draggingSub?.exerciseId !== exercise._id || draggingSub.subId === sub._id) return;
                                e.preventDefault();
                                setDragOverSubId(sub._id);
                              }}
                              onDrop={(e) => {
                                e.preventDefault();
                                if (draggingSub?.exerciseId !== exercise._id || draggingSub.subId === sub._id) return;
                                void reorderSubs(exercise._id, draggingSub.subId, sub._id);
                                setDraggingSub(null);
                                setDragOverSubId(null);
                              }}
                              className={`rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs ${
                                dragOverSubId === sub._id ? "ring-1 ring-[#b9ff66]" : ""
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-start gap-2">
                                  <GripVertical className="mt-0.5 h-4 w-4 text-zinc-500" />
                                  <p className="text-sm font-medium text-zinc-100">{groupName}</p>
                                </div>
                                <div className="flex gap-1">
                                  <Button size="sm" variant="ghost" onClick={() => startSubForm(exercise._id, sub)}><Pencil className="h-3.5 w-3.5" /></Button>
                                  <Button size="sm" variant="ghost" onClick={() => deleteSub(exercise._id, sub._id)}><Trash2 className="h-3.5 w-3.5 text-red-500" /></Button>
                                </div>
                              </div>
                              <p className="mt-1 pl-6 text-zinc-300">{subLabel(sub)}</p>
                              <div className="mt-2 pl-6">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    setShowProgressBySub((prev) => ({
                                      ...prev,
                                      [sub._id]: !prev[sub._id],
                                    }))
                                  }
                                >
                                  {progressOpen ? "Hide Progress" : "View Progress"}
                                </Button>
                              </div>
                              {progressOpen && (
                                <div className="mt-2 rounded-md border border-zinc-800 bg-zinc-950/40 p-2">
                                  <ProgressChart
                                    values={weightPoints.length ? weightPoints : minutePoints}
                                    suffix={weightPoints.length ? "kg" : "min"}
                                  />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {form ? (
                        <div className="mt-3 space-y-2 rounded-md border border-zinc-800 p-2">
                          <Input placeholder="Label (optional)" value={form.label} onChange={(e) => setSubFormByExercise((prev) => ({ ...prev, [exercise._id]: { ...form, label: e.target.value } }))} />
                          <div className="grid grid-cols-3 gap-2">
                            {(["kg", "lbs", "minutes"] as Unit[]).map((unit) => (
                              <Button
                                key={unit}
                                variant={form.inputUnit === unit ? "default" : "outline"}
                                size="sm"
                                onClick={() =>
                                  setSubFormByExercise((prev) => ({
                                    ...prev,
                                    [exercise._id]: {
                                      ...form,
                                      inputUnit: unit,
                                      weight: convertWeightInput(form.weight, form.inputUnit, unit),
                                    },
                                  }))
                                }
                              >
                                {unit}
                              </Button>
                            ))}
                          </div>
                          {form.inputUnit === "minutes" ? (
                            <Input type="number" placeholder="Duration (minutes)" value={form.durationMinutes} onChange={(e) => setSubFormByExercise((prev) => ({ ...prev, [exercise._id]: { ...form, durationMinutes: e.target.value } }))} />
                          ) : (
                            <div className="grid grid-cols-3 gap-2">
                              <Input type="number" placeholder="Sets" value={form.sets} onChange={(e) => setSubFormByExercise((prev) => ({ ...prev, [exercise._id]: { ...form, sets: e.target.value } }))} />
                              <Input type="number" placeholder="Reps" value={form.reps} onChange={(e) => setSubFormByExercise((prev) => ({ ...prev, [exercise._id]: { ...form, reps: e.target.value } }))} />
                              <Input type="number" placeholder={form.inputUnit === "lbs" ? "Weight (lbs)" : "Weight (kg)"} value={form.weight} onChange={(e) => setSubFormByExercise((prev) => ({ ...prev, [exercise._id]: { ...form, weight: e.target.value } }))} />
                            </div>
                          )}
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => saveSub(exercise._id)}>Save</Button>
                            <Button size="sm" variant="ghost" onClick={() => { setEditingSubId(null); setSubFormByExercise((prev) => { const c = { ...prev }; delete c[exercise._id]; return c; }); }}>Cancel</Button>
                          </div>
                        </div>
                      ) : (
                        <Button variant="dashed" size="sm" className="mt-3 w-full" onClick={() => startSubForm(exercise._id)}>+ Add Exercise</Button>
                      )}
                    </Card>
                  );
                })}

                <Button variant="dashed" className="w-full" onClick={() => setAddExerciseDay(day)}>+ Add Movement</Button>
              </div>
            </section>
          );
        })}
      </div>

      {addExerciseDay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <Card className="w-full max-w-md p-4">
            <h3 className="mb-2 text-lg">Add Movement ({DAY_LABELS[addExerciseDay]})</h3>
            <Input list="exercise-names" value={exerciseName} onChange={(e) => setExerciseName(e.target.value)} placeholder="Movement name" />
            <datalist id="exercise-names">
              {pastNames.map((name) => <option key={name} value={name} />)}
            </datalist>
            <div className="mt-3 flex gap-2">
              <Button onClick={addExercise}>Save</Button>
              <Button variant="ghost" onClick={() => setAddExerciseDay(null)}>Cancel</Button>
            </div>
          </Card>
        </div>
      )}

      {loading && <p className="mt-3 text-sm text-zinc-400">Loading...</p>}
    </div>
  );
}
