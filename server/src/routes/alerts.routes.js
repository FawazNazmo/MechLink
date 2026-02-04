// server/src/routes/alerts.routes.js
import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { saveSettings } from "../controllers/alerts.controller.js";
import { sendEmail } from "../utils/sendEmail.js";

const router = Router();

// Save user settings
router.post("/settings", requireAuth, saveSettings);

// TEMP: test email (remove later)
router.post("/test", requireAuth, async (req, res, next) => {
  try {
    const to = req.body.to || process.env.SMTP_USER;
    await sendEmail(to, "MechLink test", "Test email from MechLink ✅");
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

export default router;
