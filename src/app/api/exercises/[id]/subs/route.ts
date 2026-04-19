export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { sanitizeUsername } from "@/lib/session";
import { SubExercise } from "@/models/SubExercise";

const LB_TO_KG = 0.453592;

function toNumberOrNull(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  await connectDB();
  const body = await req.json();

  const inputUnit = String(body?.inputUnit ?? "");
  const username = sanitizeUsername(body?.username ?? "");
  const label = String(body?.label ?? "").trim();

  if (!username || !["kg", "lbs", "minutes"].includes(inputUnit)) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const sets = toNumberOrNull(body?.sets);
  const reps = toNumberOrNull(body?.reps);
  const durationMinutes = toNumberOrNull(body?.durationMinutes);
  const rawWeight = toNumberOrNull(body?.weight);

  const weightKg =
    inputUnit === "minutes" || rawWeight === null
      ? null
      : inputUnit === "lbs"
        ? Number((rawWeight * LB_TO_KG).toFixed(3))
        : rawWeight;

  const sub = await SubExercise.create({
    exerciseId: params.id,
    username,
    label,
    sets,
    reps,
    weightKg,
    durationMinutes,
    inputUnit,
  });

  return NextResponse.json(sub, { status: 201 });
}

