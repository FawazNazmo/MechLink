// server/src/routes/token.routes.js
import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import {
  raiseToken,
  nearbyTokens,
  assignedTokens,
  acceptToken,
  resolveToken,
  rejectToken,
  myLatestToken,
} from "../controllers/token.controller.js";

const router = Router();

router.post("/raise", requireAuth, raiseToken);
router.get("/nearby", requireAuth, nearbyTokens);
router.get("/assigned", requireAuth, assignedTokens);
router.post("/:id/accept", requireAuth, acceptToken);
router.post("/:id/resolve", requireAuth, resolveToken);
router.post("/:id/reject", requireAuth, rejectToken);
router.get("/my-latest", requireAuth, myLatestToken);

export default router;
