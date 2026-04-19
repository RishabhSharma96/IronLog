export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { isValidUsername, sanitizeUsername } from "@/lib/session";
import { User } from "@/models/User";

export async function GET() {
  try {
    await connectDB();
    const users = await User.find().sort({ createdAt: 1 }).lean();
    return NextResponse.json(users);
  } catch (error) {
    console.error("GET /api/users failed", error);
    return NextResponse.json({ error: "Database connection failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  await connectDB();
  const body = await req.json();
  const username = sanitizeUsername(body?.username ?? "");

  if (!isValidUsername(username)) {
    return NextResponse.json({ error: "Invalid username" }, { status: 400 });
  }

  const user = await User.findOneAndUpdate(
    { username },
    { username },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  return NextResponse.json(user, { status: 201 });
}

