// server/src/controllers/feedback.controller.js
import Feedback from "../models/Feedback.js";
import Token from "../models/Token.js";
import Booking from "../models/Booking.js";
import User from "../models/User.js";
import mongoose from "mongoose";

/**
 * POST /api/feedback
 * body: { mechanicId, rating, comment?, sourceType? ("token"|"booking"), sourceId? }
 */
export async function createFeedback(req, res, next) {
  try {
    const userId = req.user?.id;
    const { mechanicId, rating, comment, sourceType, sourceId } = req.body || {};

    if (!userId) return res.status(401).json({ message: "Not authenticated" });
    if (!mechanicId || !rating) {
      return res
        .status(400)
        .json({ message: "mechanicId and rating are required" });
    }

    // Validate optional linkage (only after completion/resolution)
    if (sourceType && sourceId) {
      if (sourceType === "token") {
        const t = await Token.findById(sourceId);
        if (!t || String(t.user) !== String(userId))
          return res.status(400).json({ message: "Invalid token reference" });
        if (t.status !== "resolved")
          return res
            .status(400)
            .json({ message: "Can only give feedback after resolution" });
      } else if (sourceType === "booking") {
        const b = await Booking.findById(sourceId);
        if (!b || String(b.user) !== String(userId))
          return res.status(400).json({ message: "Invalid booking reference" });
        if (b.status !== "completed")
          return res
            .status(400)
            .json({ message: "Can only give feedback after completion" });
      } else {
        return res.status(400).json({ message: "Invalid sourceType" });
      }
    }

    const fb = await Feedback.create({
      user: userId,
      mechanic: mechanicId,
      rating: Number(rating),
      comment: comment || "",
      sourceType: sourceType || undefined,
      sourceId: sourceId || undefined,
    });

    res.status(201).json({ feedback: fb });
  } catch (err) {
    if (err?.code === 11000) {
      return res
        .status(409)
        .json({ message: "Feedback already submitted for this job" });
    }
    next(err);
  }
}

/**
 * GET /api/feedback/mechanic/:id
 * List basic feedback for a mechanic (public-ish).
 */
export async function listByMechanic(req, res, next) {
  try {
    const { id } = req.params;
    const list = await Feedback.find({ mechanic: id })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate("user", "username firstName lastName")
      .lean();

    const items = list.map((f) => ({
      rating: f.rating,
      comment: f.comment || "",
      date: f.createdAt,
      userName: f.user?.firstName?.trim() || f.user?.username || "customer",
    }));

    res.json({ items });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/feedback/my-summary  (mechanic)
 */
export async function myFeedbackSummary(req, res, next) {
  try {
    const mechanicId = req.user?.id;
    if (!mechanicId)
      return res.status(401).json({ message: "Not authenticated" });

    const agg = await Feedback.aggregate([
      { $match: { mechanic: new mongoose.Types.ObjectId(mechanicId) } },
      {
        $group: {
          _id: "$mechanic",
          avg: { $avg: "$rating" },
          count: { $sum: 1 },
        },
      },
    ]);

    const stats = agg[0] || { avg: null, count: 0 };

    const latest = await Feedback.find({ mechanic: mechanicId })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate("user", "username firstName lastName")
      .lean();

    const items = latest.map((f) => ({
      rating: f.rating,
      comment: f.comment || "",
      date: f.createdAt,
      userName: f.user?.firstName?.trim() || f.user?.username || "customer",
    }));

    res.json({
      avg: stats.avg ? Number(stats.avg.toFixed(2)) : null,
      count: stats.count || 0,
      items,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/feedback/pending  (user)
 * Returns jobs / tokens that need feedback.
 */
export async function pendingFeedback(req, res, next) {
  try {
    const userId = req.user.id;

    // Completed bookings needing feedback
    const completedBookings = await Booking.find({
      user: userId,
      status: "completed",
      mechanic: { $ne: null },
    }).lean();
    const bookingIds = completedBookings.map((b) => b._id);

    const fbBookings = await Feedback.find({
      user: userId,
      sourceType: "booking",
      sourceId: { $in: bookingIds },
    }).lean();
    const fbBookingIds = new Set(fbBookings.map((f) => String(f.sourceId)));

    const pending = [];

    for (const b of completedBookings) {
      if (!fbBookingIds.has(String(b._id))) {
        pending.push({
          _id: b._id,
          type: "booking",
          mechanic: b.mechanic,
          label: `Service on ${b.preferredDate} at ${b.preferredTime}`,
        });
      }
    }

    // Resolved tokens needing feedback
    const resolvedTokens = await Token.find({
      user: userId,
      status: "resolved",
      mechanic: { $ne: null },
    }).lean();
    const tokenIds = resolvedTokens.map((t) => t._id);

    const fbTokens = await Feedback.find({
      user: userId,
      sourceType: "token",
      sourceId: { $in: tokenIds },
    }).lean();
    const fbTokenIds = new Set(fbTokens.map((f) => String(f.sourceId)));

    for (const t of resolvedTokens) {
      if (!fbTokenIds.has(String(t._id))) {
        pending.push({
          _id: t._id,
          type: "token",
          mechanic: t.mechanic,
          label: "Breakdown assistance job",
        });
      }
    }

    res.json({ pending });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/feedback/summary/:id
 * Public summary for a given mechanic id (avg + count).
 */
export async function mechanicSummary(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.json({ avg: null, count: 0 });
    }
    const agg = await Feedback.aggregate([
      { $match: { mechanic: new mongoose.Types.ObjectId(id) } },
      {
        $group: {
          _id: "$mechanic",
          avg: { $avg: "$rating" },
          count: { $sum: 1 },
        },
      },
    ]);
    const avg = agg[0]?.avg ? Number(agg[0].avg.toFixed(2)) : null;
    const count = agg[0]?.count || 0;
    res.json({ avg, count });
  } catch (err) {
    next(err);
  }
}
