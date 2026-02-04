// server/src/controllers/token.controller.js
import BreakdownToken from "../models/BreakdownToken.js";
import { sendEmail } from "../utils/sendEmail.js";

/**
 * IMPORTANT:
 * This aggregation uses $lookup from "users".
 * If your MongoDB users collection name is different, change `from: "users"` below.
 */

// Helpers
function toLatLng(point) {
  if (!point?.coordinates || point.coordinates.length < 2) return null;
  return { lat: point.coordinates[1], lng: point.coordinates[0] };
}

/**
 * POST /api/tokens/raise   (user)
 * body: { lat, lng, note }
 */
export async function raiseToken(req, res, next) {
  try {
    const { lat, lng, note } = req.body || {};
    if (lat == null || lng == null) {
      return res.status(400).json({ message: "Missing lat/lng" });
    }

    const token = await BreakdownToken.create({
      user: req.user.id,
      location: {
        type: "Point",
        coordinates: [Number(lng), Number(lat)],
      },
      status: "open",
      note: note || "",
    });

    const out = {
      _id: token._id,
      status: token.status,
      location: { lat: Number(lat), lng: Number(lng) },
      note: token.note,
      createdAt: token.createdAt,
      mechanic: null,
      user: null, // keep shape consistent
    };

    res.status(201).json({ token: out });
  } catch (e) {
    next(e);
  }
}

/**
 * GET /api/tokens/nearby?lat=&lng=&radius=
 * For mechanics – returns nearby open tokens with distance, ETA, priority.
 * ✅ FIX: Includes user details (name/email/phone/carDetails) using $lookup.
 */
export async function nearbyTokens(req, res, next) {
  try {
    if (!req.user || req.user.role !== "mechanic") {
      return res.status(403).json({ message: "Mechanic only" });
    }

    const { lat, lng, radius } = req.query;
    if (lat == null || lng == null) {
      return res.status(400).json({ message: "Missing lat/lng" });
    }

    const center = [Number(lng), Number(lat)];
    const maxDistanceMeters = radius ? Number(radius) : 5000; // default 5km

    const docs = await BreakdownToken.aggregate([
      {
        $geoNear: {
          near: { type: "Point", coordinates: center },
          distanceField: "distMeters",
          spherical: true,
          maxDistance: maxDistanceMeters,
        },
      },
      { $match: { status: "open" } },
      { $sort: { distMeters: 1 } },
      { $limit: 50 },

      // ✅ bring user details
      {
        $lookup: {
          from: "users", // <-- change if your collection name is different
          localField: "user",
          foreignField: "_id",
          as: "userObj",
        },
      },
      { $unwind: { path: "$userObj", preserveNullAndEmptyArrays: true } },

      // ✅ optional: bring mechanic details (if ever needed later)
      {
        $lookup: {
          from: "users",
          localField: "mechanic",
          foreignField: "_id",
          as: "mechObj",
        },
      },
      { $unwind: { path: "$mechObj", preserveNullAndEmptyArrays: true } },

      {
        $project: {
          _id: 1,
          status: 1,
          note: 1,
          createdAt: 1,
          distMeters: 1,
          location: 1,
          priorityLevel: 1,
          etaMinutes: 1,

          // ✅ user details for mechanic dashboard
          user: {
            _id: "$userObj._id",
            username: "$userObj.username",
            firstName: "$userObj.firstName",
            lastName: "$userObj.lastName",
            carDetails: "$userObj.carDetails",
            email: "$userObj.email",
            phone: "$userObj.phone",
            phoneNumber: "$userObj.phoneNumber",
            mobile: "$userObj.mobile",
            mobileNumber: "$userObj.mobileNumber",
          },

          // keep mechanic if present (not required for open tokens but harmless)
          mechanic: {
            _id: "$mechObj._id",
            username: "$mechObj.username",
            firstName: "$mechObj.firstName",
            lastName: "$mechObj.lastName",
          },
        },
      },
    ]);

    const now = new Date();

    const items = docs.map((d) => {
      const distanceKm = (d.distMeters || 0) / 1000;
      const ageMinutes = (now - new Date(d.createdAt)) / 60000;

      // Simple ETA: assume 30 km/h → 0.5 km per minute
      const etaMinutes = Math.round(distanceKm / 0.5);

      let priorityLevel = "Medium";
      if (distanceKm <= 3 && ageMinutes <= 30) priorityLevel = "High";
      else if (distanceKm > 10 || ageMinutes > 90) priorityLevel = "Low";

      return {
        id: d._id,
        _id: d._id,
        status: d.status,
        note: d.note,
        location: toLatLng(d.location),
        distanceKm,
        etaMinutes,
        priorityLevel,
        createdAt: d.createdAt,

        // ✅ FULL user object (now MechanicHome can show it)
        user: d.user || null,

        mechanic: d.mechanic || null,
      };
    });

    res.json({ tokens: items });
  } catch (e) {
    next(e);
  }
}

