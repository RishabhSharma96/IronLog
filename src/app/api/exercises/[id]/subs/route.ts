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
  const notes = String(body?.notes ?? "").trim();
  const eachSide = Boolean(body?.eachSide);

  if (!username || !["kg", "lbs", "minutes"].includes(inputUnit)) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
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

  const count = await SubExercise.countDocuments({ exerciseId: params.id });
  const sub = await SubExercise.create({
    exerciseId: params.id,
    username,
    label,
    sets,
    reps,
    weightKg,
    durationMinutes,
    holdSeconds,
    inputUnit,
    notes,
    eachSide,
    order: count,
  });

  return NextResponse.json(sub, { status: 201 });
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  await connectDB();
  const body = await req.json();
  const subIds: string[] = Array.isArray(body?.subIds) ? body.subIds.map((id: unknown) => String(id)) : [];

  if (!subIds.length) {
    return NextResponse.json({ error: "subIds is required" }, { status: 400 });
  }

  const existingSubs = await SubExercise.find({ exerciseId: params.id, _id: { $in: subIds } }, { _id: 1 }).lean();
  if (existingSubs.length !== subIds.length) {
    return NextResponse.json({ error: "Invalid subIds" }, { status: 400 });
  }

  await Promise.all(
    subIds.map((sid: string, index: number) =>
      SubExercise.findByIdAndUpdate(sid, {
        order: index,
      }),
    ),
  );

  return NextResponse.json({ ok: true });
}

