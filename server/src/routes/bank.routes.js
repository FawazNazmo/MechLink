// server/src/routes/bank.routes.js
import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import {
  getMyBank,
  createMyBank,
  getMechanicBank,
} from "../controllers/bank.controller.js";

const router = Router();

router.get("/me", requireAuth, getMyBank);
router.post("/me", requireAuth, createMyBank);

// user sees mechanic’s bank to pay £10 deposit
router.get("/mechanic/:id", requireAuth, getMechanicBank);

export default router;
