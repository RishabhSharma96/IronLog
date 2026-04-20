export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { SubExercise } from "@/models/SubExercise";

const LB_TO_KG = 0.453592;

function toNumberOrNull(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export async function PUT(req: NextRequest, { params }: { params: { sid: string } }) {
  await connectDB();
  const body = await req.json();
  const inputUnit = String(body?.inputUnit ?? "");

  if (!["kg", "lbs", "minutes"].includes(inputUnit)) {
    return NextResponse.json({ error: "Invalid unit" }, { status: 400 });
  }

  const sets = toNumberOrNull(body?.sets);
  const reps = toNumberOrNull(body?.reps);
  const durationMinutes = toNumberOrNull(body?.durationMinutes);
  const holdSeconds = toNumberOrNull(body?.holdSeconds);
  const rawWeight = toNumberOrNull(body?.weight);
  const weightKg =
    inputUnit === "minutes" || rawWeight === null
      ? null
      : inputUnit === "lbs"
        ? Number((rawWeight * LB_TO_KG).toFixed(3))
        : rawWeight;

  const sub = await SubExercise.findByIdAndUpdate(
    params.sid,
    {
      label: String(body?.label ?? "").trim(),
      sets,
      reps,
      weightKg,
      durationMinutes,
      holdSeconds,
      inputUnit,
      notes: String(body?.notes ?? "").trim(),
      eachSide: Boolean(body?.eachSide),
    },
    { new: true },
  );

  if (!sub) {
    return NextResponse.json({ error: "Sub-exercise not found" }, { status: 404 });
  }

  return NextResponse.json(sub);
}

export async function DELETE(_req: NextRequest, { params }: { params: { sid: string } }) {
  await connectDB();
  await SubExercise.findByIdAndDelete(params.sid);
  return NextResponse.json({ ok: true });
}

