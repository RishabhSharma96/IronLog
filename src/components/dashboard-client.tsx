"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState } from "react";
import Link from "next/link";
import { Pencil, Trash2, LogOut, ChevronDown, ChevronUp } from "lucide-react";
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
  if (sub.inputUnit === "minutes") return `${sub.durationMinutes ?? 0} mins`;
  return `${sub.sets ?? 0}x${sub.reps ?? 0} x ${sub.weightKg ?? 0}kg`;
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
  const [showProgressByExercise, setShowProgressByExercise] = useState<Record<string, boolean>>({});

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

    if (!res.ok) return toast.error("Failed to add exercise");
    toast.success("Exercise added");
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
    if (!confirm("Delete this exercise and all its sub-exercises?")) return;
    await fetch(`/api/exercises/${id}`, { method: "DELETE" });
    toast.success("Exercise deleted");
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
                  const progressOpen = Boolean(showProgressByExercise[exercise._id]);
                  const subGroups = exercise.subs.reduce<Record<string, SubExercise[]>>((acc, sub, index) => {
                    const key = sub.label?.trim() || `Sub ${index + 1}`;
                    if (!acc[key]) acc[key] = [];
                    acc[key].push(sub);
                    return acc;
                  }, {});
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
                        {exercise.subs.map((sub) => (
                          <div key={sub._id} className="flex items-center justify-between rounded-full bg-zinc-900 px-3 py-1 text-xs">
                            <p>{sub.label ? `${sub.label} ` : ""}{subLabel(sub)}</p>
                            <div className="flex gap-1">
                              <Button size="sm" variant="ghost" onClick={() => startSubForm(exercise._id, sub)}><Pencil className="h-3.5 w-3.5" /></Button>
                              <Button size="sm" variant="ghost" onClick={() => deleteSub(exercise._id, sub._id)}><Trash2 className="h-3.5 w-3.5 text-red-500" /></Button>
                            </div>
                          </div>
                        ))}
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-3 w-full"
                        onClick={() =>
                          setShowProgressByExercise((prev) => ({
                            ...prev,
                            [exercise._id]: !prev[exercise._id],
                          }))
                        }
                      >
                        {progressOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        Progress
                      </Button>

                      {progressOpen && (
                        <div className="mt-3 space-y-3 rounded-md border border-zinc-800 bg-zinc-950/40 p-3">
                          {Object.entries(subGroups).map(([groupName, items]) => {
                            const ordered = [...items].sort((a, b) => {
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
                              <div key={groupName} className="space-y-1">
                                <p className="text-xs font-medium uppercase text-zinc-400">{groupName}</p>
                                <ProgressChart
                                  values={weightPoints.length ? weightPoints : minutePoints}
                                  suffix={weightPoints.length ? "kg" : "min"}
                                />
                              </div>
                            );
                          })}
                        </div>
                      )}

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
                        <Button variant="dashed" size="sm" className="mt-3 w-full" onClick={() => startSubForm(exercise._id)}>+ Add Sub-exercise</Button>
                      )}
                    </Card>
                  );
                })}

                <Button variant="dashed" className="w-full" onClick={() => setAddExerciseDay(day)}>+ Add Exercise</Button>
              </div>
            </section>
          );
        })}
      </div>

      {addExerciseDay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <Card className="w-full max-w-md p-4">
            <h3 className="mb-2 text-lg">Add Exercise ({DAY_LABELS[addExerciseDay]})</h3>
            <Input list="exercise-names" value={exerciseName} onChange={(e) => setExerciseName(e.target.value)} placeholder="Exercise name" />
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
