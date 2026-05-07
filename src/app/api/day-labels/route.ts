export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { sanitizeUsername } from "@/lib/session";
import { User } from "@/models/User";
import { mergeDayLabels, sanitizeDayLabel, type DayLabelsMap } from "@/lib/day-labels";
import { DAY_ORDER, type DayKey } from "@/lib/week";

export async function GET(req: NextRequest) {
  await connectDB();
  const username = sanitizeUsername(req.nextUrl.searchParams.get("username") ?? "");
  if (!username) {
    return NextResponse.json({ error: "Username is required" }, { status: 400 });
  }

  const doc = await User.findOne({ username }, { dayLabels: 1, _id: 0 }).lean();
  const labels = mergeDayLabels(
    doc && !Array.isArray(doc) ? (doc as { dayLabels?: unknown }).dayLabels : undefined,
  );
  return NextResponse.json({ labels });
}

export async function PUT(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    const username = sanitizeUsername(body?.username ?? "");
    const raw = body?.labels;

    if (!username) {
      return NextResponse.json({ error: "Username is required" }, { status: 400 });
    }
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      return NextResponse.json({ error: "Invalid labels" }, { status: 400 });
    }

    let fresh = await User.findOne({ username });
    if (!fresh) {
      fresh = await User.create({ username });
    }
    const current = mergeDayLabels(fresh.dayLabels);
    const incoming = raw as Partial<Record<DayKey, unknown>>;
    const next: DayLabelsMap = { ...current };
    for (const key of DAY_ORDER) {
      if (Object.prototype.hasOwnProperty.call(incoming, key)) {
        next[key] = sanitizeDayLabel(incoming[key]);
      }
    }

    fresh.set("dayLabels", next);
    await fresh.save();

    return NextResponse.json({ labels: mergeDayLabels(fresh.dayLabels) });
  } catch (error) {
    console.error("PUT /api/day-labels failed", error);
    return NextResponse.json({ error: "Failed to save labels" }, { status: 500 });
  }
}
