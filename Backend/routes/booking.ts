// src/routes/bookings.ts
import express from "express";
import BookingController from "../controllers/bookingController";
import requireAuth from "../utils/authMiddleware"; // adjust path if your middleware is elsewhere

const router = express.Router();

// Booking creation requires verification; send-code + verify-code endpoints support that flow
router.post("/send-code", BookingController.sendVerificationCode);
router.post("/verify-code", BookingController.verifyVerificationCode);

router.post("/", BookingController.createBooking);
router.post("/student/view", BookingController.getStudentBookingsProtected);
router.get("/student/:email", BookingController.getStudentBookingsDeprecated);
router.get("/counselor", requireAuth, BookingController.getCounselorBookings);
router.get("/admin", requireAuth, BookingController.getAllBookingsAdmin);
router.patch("/:id/status", requireAuth, BookingController.patchBookingStatus);

router.post(
  "/:id/reschedule",
  requireAuth,
  BookingController.rescheduleBooking
);

// Export bookings as CSV
router.get("/export", requireAuth, BookingController.exportBookings);

export default router;
