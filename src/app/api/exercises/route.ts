export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { sanitizeUsername } from "@/lib/session";
import { Exercise } from "@/models/Exercise";
import { SubExercise } from "@/models/SubExercise";
import { compareDayKeys, getISOWeekYear, isValidDayKey } from "@/lib/week";

export async function GET(req: NextRequest) {
  await connectDB();
  const username = sanitizeUsername(req.nextUrl.searchParams.get("username") ?? "");
  const week = Number(req.nextUrl.searchParams.get("week"));
  const year = Number(req.nextUrl.searchParams.get("year"));

  if (!username) {
    return NextResponse.json({ error: "Username required" }, { status: 400 });
  }

  const query: Record<string, unknown> = { username };
  if (Number.isFinite(week) && Number.isFinite(year) && week > 0 && year > 0) {
    query.week = week;
    query.year = year;
  }

  const exercises = await Exercise.find(query).sort({ order: 1, createdAt: 1 }).lean();
  const exerciseIds = exercises.map((exercise) => exercise._id);
  const subs = await SubExercise.find({ exerciseId: { $in: exerciseIds } }).sort({ order: 1, createdAt: 1 }).lean();

  const subMap = new Map<string, typeof subs>();
  for (const sub of subs) {
    const key = String(sub.exerciseId);
    const list = subMap.get(key) ?? [];
    list.push(sub);
    subMap.set(key, list);
  }

  type LeanExercise = { _id: unknown; dayOfWeek: string; order?: number };

  const daySorted = [...exercises].sort((a, b) => {
    const lea = a as unknown as LeanExercise;
    const leb = b as unknown as LeanExercise;
    const da = String(lea.dayOfWeek ?? "");
    const db = String(leb.dayOfWeek ?? "");
    if (!isValidDayKey(da) || !isValidDayKey(db)) return 0;
    const dow = compareDayKeys(da, db);
    if (dow !== 0) return dow;
    return (lea.order ?? 0) - (leb.order ?? 0);
  });

  const payload = daySorted.map((exercise) => ({
    ...exercise,
    subs: subMap.get(String(exercise._id)) ?? [],
  }));

  return NextResponse.json(payload);
}

export async function POST(req: NextRequest) {
  await connectDB();
  const body = await req.json();

  const username = sanitizeUsername(body?.username ?? "");
  const name = String(body?.name ?? "").trim();
  const dayOfWeek = String(body?.dayOfWeek ?? "");
  const fallback = getISOWeekYear();
  const week = Number(body?.week) || fallback.week;
  const year = Number(body?.year) || fallback.year;

  if (!username || !name || !isValidDayKey(dayOfWeek) || !week || !year) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const count = await Exercise.countDocuments({ username, dayOfWeek, week, year });
  const exercise = await Exercise.create({ username, name, dayOfWeek, week, year, order: count });

  return NextResponse.json({ ...exercise.toObject(), subs: [] }, { status: 201 });
}

export async function PUT(req: NextRequest) {
  await connectDB();
  const body = await req.json();
  const username = sanitizeUsername(body?.username ?? "");
  const dayOfWeek = String(body?.dayOfWeek ?? "");
  const exerciseIds: string[] = Array.isArray(body?.exerciseIds) ? body.exerciseIds.map((id: unknown) => String(id)) : [];

  if (!username || !isValidDayKey(dayOfWeek) || !exerciseIds.length) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const existing = await Exercise.find(
    { username, dayOfWeek, _id: { $in: exerciseIds } },
    { _id: 1 },
  ).lean();

  if (existing.length !== exerciseIds.length) {
    return NextResponse.json({ error: "Invalid exerciseIds" }, { status: 400 });
  }

  await Promise.all(
    exerciseIds.map((id, index) =>
      Exercise.findByIdAndUpdate(id, { order: index }),
    ),
  );

  return NextResponse.json({ ok: true });
}

