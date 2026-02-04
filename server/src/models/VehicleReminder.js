// server/src/models/VehicleReminder.js
import mongoose from "mongoose";

const VehicleReminderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      unique: true,
      required: true,
    },
    // optional: vehicle registration number
    registration: { type: String, default: "" },

    // key legal dates
    motExpiry: { type: Date, default: null },
    insuranceExpiry: { type: Date, default: null },
    taxExpiry: { type: Date, default: null }, // road tax (optional)
  },
  { timestamps: true }
);

export default mongoose.model("VehicleReminder", VehicleReminderSchema);
