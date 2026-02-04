// server/src/server.js
import express from "express";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";
import mongoose from "mongoose";
import cron from "node-cron";

import ServiceRecord from "./models/ServiceRecord.js";
import { verifyEmailTransport, sendEmail } from "./utils/sendEmail.js";

import authRoutes from "./routes/auth.routes.js";
import tokenRoutes from "./routes/token.routes.js";
import mechanicsRoutes from "./routes/mechanics.routes.js";
import bookingsRoutes from "./routes/bookings.routes.js";
import historyRoutes from "./routes/history.routes.js";
import paymentsRoutes from "./routes/payments.routes.js";
import bankRoutes from "./routes/bank.routes.js";
import feedbackRoutes from "./routes/feedback.routes.js";
import reminderRoutes from "./routes/reminder.routes.js";
import chatRoutes from "./routes/chat.routes.js";

dotenv.config();

const app = express();

// DB
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/mechlink";
mongoose
  .connect(MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err.message);
    process.exit(1);
  });

// Middlewares
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || "http://localhost:3000",
    credentials: true,
  })
);
app.use(express.json());
app.use(morgan("dev"));

// Health
app.get("/api/health", (_req, res) => res.json({ ok: true }));

// Verify SMTP once at startup (top-level await is fine in ESM)
await verifyEmailTransport();

// ⭐ DAILY CRON: maintenance/service reminders based on nextServiceDate/remindAt
cron.schedule("0 9 * * *", async () => {
  // runs every day at 09:00 server time
  try {
    const now = new Date();

    const records = await ServiceRecord.find({
      remindAt: { $lte: now },
      reminderSent: false,
    }).populate("user", "email firstName");

    if (!records.length) return;

    for (const rec of records) {
      const user = rec.user;
      if (!user?.email) continue;

      const serviceName = rec.service || "scheduled service";
      const nextDate = rec.nextServiceDate
        ? new Date(rec.nextServiceDate).toLocaleDateString()
        : null;

      const textLines = [
        `Hi ${user.firstName || ""},`,
        "",
        `This is a reminder from MechLink for your upcoming vehicle service: "${serviceName}".`,
      ];
      if (nextDate) {
        textLines.push(`Recommended around: ${nextDate}.`);
      }
      textLines.push("", "Please book your mechanic visit at a convenient time.", "", "MechLink");

      await sendEmail({
        to: user.email,
        subject: "MechLink – Service / maintenance reminder",
        text: textLines.join("\n"),
      });

      rec.reminderSent = true;
      await rec.save();
    }

    console.log(`📧 MechLink: sent ${records.length} maintenance reminder email(s).`);
  } catch (err) {
    console.error("🔥 Reminder cron error:", err);
  }
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/tokens", tokenRoutes);
app.use("/api/mechanics", mechanicsRoutes);
app.use("/api/bookings", bookingsRoutes);
app.use("/api/history", historyRoutes);
app.use("/api/payments", paymentsRoutes);
app.use("/api/bank", bankRoutes);
app.use("/api/feedback", feedbackRoutes);
app.use("/api/chat", chatRoutes);

// Error handler ✅ supports both statusCode and status
app.use((err, _req, res, _next) => {
  console.error("🔥 Error:", err);
  res
    .status(err.statusCode || err.status || 500)
    .json({ message: err.message || "Server error" });
});

// Start
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
