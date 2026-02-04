// server/src/routes/triage.routes.js
import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { triageIssue } from "../controllers/triage.controller.js";

const router = Router();

router.post("/", requireAuth, triageIssue);

export default router;
