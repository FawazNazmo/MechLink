// server/src/routes/mechanics.routes.js
import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import {
  nearbyMechanics,
  searchMechanics,
  saveSchedule,
  saveLocation,
  getMechanicIntegrity,
  getMyIntegrity,
} from "../controllers/mechanics.controller.js";

const router = Router();

router.get("/nearby", requireAuth, nearbyMechanics);
router.get("/search", requireAuth, searchMechanics);
router.post("/schedule", requireAuth, saveSchedule);
router.post("/location", requireAuth, saveLocation);

// Integrity score APIs
router.get("/integrity/me", requireAuth, getMyIntegrity);
router.get("/integrity/:id", requireAuth, getMechanicIntegrity);

export default router;
