// server/src/models/Vehicle.js
import mongoose from "mongoose";

const vehicleSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    make: { type: String, required: true },
    model: { type: String, required: true },
    year: { type: Number, required: true },
    mileage: { type: Number, default: 0 }, // in km or miles, be consistent

    // Health / maintenance
    lastServiceDate: { type: Date },
    healthScore: { type: Number, default: 100 },

    // UK compliance
    motDueDate: { type: Date },
    insuranceDueDate: { type: Date },
    taxDueDate: { type: Date },
    documents: [
      {
        type: {
          type: String,
          enum: ["MOT", "INSURANCE", "TAX", "OTHER"],
          default: "OTHER",
        },
        url: String, // if you ever add file upload
      },
    ],
  },
  { timestamps: true }
);

const Vehicle = mongoose.model("Vehicle", vehicleSchema);
export default Vehicle;
