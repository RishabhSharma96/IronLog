export const dynamic = "force-dynamic";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  const username = cookies().get("ironlog_session")?.value;
  if (!username) {
    return NextResponse.json({ username: null }, { status: 401 });
  }

  return NextResponse.json({ username });
}

