import { Schema, model, models } from "mongoose";

const countsSchema = new Schema(
  {
    Mon: { type: Number, default: 0, min: 0 },
    Tue: { type: Number, default: 0, min: 0 },
    Wed: { type: Number, default: 0, min: 0 },
    Thu: { type: Number, default: 0, min: 0 },
    Fri: { type: Number, default: 0, min: 0 },
    Sat: { type: Number, default: 0, min: 0 },
  },
  { _id: false },
);

const questDailySnapshotSchema = new Schema(
  {
    username: { type: String, required: true, lowercase: true, trim: true },
    /** Client local calendar day YYYY-MM-DD */
    date: { type: String, required: true },
    counts: { type: countsSchema, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: true } },
);

questDailySnapshotSchema.index({ username: 1, date: 1 }, { unique: true });

export const QuestDailySnapshot =
  models.QuestDailySnapshot || model("QuestDailySnapshot", questDailySnapshotSchema);
