// server/src/routes/feedback.routes.js
import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import {
  createFeedback,
  listByMechanic,
  myFeedbackSummary,
  pendingFeedback,
  mechanicSummary,   // <-- added
} from "../controllers/feedback.controller.js";

const router = Router();

router.post("/", requireAuth, createFeedback);
router.get("/mechanic/:id", requireAuth, listByMechanic);
router.get("/my-summary", requireAuth, myFeedbackSummary);
router.get("/pending", requireAuth, pendingFeedback);

// NEW: public summary for a given mechanic (avg stars + count)
router.get("/summary/:id", requireAuth, mechanicSummary);

export default router;
