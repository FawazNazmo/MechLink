// server/src/models/BreakdownToken.js
import mongoose from "mongoose";

const PointSchema = new mongoose.Schema({
  type: { type: String, enum: ["Point"], default: "Point" },
  coordinates: { type: [Number], required: true }, // [lng, lat]
});

const BreakdownTokenSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    mechanic: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    // GeoJSON point (2dsphere)
    location: { type: PointSchema, index: "2dsphere", required: true },

    status: {
      type: String,
      enum: ["open", "accepted", "resolved", "rejected"],
      default: "open",
    },

    note: { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.model("BreakdownToken", BreakdownTokenSchema);
