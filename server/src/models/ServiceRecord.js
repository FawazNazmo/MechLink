// server/src/models/ServiceRecord.js
import mongoose from "mongoose";

const ServiceRecordSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    mechanic: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // What was done
    service: { type: String, required: true }, // e.g., "Oil change"
    notes: { type: String, default: "" },

    // When it was done
    date: { type: Date, default: Date.now },

    // Cost (optional)
    cost: { type: Number, default: 0 },

    // Maintenance reminder info
    nextServiceDate: { type: Date, default: null },
    remindAt: { type: Date, default: null },
    reminderSent: { type: Boolean, default: false },

    // --- NEW: pricing / classification metadata (for fair price & integrity) ---
    serviceType: { type: String }, // e.g. 'diagnostic', 'full_service'
    carSize: { type: String }, // 'small','medium','large','any'

    fairFlag: {
      type: String,
      enum: ["fair", "high", "low", "unknown"],
      default: "unknown",
    },
    fairMin: { type: Number },
    fairMax: { type: Number },

    // Return-Visit Detector
    isReturnVisit: { type: Boolean, default: false },
    linkedRecord: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ServiceRecord",
      default: null,
    },
  },
  { timestamps: true }
);

export default mongoose.model("ServiceRecord", ServiceRecordSchema);
