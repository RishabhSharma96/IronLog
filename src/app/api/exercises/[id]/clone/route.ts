export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { sanitizeUsername } from "@/lib/session";
import { Exercise } from "@/models/Exercise";
import { SubExercise } from "@/models/SubExercise";
import { isValidDayKey } from "@/lib/week";

type CloneSubInput = {
  label?: unknown;
  sets?: unknown;
  reps?: unknown;
  weightKg?: unknown;
  durationMinutes?: unknown;
  holdSeconds?: unknown;
  inputUnit?: unknown;
  notes?: unknown;
  eachSide?: unknown;
  order?: unknown;
};

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  await connectDB();
  const body = await req.json();
  const username = sanitizeUsername(body?.username ?? "");
  const targetDay = String(body?.dayOfWeek ?? "");
  const requestedSubs: CloneSubInput[] | null = Array.isArray(body?.subs) ? (body.subs as CloneSubInput[]) : null;

  if (!username || !isValidDayKey(targetDay)) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const sourceExerciseRaw = await Exercise.findOne({ _id: params.id, username }).lean();
  const sourceExercise = Array.isArray(sourceExerciseRaw) ? sourceExerciseRaw[0] : sourceExerciseRaw;
  if (!sourceExercise) {
    return NextResponse.json({ error: "Quest not found" }, { status: 404 });
  }
  const sourceWeek = typeof sourceExercise.week === "number" ? sourceExercise.week : 0;
  const sourceYear = typeof sourceExercise.year === "number" ? sourceExercise.year : 0;
  const sourceName = typeof sourceExercise.name === "string" ? sourceExercise.name : "";

  if (!sourceWeek || !sourceYear || !sourceName) {
    return NextResponse.json({ error: "Invalid source quest" }, { status: 400 });
  }

  const targetCount = await Exercise.countDocuments({
    username,
    dayOfWeek: targetDay,
    week: sourceWeek,
    year: sourceYear,
  });

  const clonedExercise = await Exercise.create({
    username,
    name: sourceName,
    dayOfWeek: targetDay,
    week: sourceWeek,
    year: sourceYear,
    order: targetCount,
  });

  const sourceSubsFromDb = (await SubExercise.find({ exerciseId: sourceExercise._id })
    .sort({ order: 1, createdAt: 1 })
    .lean()) as unknown as CloneSubInput[];
  const sourceSubs: CloneSubInput[] = requestedSubs && requestedSubs.length ? requestedSubs : sourceSubsFromDb;

  if (sourceSubs.length) {
    await SubExercise.insertMany(
      sourceSubs.map((sub, index) => ({
        exerciseId: clonedExercise._id,
        username,
        label: typeof sub.label === "string" ? sub.label : "",
        sets: typeof sub.sets === "number" ? sub.sets : null,
        reps: typeof sub.reps === "number" ? sub.reps : null,
        weightKg: typeof sub.weightKg === "number" ? sub.weightKg : null,
        durationMinutes: typeof sub.durationMinutes === "number" ? sub.durationMinutes : null,
        holdSeconds: typeof sub.holdSeconds === "number" ? sub.holdSeconds : null,
        inputUnit: ["kg", "lbs", "minutes"].includes(String(sub.inputUnit)) ? String(sub.inputUnit) : "kg",
        notes: typeof sub.notes === "string" ? sub.notes : "",
        eachSide: Boolean(sub.eachSide),
        order: typeof sub.order === "number" ? sub.order : index,
      })),
    );
  }

  return NextResponse.json({ ok: true, id: clonedExercise._id, clonedSubCount: sourceSubs.length }, { status: 201 });
}
