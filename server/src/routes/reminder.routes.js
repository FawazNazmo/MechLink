// server/src/routes/reminder.routes.js
import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import {
  getMyReminders,
  saveMyReminders,
} from "../controllers/reminder.controller.js";

const router = Router();

router.get("/me", requireAuth, getMyReminders);
router.post("/me", requireAuth, saveMyReminders);

export default router;
