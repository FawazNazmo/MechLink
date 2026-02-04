import mongoose from "mongoose";

const conversationSchema = new mongoose.Schema(
  {
    participants: [
      { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    ],
    lastMessageAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// speed up "find by participants"
conversationSchema.index({ participants: 1 });

export default mongoose.model("Conversation", conversationSchema);
