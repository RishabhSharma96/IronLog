import { Schema, model, models } from "mongoose";

const bodyWeightSchema = new Schema(
  {
    username: { type: String, required: true, lowercase: true, trim: true, index: true },
    weightKg: { type: Number, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export const BodyWeight = models.BodyWeight || model("BodyWeight", bodyWeightSchema);
