// server/src/controllers/booking.controller.js
import Booking from "../models/Booking.js";
import ServiceRecord from "../models/ServiceRecord.js";
import AlertSetting from "../models/AlertSetting.js";
import User from "../models/User.js";
import { sendEmail } from "../utils/sendEmail.js";

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

/**
 * POST /api/bookings
 * body: { mechanicId, issue, preferredDate (YYYY-MM-DD), preferredTime (HH:mm), notes }
 * Creates a 'requested' booking. (£10 deposit handled separately / demo.)
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
    });

    res.status(201).json({ booking });
  } catch (e) {
    next(e);
  }
}

/**
 * GET /api/bookings/me  (user)
 */
export async function myBookings(req, res, next) {
  try {
    const list = await Booking.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .populate("mechanic", "username firstName lastName garageName");
    res.json({ bookings: list });
  } catch (e) {
    next(e);
  }
}

/**
 * GET /api/bookings/assigned (mechanic)
 */
export async function assignedBookings(req, res, next) {
  try {
    const list = await Booking.find({ mechanic: req.user.id })
      .sort({ preferredDate: 1, preferredTime: 1 })
      .populate("user", "username firstName lastName carDetails");
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
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: "Not found" });
    if (String(booking.mechanic) !== String(req.user.id)) {
      return res.status(403).json({ message: "Not your booking" });
    }
    booking.status = "accepted";
    await booking.save();
    res.json({ booking });
  } catch (e) {
    next(e);
  }
}

/**
 * POST /api/bookings/:id/complete  (mechanic)
 * body: { service, cost, notes, nextServiceDate }
 * Creates ServiceRecord + schedules reminder email.
 */
export async function completeBooking(req, res, next) {
  try {
    const booking = await Booking.findById(req.params.id).populate(
      "user",
      "email firstName"
    );
    if (!booking) return res.status(404).json({ message: "Not found" });
    if (String(booking.mechanic) !== String(req.user.id)) {
      return res.status(403).json({ message: "Not your booking" });
    }

    const { service, cost, notes, nextServiceDate } = req.body;

    const nextDate =
      safeDate(nextServiceDate) || addMonths(new Date(), 6); // default 6 months later
    const remindAt = addDays(nextDate, -7);

    const record = await ServiceRecord.create({
      user: booking.user._id,
      mechanic: booking.mechanic,
      service: service || booking.issue,
      cost: typeof cost === "number" ? cost : 0,
      notes: notes || "",
      date: new Date(), // ensure history date is set
      nextServiceDate: nextDate,
      remindAt,
      reminderSent: false,
    });

    booking.status = "completed";
    await booking.save();

    // Email completion / reminder info if user opted in
    const setting = await AlertSetting.findOne({ user: booking.user._id });
    if (setting?.emailReminders && setting.email) {
      await sendEmail(
        setting.email,
        "MechLink: Service Completed",
        `Hello ${booking.user.firstName || "there"}, your "${
          record.service
        }" service has been completed.\n\nNext service due: ${nextDate.toDateString()}.\nWe'll remind you a week before.`
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
 * Returns { ok: boolean, reason?: string } for slot validation.
 * Checks BOTH schedule availability and double-booking.
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

    // 1) schedule availability
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

    // 2) double booking
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
 * Mechanic cancels a future booking.
 * Notifies user that the £10 deposit will be refunded in 3 working days.
 */
export async function cancelBookingByMechanic(req, res, next) {
  try {
    if (!req.user || req.user.role !== "mechanic") {
      return res.status(403).json({ message: "Mechanic only" });
    }

    const bookingId = req.params.id;

    const booking = await Booking.findOne({
      _id: bookingId,
      mechanic: req.user.id,
    }).populate("user", "email firstName");

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    if (!["requested", "accepted"].includes(booking.status)) {
      return res
        .status(400)
        .json({ message: "Only pending bookings can be cancelled." });
    }

    booking.status = "cancelled";
    await booking.save();

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
