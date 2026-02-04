// server/src/models/Booking.js
import mongoose from "mongoose";

const BookingEventSchema = new mongoose.Schema(
  {
    at: { type: Date, default: Date.now },
    type: { type: String, required: true }, // 'created','accepted','completed','cancelled_by_user', etc
    byRole: {
      type: String,
      enum: ["user", "mechanic", "system"],
      required: true,
    },
    note: { type: String, default: "" },
  },
  { _id: false }
);

const BookingSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    mechanic: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    issue: { type: String, required: true },
    preferredDate: { type: String, required: true }, // YYYY-MM-DD
    preferredTime: { type: String, required: true }, // HH:mm
    notes: { type: String, default: "" },

    status: {
      type: String,
      enum: [
        "requested",
        "accepted",
        "completed",
        "cancelled",
        "cancelled_by_user",
        "cancelled_by_mechanic",
        "no_show_user",
      ],
      default: "requested",
    },

    // Evidence timeline for complaints / audit
    events: { type: [BookingEventSchema], default: [] },

    // Pricing / classification (for fair price & integrity)
    serviceType: { type: String }, // 'diagnostic','full_service', etc
    carSize: { type: String }, // 'small','medium','large','any'
    estimatedCost: { type: Number },

    fairFlag: {
      type: String,
      enum: ["fair", "high", "low", "unknown"],
      default: "unknown",
    },
    fairMin: { type: Number },
    fairMax: { type: Number },
  },
  { timestamps: true }
);

// Prevent double booking for the same mechanic/date/time unless booking is cancelled
BookingSchema.index(
  { mechanic: 1, preferredDate: 1, preferredTime: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: {
        $nin: ["cancelled", "cancelled_by_user", "cancelled_by_mechanic"],
      },
    },
  }
);

export default mongoose.model("Booking", BookingSchema);
