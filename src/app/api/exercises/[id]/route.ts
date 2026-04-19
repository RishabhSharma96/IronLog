export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Exercise } from "@/models/Exercise";
import { SubExercise } from "@/models/SubExercise";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  await connectDB();
  const body = await req.json();
  const name = String(body?.name ?? "").trim();

  if (!name) {
    return NextResponse.json({ error: "Exercise name is required" }, { status: 400 });
  }

  const exercise = await Exercise.findByIdAndUpdate(params.id, { name }, { new: true });
  if (!exercise) {
    return NextResponse.json({ error: "Exercise not found" }, { status: 404 });
  }

  return NextResponse.json(exercise);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await connectDB();
  await SubExercise.deleteMany({ exerciseId: params.id });
  await Exercise.findByIdAndDelete(params.id);
  return NextResponse.json({ ok: true });
}

