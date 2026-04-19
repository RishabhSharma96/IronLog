export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { sanitizeUsername } from "@/lib/session";
import { Exercise } from "@/models/Exercise";
import { SubExercise } from "@/models/SubExercise";
import { getISOWeekYear } from "@/lib/week";

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

  const exercises = await Exercise.find(query).sort({ dayOfWeek: 1, order: 1, createdAt: 1 }).lean();
  const exerciseIds = exercises.map((exercise) => exercise._id);
  const subs = await SubExercise.find({ exerciseId: { $in: exerciseIds } }).sort({ createdAt: 1 }).lean();

  const subMap = new Map<string, typeof subs>();
  for (const sub of subs) {
    const key = String(sub.exerciseId);
    const list = subMap.get(key) ?? [];
    list.push(sub);
    subMap.set(key, list);
  }

  const payload = exercises.map((exercise) => ({
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

  if (!username || !name || !["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].includes(dayOfWeek) || !week || !year) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const count = await Exercise.countDocuments({ username, dayOfWeek, week, year });
  const exercise = await Exercise.create({ username, name, dayOfWeek, week, year, order: count });

  return NextResponse.json({ ...exercise.toObject(), subs: [] }, { status: 201 });
}

