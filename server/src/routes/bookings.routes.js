// server/src/routes/bookings.routes.js
import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import {
  createBooking,
  myBookings,
  assignedBookings,
  acceptBooking,
  completeBooking,
  checkBookingSlot,
  cancelBookingByMechanic,
  cancelBookingByUser,
  markNoShowUser,
} from "../controllers/booking.controller.js";

const router = Router();

// Check a slot before booking
router.post("/check", requireAuth, checkBookingSlot);

// User creates a booking with a mechanic
router.post("/", requireAuth, createBooking);

// User views their own bookings
router.get("/me", requireAuth, myBookings);

// Mechanic views bookings assigned to them
router.get("/assigned", requireAuth, assignedBookings);

// Mechanic accepts a booking
router.post("/:id/accept", requireAuth, acceptBooking);

// Mechanic completes a booking
router.post("/:id/complete", requireAuth, completeBooking);

// Mechanic cancels a booking → refund email
router.post("/:id/cancel", requireAuth, cancelBookingByMechanic);

// User cancels their own booking
router.post("/:id/cancel-user", requireAuth, cancelBookingByUser);

// Mechanic marks user as no-show
router.post("/:id/no-show", requireAuth, markNoShowUser);

export default router;
