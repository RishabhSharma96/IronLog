import { Schema, model, models } from "mongoose";

const userSchema = new Schema(
  {
    username: { type: String, required: true, unique: true, lowercase: true, trim: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export const User = models.User || model("User", userSchema);
