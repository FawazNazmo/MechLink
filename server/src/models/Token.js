import mongoose from "mongoose";

const TokenSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    mechanic: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null }, // accepted by
    status: { type: String, enum: ["open", "accepted", "resolved"], default: "open" },
    location: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
    },
    note: { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.model("Token", TokenSchema);
