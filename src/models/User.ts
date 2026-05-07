import { Schema, model, models } from "mongoose";

const dayLabelsSchema = new Schema(
  {
    Mon: { type: String, default: "", trim: true, maxlength: 48 },
    Tue: { type: String, default: "", trim: true, maxlength: 48 },
    Wed: { type: String, default: "", trim: true, maxlength: 48 },
    Thu: { type: String, default: "", trim: true, maxlength: 48 },
    Fri: { type: String, default: "", trim: true, maxlength: 48 },
    Sat: { type: String, default: "", trim: true, maxlength: 48 },
    Sun: { type: String, default: "", trim: true, maxlength: 48 },
  },
  { _id: false },
);

const userSchema = new Schema(
  {
    username: { type: String, required: true, unique: true, lowercase: true, trim: true },
    /** Custom names per weekday, e.g. "Push day", "Pull day" */
    dayLabels: { type: dayLabelsSchema, default: () => ({}) },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export const User = models.User || model("User", userSchema);
