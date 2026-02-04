// server/src/controllers/booking.controller.js
import Booking from "../models/Booking.js";
import ServiceRecord from "../models/ServiceRecord.js";
import AlertSetting from "../models/AlertSetting.js";
import User from "../models/User.js";
import { sendEmail } from "../utils/sendEmail.js";
import { computeFairRange, classifyPrice } from "../utils/pricing.js";

function addDays(d, days) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}
function addMonths(d, months) {
  const x = new Date(d);
  x.setMonth(x.getMonth() + months);
  return x;
}
function safeDate(v) {
  const d = v ? new Date(v) : null;
  return d && !isNaN(d.getTime()) ? d : null;
}

// ✅ Robust select strings (works even if some fields are select:false)
const USER_CONTACT_SELECT =
  "username firstName lastName carDetails " +
  "email phone phoneNumber mobile mobileNumber contactNumber " +
  "+email +phone +phoneNumber +mobile +mobileNumber +contactNumber";

const MECH_CONTACT_SELECT =
  "username firstName lastName garageName garageAddress address " +
  "email phone phoneNumber mobile mobileNumber contactNumber " +
  "+email +phone +phoneNumber +mobile +mobileNumber +contactNumber";

// Evidence timeline helper
async function addEvent(booking, type, byRole, note = "") {
  booking.events = booking.events || [];
  booking.events.push({
    at: new Date(),
    type,
    byRole,
    note,
  });
  await booking.save();
}

/**
 * POST /api/bookings
 * body: { mechanicId, issue, preferredDate (YYYY-MM-DD), preferredTime (HH:mm), notes }
 * Creates a 'requested' booking. £10 deposit = OFF-platform demo.
 */
export async function createBooking(req, res, next) {
  try {
    const { mechanicId, issue, preferredDate, preferredTime, notes } =
      req.body || {};

    if (!mechanicId || !issue || !preferredDate || !preferredTime) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const mech = await User.findById(mechanicId);
    if (!mech || mech.role !== "mechanic") {
      return res.status(404).json({ message: "Mechanic not found" });
    }

    const clash = await Booking.findOne({
      mechanic: mechanicId,
      preferredDate,
      preferredTime,
      status: { $in: ["requested", "accepted"] },
    }).lean();

    if (clash) {
      return res
        .status(409)
        .json({ message: "Mechanic already booked for that date and time." });
    }

    const booking = await Booking.create({
      user: req.user.id,
      mechanic: mechanicId,
      issue,
      preferredDate,
      preferredTime,
      notes: notes || "",
      status: "requested",
      events: [],
    });

    // Evidence timeline
    await addEvent(
      booking,
      "created",
      "user",
      `Booking requested for ${preferredDate} ${preferredTime}`
    );

    // ✅ Return populated booking (useful for UI immediately)
    const populated = await Booking.findById(booking._id)
      .populate("user", USER_CONTACT_SELECT)
      .populate("mechanic", MECH_CONTACT_SELECT);

    res.status(201).json({ booking: populated || booking });
  } catch (e) {
    next(e);
  }
}

/**
 * GET /api/bookings/me   (user)
 */
export async function myBookings(req, res, next) {
  try {
    const list = await Booking.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .populate("mechanic", MECH_CONTACT_SELECT);

    res.json({ bookings: list });
  } catch (e) {
    next(e);
  }
}

/**
 * GET /api/bookings/assigned   (mechanic)
 * ✅ FIX: populate user contact details so Upcoming Service Bookings shows Email/Phone
 */
export async function assignedBookings(req, res, next) {
  try {
    const list = await Booking.find({ mechanic: req.user.id })
      .sort({ preferredDate: 1, preferredTime: 1 })
      .populate("user", USER_CONTACT_SELECT);

    res.json({ bookings: list });
  } catch (e) {
    next(e);
  }
}

/**
 * POST /api/bookings/:id/accept   (mechanic)
 */
export async function acceptBooking(req, res, next) {
  try {
    if (!req.user || req.user.role !== "mechanic") {
      return res.status(403).json({ message: "Mechanic only" });
    }

    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: "Not found" });
    if (String(booking.mechanic) !== String(req.user.id)) {
      return res.status(403).json({ message: "Not your booking" });
    }

    if (!["requested"].includes(booking.status)) {
      return res
        .status(400)
        .json({ message: "Only requested bookings can be accepted." });
    }

    booking.status = "accepted";
    await booking.save();
    await addEvent(
      booking,
      "accepted",
      "mechanic",
      "Mechanic accepted the booking."
    );

    res.json({ booking });
  } catch (e) {
    next(e);
  }
}

