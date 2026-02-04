import AlertSetting from "../models/AlertSetting.js";
import { sendEmail } from "../utils/sendEmail.js";

/**
 * GET /api/alerts/settings
 */
export async function getSettings(req, res, next) {
  try {
    const s = await AlertSetting.findOne({ user: req.user.id }).lean();
    res.json({
      settings: s
        ? { email: s.email || "", emailReminders: !!s.emailReminders }
        : { email: "", emailReminders: false },
    });
  } catch (e) {
    next(e);
  }
}

/**
 * POST /api/alerts/settings
 * body: { email, emailReminders }
 */
export async function saveSettings(req, res, next) {
  try {
    const { email, emailReminders } = req.body || {};
    if (typeof email !== "string")
      return res.status(400).json({ message: "Invalid email" });

    const doc = await AlertSetting.findOneAndUpdate(
      { user: req.user.id },
      {
        $set: {
          email: email.trim(),
          emailReminders: !!emailReminders,
        },
      },
      { new: true, upsert: true }
    ).lean();

    res.json({
      settings: {
        email: doc.email || "",
        emailReminders: !!doc.emailReminders,
      },
    });
  } catch (e) {
    next(e);
  }
}

/**
 * POST /api/alerts/test
 * Sends a quick test email to the saved address
 */
export async function testEmail(req, res, next) {
  try {
    const s = await AlertSetting.findOne({ user: req.user.id }).lean();
    const to = s?.email;
    if (!to) return res.status(400).json({ message: "No email on file" });

    await sendEmail(
      to,
      "MechLink: Test notification",
      "This is a test email from MechLink alert settings. Notifications are working ✅"
    );

    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
}
