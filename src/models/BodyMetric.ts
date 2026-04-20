import { Schema, model, models } from "mongoose";

const bodyMetricSchema = new Schema(
  {
    username: { type: String, required: true, lowercase: true, trim: true, index: true },
    metric: {
      type: String,
      required: true,
      enum: [
        "weight", "bodyFat", "muscleMass", "bmi",
        "waist", "chest", "arms", "thighs", "calves", "neck", "shoulders",
      ],
      index: true,
    },
    value: { type: Number, required: true },
    inputUnit: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

bodyMetricSchema.index({ username: 1, metric: 1, createdAt: 1 });

export const BodyMetric = models.BodyMetric || model("BodyMetric", bodyMetricSchema);
