// server/src/routes/payments.routes.js
import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import {
  paymentsHealth,
  createDepositIntent,
  recordPayment,
} from "../controllers/payments.controller.js";

const r = Router();

r.get("/health", paymentsHealth);
r.post("/create-deposit", requireAuth, createDepositIntent);
r.post("/record", requireAuth, recordPayment);

export default r;