/**
 * POST /api/bookings/:id/complete  (mechanic)
 * body: { service, cost, notes, nextServiceDate, serviceType, carSize }
 * Creates ServiceRecord + schedules reminder email + Fair Price + Return-Visit.
 */
export async function completeBooking(req, res, next) {
  try {
    if (!req.user || req.user.role !== "mechanic") {
      return res.status(403).json({ message: "Mechanic only" });
    }

    const booking = await Booking.findById(req.params.id).populate(
      "user",
      "email firstName +email"
    );
    if (!booking) return res.status(404).json({ message: "Not found" });
    if (String(booking.mechanic) !== String(req.user.id)) {
      return res.status(403).json({ message: "Not your booking" });
    }

    const { service, cost, notes, nextServiceDate, serviceType, carSize } =
      req.body || {};

    const numericCost =
      typeof cost === "number"
        ? cost
        : cost != null
        ? Number(cost)
        : 0;

    const normalizedServiceType = serviceType || "diagnostic";
    const normalizedCarSize = carSize || "any";

    // Fair price calculation
    const fairRange = computeFairRange(normalizedServiceType, normalizedCarSize);
    const fairInfo = classifyPrice(numericCost, fairRange);

    booking.serviceType = normalizedServiceType;
    booking.carSize = normalizedCarSize;
    booking.estimatedCost = numericCost;
    booking.fairFlag = fairInfo.flag || "unknown";
    booking.fairMin = fairRange ? fairRange.min : null;
    booking.fairMax = fairRange ? fairRange.max : null;

    const nextDate = safeDate(nextServiceDate) || addMonths(new Date(), 6);
    const remindAt = addDays(nextDate, -7);

    // Create service record
    const record = await ServiceRecord.create({
      user: booking.user._id,
      mechanic: booking.mechanic,
      service: service || booking.issue,
      cost: numericCost,
      notes: notes || "",
      date: new Date(),
      nextServiceDate: nextDate,
      remindAt,
      reminderSent: false,

      serviceType: normalizedServiceType,
      carSize: normalizedCarSize,
      fairFlag: fairInfo.flag || "unknown",
      fairMin: fairRange ? fairRange.min : null,
      fairMax: fairRange ? fairRange.max : null,
    });

    // Return-Visit Detector: same user + same serviceType within last 30 days
    if (normalizedServiceType) {
      const now = new Date();
      const since = addDays(now, -30);

      const previous = await ServiceRecord.findOne({
        user: booking.user._id,
        serviceType: normalizedServiceType,
        _id: { $ne: record._id },
        date: { $gte: since, $lte: now },
      })
        .sort({ date: -1 })
        .lean();

      if (previous) {
        record.isReturnVisit = true;
        record.linkedRecord = previous._id;
        await record.save();
      }
    }

    booking.status = "completed";
    await booking.save();
    await addEvent(
      booking,
      "completed",
      "mechanic",
      `Job completed at cost £${numericCost}`
    );

    // ------------ EMAIL: completion & reminder ------------
    const setting = await AlertSetting.findOne({ user: booking.user._id });

    // If emailReminders is undefined, treat as true (enabled)
    const emailAllowed =
      setting?.emailReminders === undefined ? true : setting.emailReminders;

    // Use AlertSetting.email if present, otherwise fallback to user login email
    const toAddress = setting?.email || booking.user.email;

    if (emailAllowed && toAddress) {
      const name = booking.user.firstName || "there";
      await sendEmail(
        toAddress,
        "MechLink: Service Completed",
        `Hello ${name}, your "${
          record.service
        }" service has been completed.\n\nFinal cost: £${numericCost.toFixed(
          2
        )}.\nNext service due: ${nextDate.toDateString()}.\nWe'll remind you a week before.`
      );
    }

    res.json({ booking, record });
  } catch (e) {
    next(e);
  }
}

/**
 * POST /api/bookings/check
 * body: { mechanicId, date (YYYY-MM-DD), time (HH:mm) }
 * Checks BOTH mechanic schedule and double-booking.
 */
