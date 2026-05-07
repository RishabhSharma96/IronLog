export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { sanitizeUsername } from "@/lib/session";
import { QuestDailySnapshot } from "@/models/QuestDailySnapshot";
import { DAY_ORDER, type DayKey } from "@/lib/week";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function normalizeCounts(raw: unknown): Record<DayKey, number> | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const out = {} as Record<DayKey, number>;
  for (const key of DAY_ORDER) {
    const n = Number(o[key]);
    if (!Number.isFinite(n) || n < 0 || !Number.isInteger(n)) {
      return null;
    }
    out[key] = n;
  }
  return out;
}

/** Older documents may lack `Sun` or other keys; always return a full weekday map. */
function coerceStoredCounts(raw: unknown): Record<DayKey, number> {
  const o = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return DAY_ORDER.reduce((acc, key) => {
    const n = Number(o[key]);
    acc[key] = Number.isFinite(n) && n >= 0 && Number.isInteger(n) ? n : 0;
    return acc;
  }, {} as Record<DayKey, number>);
}

export async function GET(req: NextRequest) {
  await connectDB();
  const username = sanitizeUsername(req.nextUrl.searchParams.get("username") ?? "");
  if (!username) {
    return NextResponse.json({ error: "Username is required" }, { status: 400 });
  }

  const days = Math.min(Math.max(Number(req.nextUrl.searchParams.get("days")) || 90, 1), 365);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = [
    cutoff.getFullYear(),
    String(cutoff.getMonth() + 1).padStart(2, "0"),
    String(cutoff.getDate()).padStart(2, "0"),
  ].join("-");

  const rows = await QuestDailySnapshot.find(
    { username, date: { $gte: cutoffStr } },
    { date: 1, counts: 1, _id: 0 },
  )
    .sort({ date: 1 })
    .lean()
    .exec();

  const snapshots = (rows as unknown as { date: string; counts: unknown }[]).map((r) => ({
    date: r.date,
    counts: coerceStoredCounts(r.counts),
  }));

  return NextResponse.json({ snapshots });
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    const username = sanitizeUsername(body?.username ?? "");
    const date = String(body?.date ?? "");
    const counts = normalizeCounts(body?.counts);

    if (!username) {
      return NextResponse.json({ error: "Username is required" }, { status: 400 });
    }
    if (!DATE_RE.test(date)) {
      return NextResponse.json({ error: "Invalid date (use YYYY-MM-DD)" }, { status: 400 });
    }
    if (!counts) {
      return NextResponse.json({ error: "Invalid counts" }, { status: 400 });
    }

    await QuestDailySnapshot.findOneAndUpdate(
      { username, date },
      { $set: { counts } },
      { upsert: true, new: true },
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("POST /api/quest-snapshots failed", error);
    return NextResponse.json({ error: "Failed to save snapshot" }, { status: 500 });
  }
}
