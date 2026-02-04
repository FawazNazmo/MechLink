// server/src/models/Feedback.js
import mongoose from "mongoose";

const FeedbackSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    mechanic: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    rating: { type: Number, min: 1, max: 5, required: true },
    comment: { type: String, default: "" },

    // optional linkage so we can rate only once per job/token
    sourceType: { type: String, enum: ["token", "booking"], required: false },
    sourceId: { type: mongoose.Schema.Types.ObjectId, required: false, index: true },
  },
  { timestamps: true }
);

// prevent duplicate feedback for same source by same user
FeedbackSchema.index({ user: 1, sourceType: 1, sourceId: 1 }, { unique: true, sparse: true });

export default mongoose.model("Feedback", FeedbackSchema);