export async function checkBookingSlot(req, res, next) {
  try {
    const { mechanicId, date, time } = req.body || {};
    if (!mechanicId || !date || !time) {
      return res.status(400).json({ ok: false, reason: "Missing fields" });
    }

    const mech = await User.findById(mechanicId).lean();
    if (!mech || mech.role !== "mechanic") {
      return res.status(404).json({ ok: false, reason: "Mechanic not found" });
    }

    if (mech.schedule) {
      const dayNames = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
      const dayIdx = new Date(date + "T00:00:00Z").getUTCDay();
      const key = dayNames[dayIdx];
      const cfg = mech.schedule[key];

      if (!cfg || !cfg.on) {
        return res.json({
          ok: false,
          reason: "Mechanic is not available that day.",
        });
      }
      if (cfg.start && cfg.end) {
        if (time < cfg.start || time > cfg.end) {
          return res.json({
            ok: false,
            reason: `Mechanic works between ${cfg.start} and ${cfg.end} on that day.`,
          });
        }
      }
    }

    const clash = await Booking.findOne({
      mechanic: mechanicId,
      preferredDate: date,
      preferredTime: time,
      status: { $in: ["requested", "accepted"] },
    }).lean();

    if (clash) {
      return res.json({
        ok: false,
        reason: "Mechanic already booked for that time.",
      });
    }

    return res.json({ ok: true });
  } catch (e) {
    next(e);
  }
}

/**
 * POST /api/bookings/:id/cancel  (mechanic)
 * Mechanic cancels → user gets email about £10 refund in 3 working days.
 */
export async function cancelBookingByMechanic(req, res, next) {
  try {
    if (!req.user || req.user.role !== "mechanic") {
      return res.status(403).json({ message: "Mechanic only" });
    }

    const booking = await Booking.findOne({
      _id: req.params.id,
      mechanic: req.user.id,
    }).populate("user", "email firstName +email");

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    if (!["requested", "accepted"].includes(booking.status)) {
      return res
        .status(400)
        .json({ message: "Only pending bookings can be cancelled." });
    }

    booking.status = "cancelled_by_mechanic";
    await booking.save();
    await addEvent(
      booking,
      "cancelled_by_mechanic",
      "mechanic",
      "Booking cancelled by mechanic."
    );

    if (booking.user?.email) {
      const when = booking.preferredDate
        ? `${booking.preferredDate} at ${booking.preferredTime || ""}`
        : "your upcoming booking";

      await sendEmail(
        booking.user.email,
        "MechLink – Booking cancelled & deposit refund",
        `Hi ${booking.user.firstName || ""},\n\n` +
          `Your booking (${when}) was cancelled by the mechanic.\n\n` +
          `Your £10 deposit will be refunded to your account within 3 working days.\n\n` +
          `If you still need help, you can create a new booking in MechLink.\n\n` +
          `MechLink`
      );
    }

    res.json({ booking });
  } catch (e) {
    next(e);
  }
}

/**
 * POST /api/bookings/:id/cancel-user  (user)
 */
export async function cancelBookingByUser(req, res, next) {
  try {
    if (!req.user || req.user.role !== "user") {
      return res.status(403).json({ message: "User only" });
    }

    const booking = await Booking.findOne({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    if (!["requested", "accepted"].includes(booking.status)) {
      return res
        .status(400)
        .json({ message: "Only pending bookings can be cancelled." });
    }

    booking.status = "cancelled_by_user";
    await booking.save();
    await addEvent(
      booking,
      "cancelled_by_user",
      "user",
      "Booking cancelled by user."
    );

    res.json({ booking });
  } catch (e) {
    next(e);
  }
}

/**
 * POST /api/bookings/:id/no-show  (mechanic)
 * Mechanic marks that user did not show up.
 */
export async function markNoShowUser(req, res, next) {
  try {
    if (!req.user || req.user.role !== "mechanic") {
      return res.status(403).json({ message: "Mechanic only" });
    }

    const booking = await Booking.findOne({
      _id: req.params.id,
      mechanic: req.user.id,
    });

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    if (!["accepted"].includes(booking.status)) {
      return res
        .status(400)
        .json({ message: "Only accepted bookings can be marked as no-show." });
    }

    booking.status = "no_show_user";
    await booking.save();
    await addEvent(
      booking,
      "no_show_user",
      "mechanic",
      "User did not arrive for the booking."
    );

    res.json({ booking });
  } catch (e) {
    next(e);
  }
}
