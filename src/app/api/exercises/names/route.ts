export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { sanitizeUsername } from "@/lib/session";
import { Exercise } from "@/models/Exercise";

export async function GET(req: NextRequest) {
  await connectDB();
  const username = sanitizeUsername(req.nextUrl.searchParams.get("username") ?? "");

  if (!username) {
    return NextResponse.json({ error: "Username required" }, { status: 400 });
  }

  const names = await Exercise.find({ username }).distinct("name");
  return NextResponse.json(names.filter(Boolean));
}