/**
 * GET /api/tokens/assigned   (mechanic)
 * ✅ FIX: populate user contact details for mechanic dashboard
 */
export async function assignedTokens(req, res, next) {
  try {
    if (!req.user || req.user.role !== "mechanic") {
      return res.status(403).json({ message: "Mechanic only" });
    }

    const list = await BreakdownToken.find({
      mechanic: req.user.id,
    })
      .sort({ createdAt: -1 })
      .populate(
        "user",
        "username firstName lastName carDetails email phone phoneNumber mobile mobileNumber"
      );

    const items = list.map((t) => ({
      _id: t._id,
      status: t.status,
      user: t.user || null,
      location: toLatLng(t.location),
      createdAt: t.createdAt,
    }));

    res.json({ tokens: items });
  } catch (e) {
    next(e);
  }
}

/**
 * POST /api/tokens/:id/accept   (mechanic)
 * ✅ Improved: atomic accept (prevents “already taken” race)
 * → sends email to user
 */
export async function acceptToken(req, res, next) {
  try {
    if (!req.user || req.user.role !== "mechanic") {
      return res.status(403).json({ message: "Mechanic only" });
    }

    const updated = await BreakdownToken.findOneAndUpdate(
      { _id: req.params.id, status: "open" },
      { $set: { mechanic: req.user.id, status: "accepted" } },
      { new: true }
    ).populate("user", "email username firstName lastName carDetails");

    if (!updated) {
      return res.status(409).json({ message: "Failed to accept (maybe already taken)." });
    }

    // --------- Send email to the user ----------
    if (updated.user && updated.user.email) {
      const name = updated.user.firstName || updated.user.username || "there";

      await sendEmail(
        updated.user.email,
        "MechLink – Mechanic accepted your breakdown request",
        `Hi ${name},\n\n` +
          `A mechanic has accepted your breakdown request and is on the way.\n\n` +
          `If your situation becomes unsafe, please contact emergency services.\n\n` +
          `MechLink`
      );
    }

    res.json({ token: updated });
  } catch (e) {
    next(e);
  }
}

/**
 * POST /api/tokens/:id/resolve   (mechanic)
 */
export async function resolveToken(req, res, next) {
  try {
    if (!req.user || req.user.role !== "mechanic") {
      return res.status(403).json({ message: "Mechanic only" });
    }

    const token = await BreakdownToken.findById(req.params.id);
    if (!token) return res.status(404).json({ message: "Not found" });

    if (String(token.mechanic) !== String(req.user.id)) {
      return res.status(403).json({ message: "Not your token" });
    }

    token.status = "resolved";
    await token.save();

    res.json({ token });
  } catch (e) {
    next(e);
  }
}

/**
 * POST /api/tokens/:id/reject   (mechanic)
 * Mechanic not available; closes it.
 */
export async function rejectToken(req, res, next) {
  try {
    if (!req.user || req.user.role !== "mechanic") {
      return res.status(403).json({ message: "Mechanic only" });
    }

    const token = await BreakdownToken.findById(req.params.id);
    if (!token) return res.status(404).json({ message: "Not found" });

    if (token.status !== "open") {
      return res.status(400).json({ message: "Token already handled." });
    }

    token.status = "rejected";
    token.mechanic = req.user.id;
    await token.save();

    res.json({ token });
  } catch (e) {
    next(e);
  }
}

/**
 * GET /api/tokens/my-latest   (user)
 */
export async function myLatestToken(req, res, next) {
  try {
    const token = await BreakdownToken.findOne({ user: req.user.id })
      .sort({ createdAt: -1 })
      .populate("mechanic", "firstName lastName username");

    if (!token) return res.json({ token: null });

    const out = {
      _id: token._id,
      status: token.status,
      mechanic: token.mechanic,
      location: toLatLng(token.location),
      note: token.note,
      createdAt: token.createdAt,
    };

    res.json({ token: out });
  } catch (e) {
    next(e);
  }
}
