export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { sanitizeUsername } from "@/lib/session";
import { Exercise } from "@/models/Exercise";
import { SubExercise } from "@/models/SubExercise";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  await connectDB();
  const body = await req.json();
  const username = sanitizeUsername(body?.username ?? "");
  const targetDay = String(body?.dayOfWeek ?? "");

  if (!username || !["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].includes(targetDay)) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const sourceExercise = await Exercise.findOne({ _id: params.id, username }).lean();
  if (!sourceExercise) {
    return NextResponse.json({ error: "Quest not found" }, { status: 404 });
  }

  const targetCount = await Exercise.countDocuments({
    username,
    dayOfWeek: targetDay,
    week: sourceExercise.week,
    year: sourceExercise.year,
  });

  const clonedExercise = await Exercise.create({
    username,
    name: sourceExercise.name,
    dayOfWeek: targetDay,
    week: sourceExercise.week,
    year: sourceExercise.year,
    order: targetCount,
  });

  const sourceSubs = await SubExercise.find({ exerciseId: sourceExercise._id })
    .sort({ order: 1, createdAt: 1 })
    .lean();

  if (sourceSubs.length) {
    await SubExercise.insertMany(
      sourceSubs.map((sub, index) => ({
        exerciseId: clonedExercise._id,
        username,
        label: sub.label ?? "",
        sets: sub.sets ?? null,
        reps: sub.reps ?? null,
        weightKg: sub.weightKg ?? null,
        durationMinutes: sub.durationMinutes ?? null,
        holdSeconds: sub.holdSeconds ?? null,
        inputUnit: ["kg", "lbs", "minutes"].includes(sub.inputUnit) ? sub.inputUnit : "kg",
        notes: sub.notes ?? "",
        eachSide: Boolean(sub.eachSide),
        order: typeof sub.order === "number" ? sub.order : index,
      })),
    );
  }

  return NextResponse.json({ ok: true, id: clonedExercise._id, clonedSubCount: sourceSubs.length }, { status: 201 });
}
