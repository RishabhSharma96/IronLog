export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { sanitizeUsername } from "@/lib/session";
import { BodyWeight } from "@/models/BodyWeight";

const LB_TO_KG = 0.453592;

export async function GET(req: NextRequest) {
  await connectDB();
  const username = sanitizeUsername(req.nextUrl.searchParams.get("username") ?? "");

  if (!username) {
    return NextResponse.json({ error: "Username is required" }, { status: 400 });
  }

  const rows = await BodyWeight.find({ username }).sort({ createdAt: 1 }).lean();
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();

    const username = sanitizeUsername(body?.username ?? "");
    const inputUnit = String(body?.inputUnit ?? "kg");
    const value = Number(body?.weight);

    if (!username || !["kg", "lbs"].includes(inputUnit) || !Number.isFinite(value) || value <= 0) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const weightKg = inputUnit === "lbs" ? Number((value * LB_TO_KG).toFixed(3)) : value;
    const dayOfWeek = String(body?.dayOfWeek ?? "Mon");
    const row = await BodyWeight.create({ username, weightKg, dayOfWeek });
    return NextResponse.json(row, { status: 201 });
  } catch (error) {
    console.error("POST /api/body-weight failed", error);
    return NextResponse.json({ error: "Failed to save body weight" }, { status: 500 });
  }
}
