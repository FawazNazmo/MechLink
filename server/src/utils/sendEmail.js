// server/src/utils/sendEmail.js
import nodemailer from "nodemailer";

let transporter = null;

/**
 * Build a nodemailer transport from env.
 * Supports:
 *  - STARTTLS on 587 (secure: false)
 *  - SMTPS on 465 (secure: true)
 */
function buildTransportFromEnv() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    console.warn(
      "[email] Missing SMTP_HOST/SMTP_USER/SMTP_PASS in env; emails will be NO-OP (logged to console only)."
    );
    return null; // we'll fallback to console
  }

  const secure = port === 465; // 465 = SSL/TLS; 587 = STARTTLS
  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });
}

/**
 * Verify at startup. Non-fatal if SKIP_SMTP_VERIFY=1 or env is incomplete.
 */
export async function verifyEmailTransport() {
  const skip = process.env.SKIP_SMTP_VERIFY === "1";
  transporter = buildTransportFromEnv();

  if (!transporter) {
    console.warn("[email] Transport not configured. Using console fallback.");
    return;
  }

  if (skip) {
    console.log("[email] SKIP_SMTP_VERIFY=1 set. Skipping transport.verify().");
    return;
  }

  try {
    await transporter.verify();
    console.log("[email] SMTP verify OK");
  } catch (e) {
    console.error("[email] SMTP verify FAILED:", e.message);
    // Keep running; we will still try to send (and log) later
  }
}

/**
 * Send an email. If transport is not configured, just log to console (dev fallback).
 */
export async function sendEmail(to, subject, text, html) {
  const from = process.env.SMTP_FROM || "MechLink <noreply@mechlink.dev>";

  if (!transporter) {
    console.log(
      `[email:DEV-FALLBACK]\nTO: ${to}\nSUBJECT: ${subject}\nTEXT:\n${text || ""}\nHTML:\n${html || ""}`
    );
    return { devFallback: true };
  }

  try {
    const info = await transporter.sendMail({ from, to, subject, text, html });
    console.log("[email] sent:", info.messageId || "(no id)");
    return { ok: true, id: info.messageId };
  } catch (e) {
    console.error("[email] send failed:", e.message);
    // Don’t crash the app
    return { ok: false, error: e.message };
  }
}
