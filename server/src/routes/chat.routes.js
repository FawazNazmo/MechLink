// server/src/routes/chat.routes.js
import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import {
  listConversations,
  getMessages,
  sendMessage,
} from "../controllers/chat.controller.js";

const router = Router();

// List conversations for current user/mechanic
router.get("/", requireAuth, listConversations);

// Messages with a specific other person
router.get("/:id", requireAuth, getMessages);
router.post("/:id", requireAuth, sendMessage);

export default router;
