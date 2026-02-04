// server/src/routes/vehicle.routes.js
import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import {
  getMyVehicles,
  getVehicleHealth,
  updateCompliance,
  getCompliance,
} from "../controllers/vehicle.controller.js";

const router = Router();

router.get("/my", requireAuth, getMyVehicles);
router.get("/:id/health", requireAuth, getVehicleHealth);
router.get("/:id/compliance", requireAuth, getCompliance);
router.put("/:id/compliance", requireAuth, updateCompliance);

export default router;
