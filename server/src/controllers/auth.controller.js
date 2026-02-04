// server/src/controllers/auth.controller.js
import jwt from "jsonwebtoken";
import User from "../models/User.js";

// ✅ single secret used everywhere
const JWT_SECRET = "mechlink-secret-2025";
const sign = (payload) => jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });

export async function register(req, res, next) {
  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      username,
      password,
      role,
      carDetails,
      garageName,
      garageAddress,
      garageLat,
      garageLng,
    } = req.body || {};

    if (!username || !password || !role) {
      return res
        .status(400)
        .json({ message: "username, password and role are required" });
    }
    if (!["user", "mechanic"].includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    const exists = await User.findOne({
      $or: [{ username }, { email }],
    });
    if (exists) {
      return res
        .status(409)
        .json({ message: "Username or email already in use" });
    }

    const user = await User.create({
      firstName,
      lastName,
      email,
      phone,
      username,
      password,
      role,
      carDetails: role === "user" ? carDetails || "" : undefined,
      garageName: role === "mechanic" ? garageName : undefined,
      garageAddress: role === "mechanic" ? garageAddress : undefined,
      garageLat: role === "mechanic" ? garageLat : undefined,
      garageLng: role === "mechanic" ? garageLng : undefined,
    });

    const token = sign({ id: user._id, role: user.role });

    res.status(201).json({
      token,
      user: {
        id: user._id,
        username: user.username,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        carDetails: user.carDetails,
        garageName: user.garageName,
        garageAddress: user.garageAddress,
      },
    });
  } catch (e) {
    next(e);
  }
}

export async function login(req, res, next) {
  try {
    const { email, username, password } = req.body || {};
    if (!password || (!email && !username)) {
      return res
        .status(400)
        .json({ message: "email/username and password required" });
    }

    const user = await User.findOne(email ? { email } : { username });
    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    const ok = await user.comparePassword(password);
    if (!ok) return res.status(401).json({ message: "Invalid credentials" });

    const token = sign({ id: user._id, role: user.role });

    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        carDetails: user.carDetails,
        garageName: user.garageName,
        garageAddress: user.garageAddress,
      },
    });
  } catch (e) {
    next(e);
  }
}

export async function me(req, res, next) {
  try {
    const user = await User.findById(req.user.id).lean();
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({
      user: {
        id: user._id,
        username: user.username,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        carDetails: user.carDetails,
        garageName: user.garageName,
        garageAddress: user.garageAddress,
      },
    });
  } catch (e) {
    next(e);
  }
}
