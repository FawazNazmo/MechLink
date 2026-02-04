// server/src/models/Payment.js
import mongoose from "mongoose";

const PaymentSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    mechanic: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    booking: { type: mongoose.Schema.Types.ObjectId, ref: "Booking" },
    amount: { type: Number, required: true }, // in pence
    currency: { type: String, default: "gbp" },
    kind: { type: String, enum: ["deposit", "final"], default: "deposit" },
    status: { type: String, default: "created" },
    provider: { type: String, default: "stripe" },
    providerId: { type: String }, // payment intent id
  },
  { timestamps: true }
);

export default mongoose.model("Payment", PaymentSchema);
