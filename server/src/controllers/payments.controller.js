// server/src/controllers/payments.controller.js
import Stripe from "stripe";
import Payment from "../models/Payment.js";

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY || process.env.STRIPE_TEST_KEY;
  if (!key) return null;
  return new Stripe(key);
}

export async function paymentsHealth(_req, res) {
  const configured = Boolean(process.env.STRIPE_SECRET_KEY || process.env.STRIPE_TEST_KEY);
  res.json({ ok: true, stripeConfigured: configured });
}

// POST /api/payments/create-deposit
export async function createDepositIntent(req, res, next) {
  const stripe = getStripe();
  try {
    const amountPence = Number(req.body?.amountPence ?? 1000); // £10 default
    const currency = (req.body?.currency || "gbp").toLowerCase();

    if (!stripe) {
      return res
        .status(503)
        .json({ message: "Stripe not configured (.env STRIPE_SECRET_KEY missing on server)" });
    }

    const intent = await stripe.paymentIntents.create({
      amount: amountPence,
      currency,
      automatic_payment_methods: { enabled: true },
      metadata: {
        type: "deposit",
        bookingId: req.body?.bookingId || "",
        userId: req.user?.id || "",
        mechanicId: req.body?.mechanicId || "",
      },
    });

    res.json({ clientSecret: intent.client_secret });
  } catch (err) {
    next(err);
  }
}

// POST /api/payments/record
export async function recordPayment(req, res, next) {
  try {
    const { bookingId, mechanicId, amountPence, status, paymentIntentId } = req.body || {};
    if (!amountPence || !paymentIntentId) {
      return res.status(400).json({ message: "Missing fields" });
    }

    const p = await Payment.create({
      user: req.user?.id || null,
      mechanic: mechanicId || undefined,
      booking: bookingId || undefined,
      amount: Number(amountPence),
      currency: "gbp",
      kind: "deposit",
      status: status || "succeeded",
      provider: "stripe",
      providerId: paymentIntentId,
    });

    res.status(201).json({ payment: p });
  } catch (err) {
    next(err);
  }
}
