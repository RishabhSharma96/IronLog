import { Schema, model, models } from "mongoose";

const subExerciseSchema = new Schema(
  {
    exerciseId: { type: Schema.Types.ObjectId, ref: "Exercise", required: true, index: true },
    username: { type: String, required: true, lowercase: true, trim: true, index: true },
    label: { type: String, default: "", trim: true },
    sets: { type: Number, default: null },
    reps: { type: Number, default: null },
    weightKg: { type: Number, default: null },
    durationMinutes: { type: Number, default: null },
    inputUnit: { type: String, required: true, enum: ["kg", "lbs", "minutes"] },
    order: { type: Number, required: true, default: 0 },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export const SubExercise = models.SubExercise || model("SubExercise", subExerciseSchema);
