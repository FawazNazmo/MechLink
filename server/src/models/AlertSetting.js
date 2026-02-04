// server/src/models/AlertSetting.js
import mongoose from "mongoose";

const AlertSettingSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      unique: true,
      required: true,
    },

    // Optional override email for reminders.
    // If missing, we fall back to the login email from User.email.
    email: { type: String },

    // If null/undefined, we treat as true (reminders enabled).
    emailReminders: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model("AlertSetting", AlertSettingSchema);
