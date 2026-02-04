// server/src/models/User.js
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const UserSchema = new mongoose.Schema(
  {
    firstName: { type: String, trim: true },
    lastName:  { type: String, trim: true },
    email:     { type: String, trim: true, lowercase: true, unique: true, sparse: true },
    phone:     { type: String, trim: true },
    username:  { type: String, trim: true, unique: true, required: true },
    password:  { type: String, required: true },

    role: { type: String, enum: ["user", "mechanic"], required: true },

    // User-specific
    carDetails: { type: String, trim: true },

    // Mechanic-specific
    garageName:    { type: String, trim: true },
    garageAddress: { type: String, trim: true },
    garageLat:     { type: Number },
    garageLng:     { type: Number },

    // Public weekly schedule visible to users
    // shape: { mon:{start,end,on}, tue:..., ... }
    schedule: { type: Object, default: null },
  },
  { timestamps: true }
);

// Hash password on create/update
UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

UserSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

export default mongoose.model("User", UserSchema);
