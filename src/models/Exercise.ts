import { Schema, model, models } from "mongoose";

const exerciseSchema = new Schema(
  {
    username: { type: String, required: true, lowercase: true, trim: true, index: true },
    name: { type: String, required: true, trim: true },
    dayOfWeek: { type: String, required: true, enum: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] },
    week: { type: Number, required: true, index: true },
    year: { type: Number, required: true, index: true },
    order: { type: Number, required: true, default: 0 },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export const Exercise = models.Exercise || model("Exercise", exerciseSchema);
