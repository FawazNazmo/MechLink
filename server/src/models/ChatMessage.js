// server/src/models/ChatMessage.js
import mongoose from "mongoose";

const ChatMessageSchema = new mongoose.Schema(
  {
    // Always the car owner
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Always the mechanic
    mechanic: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Who sent this message (can be user or mechanic)
    from: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    text: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { timestamps: true }
);

// query all messages in a conversation in time order
ChatMessageSchema.index({ user: 1, mechanic: 1, createdAt: 1 });

export default mongoose.model("ChatMessage", ChatMessageSchema);
