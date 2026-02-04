// server/src/controllers/mechanics.controller.js
import User from "../models/User.js";
import Feedback from "../models/Feedback.js";
import ServiceRecord from "../models/ServiceRecord.js";
import { haversineKm } from "../utils/distance.js";

/**
 * POST /api/mechanics/schedule   (mechanic)
 * body: { schedule }
 */
export async function saveSchedule(req, res, next) {
  try {
    if (!req.user || req.user.role !== "mechanic") {
      return res.status(403).json({ message: "Mechanic only" });
    }

    const { schedule } = req.body || {};
    if (!schedule) {
      return res.status(400).json({ message: "Missing schedule" });
    }

    const updated = await User.findByIdAndUpdate(
      req.user.id,
      { schedule },
      { new: true }
    ).lean();

    return res.json({ schedule: updated?.schedule || schedule });
  } catch (e) {
    next(e);
  }
}

/**
 * POST /api/mechanics/location   (mechanic)
 * body: { lat, lng }
 * Saves the mechanic's current location so users can find them.
 */
export async function saveLocation(req, res, next) {
  try {
    if (!req.user || req.user.role !== "mechanic") {
      return res.status(403).json({ message: "Mechanic only" });
    }

    const { lat, lng } = req.body || {};
    if (lat == null || lng == null) {
      return res.status(400).json({ message: "Missing lat/lng" });
    }

    const updated = await User.findByIdAndUpdate(
      req.user.id,
      {
        location: {
          lat: Number(lat),
          lng: Number(lng),
        },
      },
      { new: true }
    ).lean();

    return res.json({
      ok: true,
      location: updated?.location || { lat: Number(lat), lng: Number(lng) },
    });
  } catch (e) {
    next(e);
  }
}

/**
 * GET /api/mechanics/nearby?lat=&lng=&radius=
 * Returns mechanics near a given point.
 * If none found (or none have location), returns ALL mechanics as fallback.
 */
