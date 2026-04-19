"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import Link from "next/link";
import { useEffect, useState } from "react";
import { LogOut, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ProgressChart } from "@/components/progress-chart";
import { DAY_LABELS, DAY_ORDER, dayKeyToSlug, type DayKey } from "@/lib/week";

type Exercise = { _id: string; dayOfWeek: DayKey; subs: { _id: string }[] };
type BodyWeightRow = { _id: string; weightKg: number };
const LB_TO_KG = 0.453592;

export function DashboardOverviewClient({ username }: { username: string }) {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [bodyWeightRows, setBodyWeightRows] = useState<BodyWeightRow[]>([]);
  const [bodyWeightUnit, setBodyWeightUnit] = useState<"kg" | "lbs">("kg");
  const [bodyWeightInput, setBodyWeightInput] = useState("");
  const [showWeightProgress, setShowWeightProgress] = useState(false);

  const loadExercises = async () => {
    const res = await fetch(`/api/exercises?username=${username}`);
    const data = await res.json();
    setExercises(Array.isArray(data) ? data : []);
  };

  const loadBodyWeight = async () => {
    const res = await fetch(`/api/body-weight?username=${username}`);
    const data = await res.json();
    setBodyWeightRows(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    loadExercises();
    loadBodyWeight();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function addBodyWeight() {
    const value = Number(bodyWeightInput);
    if (!Number.isFinite(value) || value <= 0) {
      toast.error("Enter a valid body weight");
      return;
    }

    const res = await fetch("/api/body-weight", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, inputUnit: bodyWeightUnit, weight: value }),
    });

    if (!res.ok) {
      const payload = await res.json().catch(() => ({}));
      toast.error(payload?.error ?? "Failed to save body weight");
      return;
    }
    setBodyWeightInput("");
    toast.success("Body weight logged");
    await loadBodyWeight();
  }

  function switchBodyWeightUnit(nextUnit: "kg" | "lbs") {
    if (bodyWeightUnit === nextUnit) return;
    const value = Number(bodyWeightInput);
    if (!Number.isFinite(value)) {
      setBodyWeightUnit(nextUnit);
      return;
    }

    if (bodyWeightUnit === "kg" && nextUnit === "lbs") {
      setBodyWeightInput((value / LB_TO_KG).toFixed(2));
    } else if (bodyWeightUnit === "lbs" && nextUnit === "kg") {
      setBodyWeightInput((value * LB_TO_KG).toFixed(2));
    }
    setBodyWeightUnit(nextUnit);
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.assign("/");
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 text-zinc-100 md:px-6">
      <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl uppercase tracking-wide">IronLog</h1>
        <div className="flex items-center gap-3">
          <p className="text-sm text-zinc-300">{username}</p>
          <Button variant="ghost" size="sm" onClick={logout}><LogOut className="h-4 w-4" /> Logout</Button>
        </div>
      </header>

      <Card className="mb-4 p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-semibold uppercase text-zinc-300">Body Weight Tracker</p>
          <p className="text-xs text-zinc-500">
            Latest: {bodyWeightRows.length ? `${bodyWeightRows[bodyWeightRows.length - 1].weightKg}kg` : "n/a"}
          </p>
        </div>
        <div className="mb-3 flex gap-2">
          <Button size="sm" variant={bodyWeightUnit === "kg" ? "default" : "outline"} onClick={() => switchBodyWeightUnit("kg")}>kg</Button>
          <Button size="sm" variant={bodyWeightUnit === "lbs" ? "default" : "outline"} onClick={() => switchBodyWeightUnit("lbs")}>lbs</Button>
          <Input type="number" step="0.1" value={bodyWeightInput} onChange={(e) => setBodyWeightInput(e.target.value)} placeholder={`Body weight (${bodyWeightUnit})`} />
          <Button size="sm" onClick={addBodyWeight}>Log</Button>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="w-full"
          onClick={() => setShowWeightProgress((prev) => !prev)}
        >
          {showWeightProgress ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          Body Weight Progress Graph
        </Button>
        {showWeightProgress && (
          <div className="mt-3 space-y-2 rounded-md border border-zinc-800 bg-zinc-950/40 p-3">
            <div className="flex items-center justify-between text-xs text-zinc-500">
              <span>Start: {bodyWeightRows.length ? `${bodyWeightRows[0].weightKg}kg` : "n/a"}</span>
              <span>
                Change:{" "}
                {bodyWeightRows.length > 1
                  ? `${(bodyWeightRows[bodyWeightRows.length - 1].weightKg - bodyWeightRows[0].weightKg).toFixed(2)}kg`
                  : "0kg"}
              </span>
            </div>
            <ProgressChart values={bodyWeightRows.map((row) => row.weightKg)} suffix="kg" />
          </div>
        )}
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {DAY_ORDER.map((day) => {
          const dayExercises = exercises.filter((exercise) => exercise.dayOfWeek === day);
          const subCount = dayExercises.reduce((sum, exercise) => sum + exercise.subs.length, 0);
          return (
            <Link key={day} href={`/dashboard/day/${dayKeyToSlug(day)}`}>
              <Card className="h-full border-l-4 border-l-[#b9ff66] p-4 transition hover:border-[#b9ff66] hover:bg-zinc-900">
                <p className="text-xl">{DAY_LABELS[day]}</p>
                <p className="mt-2 text-sm text-zinc-400">{dayExercises.length} exercises</p>
                <p className="text-sm text-zinc-500">{subCount} sub-exercises</p>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
