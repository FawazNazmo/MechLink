// server/src/models/BankAccount.js
import mongoose from "mongoose";

const BankAccountSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", unique: true, index: true, required: true },
    accountName: { type: String, trim: true, required: true },
    accountNumber: { type: String, trim: true, required: true }, // keep as string
    sortCode: { type: String, trim: true, required: true },       // e.g. "12-34-56"
  },
  { timestamps: true }
);

export default mongoose.model("BankAccount", BankAccountSchema);
