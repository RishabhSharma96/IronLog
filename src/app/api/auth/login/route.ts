export const dynamic = "force-dynamic";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { isValidUsername, sanitizeUsername } from "@/lib/session";
import { User } from "@/models/User";

export async function POST(req: Request) {
  await connectDB();
  const body = await req.json();
  const raw = body?.username ?? "";
  const username = sanitizeUsername(raw);

  if (!isValidUsername(username)) {
    return NextResponse.json({ error: "Invalid username" }, { status: 400 });
  }

  await User.findOneAndUpdate(
    { username },
    { username },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  cookies().set("ironlog_session", username, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30,
  });

  return NextResponse.json({ username });
}

