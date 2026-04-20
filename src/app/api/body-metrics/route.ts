export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { sanitizeUsername } from "@/lib/session";
import { BodyMetric } from "@/models/BodyMetric";
import { METRIC_KEYS, METRICS, toBaseUnit } from "@/lib/metrics";

export async function GET(req: NextRequest) {
  await connectDB();
  const username = sanitizeUsername(req.nextUrl.searchParams.get("username") ?? "");
  if (!username) {
    return NextResponse.json({ error: "Username is required" }, { status: 400 });
  }

  const metric = req.nextUrl.searchParams.get("metric");
  const filter: Record<string, string> = { username };
  if (metric && METRIC_KEYS.includes(metric as typeof METRIC_KEYS[number])) {
    filter.metric = metric;
  }

  const rows = await BodyMetric.find(filter).sort({ createdAt: 1 }).lean();
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();

    const username = sanitizeUsername(body?.username ?? "");
    const metric = String(body?.metric ?? "");
    const inputUnit = String(body?.inputUnit ?? "");
    const rawValue = Number(body?.value);

    if (!username) {
      return NextResponse.json({ error: "Username is required" }, { status: 400 });
    }
    if (!METRIC_KEYS.includes(metric as typeof METRIC_KEYS[number])) {
      return NextResponse.json({ error: "Invalid metric type" }, { status: 400 });
    }
    if (!Number.isFinite(rawValue) || rawValue <= 0) {
      return NextResponse.json({ error: "Value must be a positive number" }, { status: 400 });
    }

    const cfg = METRICS[metric as typeof METRIC_KEYS[number]];
    if (cfg.units.length > 0 && cfg.units[0] !== "" && !cfg.units.includes(inputUnit)) {
      return NextResponse.json({ error: `Invalid unit for ${cfg.label}` }, { status: 400 });
    }

    const value = toBaseUnit(rawValue, inputUnit);

    const row = await BodyMetric.create({ username, metric, value, inputUnit });
    return NextResponse.json(row, { status: 201 });
  } catch (error) {
    console.error("POST /api/body-metrics failed", error);
    return NextResponse.json({ error: "Failed to save metric" }, { status: 500 });
  }
}
