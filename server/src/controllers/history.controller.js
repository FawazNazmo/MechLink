// server/src/controllers/history.controller.js
import ServiceRecord from "../models/ServiceRecord.js";

/* ---------- Helpers ---------- */

function computeAlerts(records) {
  const alerts = [];
  const today = new Date();
  const in60 = new Date();
  in60.setDate(today.getDate() + 60); // 60 days ahead

  records.forEach((r) => {
    if (!r.nextServiceDate) return;
    const d = new Date(r.nextServiceDate);
    if (isNaN(d.getTime())) return;
    if (d >= today && d <= in60) {
      alerts.push({
        id: String(r._id),
        message: `Upcoming ${r.service} service`,
        date: d.toISOString(),
      });
    }
  });

  return alerts;
}

function computeRisk(records) {
  if (!records.length) {
    return {
      level: "Medium",
      score: 50,
      reasons: ["No recorded services – we recommend a full check-up."],
      daysSinceLast: null,
    };
  }

  const now = new Date();
  const oneDay = 24 * 60 * 60 * 1000;

  const sorted = [...records].sort(
    (a, b) =>
      new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt)
  );
  const last = sorted[0];
  const lastDate = new Date(last.date || last.createdAt);
  let daysSince = Math.round((now - lastDate) / oneDay);
  if (isNaN(daysSince)) daysSince = 365;

  let score = 40;
  const reasons = [];

  if (daysSince > 365) {
    score += 40;
    reasons.push("Last service was over 12 months ago.");
  } else if (daysSince > 180) {
    score += 25;
    reasons.push("Last service was over 6 months ago.");
  } else {
    reasons.push("You had a service within the last 6 months.");
  }

  const breakdownCount = records.filter((r) =>
    String(r.service || "")
      .toLowerCase()
      .includes("breakdown")
  ).length;

  if (breakdownCount >= 2) {
    score += 20;
    reasons.push("Multiple breakdown/emergency jobs recorded.");
  }

  if (score > 100) score = 100;

  let level = "Low";
  if (score >= 75) level = "High";
  else if (score >= 50) level = "Medium";

  return { level, score, reasons, daysSinceLast: daysSince };
}

/* ---------- Controllers ---------- */

/**
 * GET /api/history   (user)
 * Returns: { items, alerts, risk }
 */
export async function getHistory(req, res, next) {
  try {
    const records = await ServiceRecord.find({ user: req.user.id })
      .sort({ date: -1 })
      .populate("mechanic", "firstName lastName username garageName");

    const items = records.map((r) => ({
      id: r._id,
      mechanic:
        r.mechanic?.garageName ||
        `${r.mechanic?.firstName || ""} ${
          r.mechanic?.lastName || ""
        }`.trim() ||
        r.mechanic?.username ||
        "Mechanic",
      service: r.service,
      notes: r.notes,
      date: r.date,
      cost: r.cost,
      nextServiceDate: r.nextServiceDate,

      // Fair Price Guardian info
      fairFlag: r.fairFlag || "unknown",
      fairMin: r.fairMin,
      fairMax: r.fairMax,

      // Return-Visit Detector
      isReturnVisit: !!r.isReturnVisit,
      linkedRecord: r.linkedRecord || null,
    }));

    const alerts = computeAlerts(records);
    const risk = computeRisk(records);

    res.json({ items, alerts, risk });
  } catch (e) {
    next(e);
  }
}

/**
 * GET /api/history/mechanic   (mechanic)
 * Used for analytics on Mechanic dashboard.
 */
export async function getMechanicHistory(req, res, next) {
  try {
    const records = await ServiceRecord.find({ mechanic: req.user.id })
      .sort({ date: -1 })
      .populate("user", "firstName lastName username");

    const items = records.map((r) => ({
      id: r._id,
      user:
        `${r.user?.firstName || ""} ${r.user?.lastName || ""}`.trim() ||
        r.user?.username ||
        "User",
      service: r.service,
      notes: r.notes,
      date: r.date,
      cost: r.cost,
      fairFlag: r.fairFlag || "unknown",
      isReturnVisit: !!r.isReturnVisit,
    }));

    res.json({ items });
  } catch (e) {
    next(e);
  }
}
