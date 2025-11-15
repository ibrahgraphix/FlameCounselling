// src/routes/bookings.ts
import express from "express";
import BookingController from "../controllers/bookingController";
import requireAuth from "../utils/authMiddleware"; // adjust path if your middleware is elsewhere

const router = express.Router();

// Public route - student (guest) creates booking
router.post("/", BookingController.createBooking);

// Protected student view (POST) - must provide { student_email, access_token }
router.post("/student/view", BookingController.getStudentBookingsProtected);

// Deprecated: direct unprotected student GET (blocked)
router.get("/student/:email", BookingController.getStudentBookingsDeprecated);

// Counselor: only returns bookings for the logged-in counselor
router.get("/counselor", requireAuth, BookingController.getCounselorBookings);

// Admin: requires role=admin in token
router.get("/admin", requireAuth, BookingController.getAllBookingsAdmin);

// Update booking status (admin or assigned counselor)
router.patch("/:id/status", requireAuth, BookingController.patchBookingStatus);

// Reschedule booking (admin or assigned counselor)
router.post(
  "/:id/reschedule",
  requireAuth,
  BookingController.rescheduleBooking
);

// Export bookings as CSV
router.get("/export", requireAuth, BookingController.exportBookings);

export default router;
