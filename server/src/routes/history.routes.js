// server/src/routes/history.routes.js
import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import {
  getHistory,
  getMechanicHistory,
} from "../controllers/history.controller.js";

const router = Router();

// user history + alerts + risk
router.get("/", requireAuth, getHistory);

// mechanic history for analytics
router.get("/mechanic", requireAuth, getMechanicHistory);

export default router;
