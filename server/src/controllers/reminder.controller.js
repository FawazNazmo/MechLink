// server/src/controllers/reminder.controller.js
import VehicleReminder from "../models/VehicleReminder.js";

function toDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * GET /api/reminders/me
 * Returns the MOT / insurance / tax reminder profile for the current user.
 */
export async function getMyReminders(req, res, next) {
  try {
    const doc = await VehicleReminder.findOne({ user: req.user.id }).lean();

    if (!doc) {
      return res.json({
        profile: {
          registration: "",
          motExpiry: null,
          insuranceExpiry: null,
          taxExpiry: null,
        },
      });
    }

    res.json({ profile: doc });
  } catch (e) {
    next(e);
  }
}

/**
 * POST /api/reminders/me
 * body: { registration, motExpiry, insuranceExpiry, taxExpiry }
 * Creates/updates the reminder profile for the current user.
 */
export async function saveMyReminders(req, res, next) {
  try {
    const { registration, motExpiry, insuranceExpiry, taxExpiry } = req.body || {};

    const doc = await VehicleReminder.findOneAndUpdate(
      { user: req.user.id },
      {
        user: req.user.id,
        registration: registration || "",
        motExpiry: toDate(motExpiry),
        insuranceExpiry: toDate(insuranceExpiry),
        taxExpiry: toDate(taxExpiry),
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    ).lean();

    res.json({ profile: doc });
  } catch (e) {
    next(e);
  }
}
