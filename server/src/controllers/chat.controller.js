// server/src/controllers/chat.controller.js
import ChatMessage from "../models/ChatMessage.js";

/**
 * Helper: work out which id is 'user' and which is 'mechanic'
 * based on the logged-in user and the :id in the route.
 */
function resolvePair(req, otherId) {
  const myId = req.user.id;

  if (req.user.role === "user") {
    // logged-in user is the car owner, :id is mechanic
    return { user: myId, mechanic: otherId };
  }

  if (req.user.role === "mechanic") {
    // logged-in user is mechanic, :id is car owner
    return { user: otherId, mechanic: myId };
  }

  const err = new Error("Only car owners and mechanics can use chat.");
  err.statusCode = 403; // ✅ FIXED (your server uses statusCode)
  throw err;
}

/**
 * GET /api/chat
 * List conversations for the logged-in user/mechanic (for “Messages” list).
 */
export async function listConversations(req, res, next) {
  try {
    const myId = req.user.id;
    const role = req.user.role;

    if (role !== "user" && role !== "mechanic") {
      return res
        .status(403)
        .json({ message: "Only car owners and mechanics can use chat." });
    }

    const filter = role === "mechanic" ? { mechanic: myId } : { user: myId };

    const messages = await ChatMessage.find(filter)
      .sort({ createdAt: -1 })
      .limit(200)
      .populate(
        role === "mechanic" ? "user" : "mechanic",
        "firstName lastName username garageName"
      )
      .lean();

    const map = new Map();

    for (const m of messages) {
      const other = role === "mechanic" ? m.user : m.mechanic;
      if (!other) continue;

      const key = String(other._id);
      if (!map.has(key)) {
        const name =
          (other.firstName || other.lastName
            ? `${other.firstName || ""} ${other.lastName || ""}`.trim()
            : null) ||
          other.garageName ||
          other.username ||
          (role === "mechanic" ? "User" : "Mechanic");

        map.set(key, {
          otherId: other._id,
          name,
          lastText: m.text,
          lastAt: m.createdAt,
        });
      }
    }

    res.json({ conversations: Array.from(map.values()) });
  } catch (e) {
    next(e);
  }
}

/**
 * GET /api/chat/:id
 * Get all messages between logged-in user and the other party.
 * :id is mechanicId if role=user; userId if role=mechanic.
 */
export async function getMessages(req, res, next) {
  try {
    const otherId = req.params.id;
    const { user, mechanic } = resolvePair(req, otherId);

    const messages = await ChatMessage.find({ user, mechanic })
      .sort({ createdAt: 1 })
      .lean();

    res.json({ messages });
  } catch (e) {
    next(e);
  }
}

/**
 * POST /api/chat/:id
 * Body: { text }
 * Send a new message.
 */
export async function sendMessage(req, res, next) {
  try {
    const otherId = req.params.id;
    const { text } = req.body || {};

    if (!text || !text.trim()) {
      return res.status(400).json({ message: "Message text is required" });
    }

    const { user, mechanic } = resolvePair(req, otherId);

    const msg = await ChatMessage.create({
      user,
      mechanic,
      from: req.user.id,
      text: text.trim(),
    });

    res.status(201).json({ message: msg });
  } catch (e) {
    next(e);
  }
}