export async function nearbyMechanics(req, res, next) {
  try {
    const latRaw = req.query.lat;
    const lngRaw = req.query.lng;
    const radiusKm = Number(req.query.radius || 50); // in km

    if (latRaw == null || lngRaw == null) {
      return res.status(400).json({ message: "Missing lat/lng" });
    }

    const lat = Number(latRaw);
    const lng = Number(lngRaw);

    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      return res.status(400).json({ message: "Invalid lat/lng" });
    }

    // ✅ IMPORTANT: explicitly select email/phone (+) in case your schema uses select:false
    const mechanics = await User.find({ role: "mechanic" })
      .select(
        "firstName lastName username garageName garageAddress address schedule location email phone phoneNumber mobile mobileNumber"
      )
      .select("+email +phone +phoneNumber +mobile +mobileNumber")
      .lean();

    console.log(
      "[nearbyMechanics] user at",
      lat,
      lng,
      "mechanic candidates:",
      mechanics.length
    );

    // First try: only mechanics with a saved location, inside radius
    let withDistance = mechanics
      .map((m) => {
        const loc = m.location || {};
        if (typeof loc.lat !== "number" || typeof loc.lng !== "number") {
          return null;
        }

        const distanceKm = haversineKm(lat, lng, loc.lat, loc.lng);
        if (distanceKm > radiusKm) return null;

        return {
          _id: m._id,
          firstName: m.firstName,
          lastName: m.lastName,
          username: m.username,
          garageName: m.garageName,
          address: m.garageAddress || m.address || "",
          schedule: m.schedule || null,

          // ✅ ADD CONTACT FIELDS
          email: m.email || "",
          phone: m.phone || m.phoneNumber || m.mobile || m.mobileNumber || "",

          distanceKm,
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.distanceKm - b.distanceKm);

    // Fallback: if nobody nearby (or no locations saved),
    // return ALL mechanics so the list is never completely empty.
    if (withDistance.length === 0) {
      console.log(
        "[nearbyMechanics] No mechanics within radius / with location. Returning all mechanics as fallback."
      );
      withDistance = mechanics.map((m) => ({
        _id: m._id,
        firstName: m.firstName,
        lastName: m.lastName,
        username: m.username,
        garageName: m.garageName,
        address: m.garageAddress || m.address || "",
        schedule: m.schedule || null,

        // ✅ ADD CONTACT FIELDS (fallback too)
        email: m.email || "",
        phone: m.phone || m.phoneNumber || m.mobile || m.mobileNumber || "",

        distanceKm: null, // unknown
      }));
    }

    res.json({ mechanics: withDistance });
  } catch (e) {
    next(e);
  }
}

/**
 * GET /api/mechanics/search?q=
 * Simple search by name / garage.
 */
export async function searchMechanics(req, res, next) {
  try {
    const q = (req.query.q || "").trim();
    const filter = { role: "mechanic" };

    if (q) {
      const regex = new RegExp(q, "i");
      filter.$or = [
        { firstName: regex },
        { lastName: regex },
        { username: regex },
        { garageName: regex },
      ];
    }

    // ✅ IMPORTANT: select email/phone (+)
    const list = await User.find(filter)
      .select(
        "firstName lastName username garageName garageAddress address schedule email phone phoneNumber mobile mobileNumber"
      )
      .select("+email +phone +phoneNumber +mobile +mobileNumber")
      .sort({ garageName: 1, firstName: 1 })
      .lean();

    const items = list.map((m) => ({
      _id: m._id,
      firstName: m.firstName,
      lastName: m.lastName,
      username: m.username,
      garageName: m.garageName,
      address: m.garageAddress || m.address || "",
      schedule: m.schedule || null,

      // ✅ ADD CONTACT FIELDS
      email: m.email || "",
      phone: m.phone || m.phoneNumber || m.mobile || m.mobileNumber || "",
    }));

    res.json({ mechanics: items });
  } catch (e) {
    next(e);
  }
}

// ---------- Integrity score helpers ----------

async function computeIntegrity(mechanicId) {
  const [feedbacks, records] = await Promise.all([
    Feedback.find({ mechanic: mechanicId }).lean(),
    ServiceRecord.find({ mechanic: mechanicId }).lean(),
  ]);

  const totalRatings = feedbacks.length;
  const avgRating =
    totalRatings === 0
      ? null
      : feedbacks.reduce((sum, f) => sum + (f.rating || 0), 0) / totalRatings;

  const totalRecords = records.length;
  const fairCount = records.filter((r) => r.fairFlag === "fair").length;
  const highCount = records.filter((r) => r.fairFlag === "high").length;
  const returnVisitCount = records.filter((r) => r.isReturnVisit).length;

  const fairPercent = totalRecords ? (fairCount / totalRecords) * 100 : 0;
  const highPercent = totalRecords ? (highCount / totalRecords) * 100 : 0;
  const returnVisitPercent = totalRecords
    ? (returnVisitCount / totalRecords) * 100
    : 0;

  // Integrity score formula (0–100)
  let score = 60;

  // rating contribution (0–25)
  if (avgRating != null) {
    score += (avgRating / 5) * 25;
  }

  // fair vs high pricing contribution (0–10)
  const fairScore = 10 * (1 - Math.min(highPercent / 50, 1));
  score += fairScore;

  // return-visit contribution (0–5)
  const rvScore = 5 * (1 - Math.min(returnVisitPercent / 40, 1));
  score += rvScore;

  if (score < 0) score = 0;
  if (score > 100) score = 100;

  return {
    mechanicId,
    avgRating,
    totalRatings,
    totalRecords,
    fairPercent: Math.round(fairPercent),
    highPercent: Math.round(highPercent),
    returnVisitPercent: Math.round(returnVisitPercent),
    integrityScore: Math.round(score),
  };
}

/**
 * GET /api/mechanics/integrity/:id
 * Returns integrity stats for a mechanic (for users).
 */
export async function getMechanicIntegrity(req, res, next) {
  try {
    const mechanicId = req.params.id;
    const mech = await User.findById(mechanicId).lean();
    if (!mech || mech.role !== "mechanic") {
      return res.status(404).json({ message: "Mechanic not found" });
    }

    const stats = await computeIntegrity(mechanicId);
    res.json(stats);
  } catch (e) {
    next(e);
  }
}

/**
 * GET /api/mechanics/integrity/me
 * Returns integrity stats for logged-in mechanic (for their dashboard).
 */
export async function getMyIntegrity(req, res, next) {
  try {
    if (!req.user || req.user.role !== "mechanic") {
      return res.status(403).json({ message: "Mechanic only" });
    }
    const stats = await computeIntegrity(req.user.id);
    res.json(stats);
  } catch (e) {
    next(e);
  }
}
