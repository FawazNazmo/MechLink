// server/src/jobs/reminders.job.js
import ServiceRecord from "../models/ServiceRecord.js";
import { sendEmail } from "../utils/sendEmail.js";
import AlertSetting from "../models/AlertSetting.js";
import User from "../models/User.js";

async function runOnce() {
  const now = new Date();

  // find due reminders: remindAt <= now AND not sent
  const due = await ServiceRecord.find({
    reminderSent: { $ne: true },
    remindAt: { $lte: now },
  })
    .limit(200)
    .populate("user", "firstName email");

  for (const rec of due) {
    try {
      const setting = await AlertSetting.findOne({ user: rec.user._id }).lean();
      const to = setting?.email || rec.user?.email;
      if (!to || setting?.emailReminders === false) {
        // skip if disabled or no email
        rec.reminderSent = true; // mark so we don't thrash
        await rec.save();
        continue;
      }

      await sendEmail(
        to,
        "MechLink: Upcoming service reminder",
        `Hello ${rec.user?.firstName || "there"},\n\nThis is a reminder that your next service "${rec.service}" is due on ${new Date(rec.nextServiceDate).toDateString()}.\n\n— MechLink`
      );

      rec.reminderSent = true;
      await rec.save();
    } catch (e) {
      console.warn("[reminders.job] send failed:", e.message);
    }
  }
}

// Start interval (every 30 minutes; adjust as you like)
export function startRemindersJob() {
  console.log("[reminders.job] starting scheduler (every 30 min)");
  setInterval(runOnce, 30 * 60 * 1000);
  // also run once on boot after short delay
  setTimeout(runOnce, 5 * 1000);
}
