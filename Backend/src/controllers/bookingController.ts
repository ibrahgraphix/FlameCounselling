// src/controllers/bookingController.ts
import { Request, Response } from "express";
import bookingService from "../services/bookingService";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { JWT_SECRET as JWT_SECRET_FROM_UTIL } from "../utils/jwt";
import { getCounselorById } from "../repositories/counselorRepository";
import bookingRepository from "../repositories/bookingRepository";
import GoogleCalendarService from "../services/googleCalendarService";

dotenv.config();

const JWT_SECRET =
  JWT_SECRET_FROM_UTIL || process.env.JWT_SECRET || "supersecret";
const TOKEN_EXPIRY = process.env.STUDENT_TOKEN_EXPIRY || "3650d";

const normalizeStatus = (s: string) => {
  if (!s) return s;
  const st = s.toString().toLowerCase().trim();
  if (st === "cancelled" || st === "cancel") return "canceled";
  if (st === "confirmed" || st === "confirm") return "confirmed";
  if (st === "pending") return "pending";
  if (st === "complete" || st === "completed") return "completed";
  return st;
};

export const BookingController = {
  // Public: student books (guest)
  async createBooking(req: Request, res: Response) {
    try {
      const {
        student_name,
        student_email,
        counselor_id,
        booking_date,
        booking_time,
        year_level,
        additional_notes,
      } = req.body;

      if (!student_email || !counselor_id || !booking_date || !booking_time) {
        return res.status(400).json({
          error:
            "Missing required fields (student_email, counselor_id, booking_date, booking_time)",
        });
      }

      // persist booking
      const booking = await bookingService.createBooking({
        student_name: student_name ?? null,
        student_email: String(student_email),
        counselor_id: Number(counselor_id),
        booking_date: String(booking_date),
        booking_time: String(booking_time),
        year_level: year_level ?? null,
        additional_notes: additional_notes ?? null,
      });

      // Issue long lived token for student's email (guest flow)
      const accessToken = jwt.sign(
        { email: String(student_email) },
        JWT_SECRET,
        {
          expiresIn: TOKEN_EXPIRY,
        }
      );

      // Try to get counselor info
      let counselor = null;
      try {
        counselor = await getCounselorById(Number(counselor_id));
      } catch (err) {
        console.warn("Could not lookup counselor:", err);
        counselor = null;
      }

      const responseBody: any = {
        success: true,
        booking,
        access_token: accessToken,
        googleCalendarEvent: null,
        googleCalendarError: null,
        counselor: counselor ?? null,
      };

      return res.status(201).json(responseBody);
    } catch (err: any) {
      console.error("createBooking error:", err);
      return res
        .status(500)
        .json({ success: false, error: err.message || "Server error" });
    }
  },

  // Protected student view (POST with token)
  async getStudentBookingsProtected(req: Request, res: Response) {
    try {
      const { student_email, access_token } = req.body;
      if (!student_email)
        return res.status(400).json({ error: "student_email required" });
      if (!access_token)
        return res.status(401).json({ error: "access_token required" });

      let decoded: any = null;
      try {
        decoded = jwt.verify(access_token, JWT_SECRET) as any;
      } catch (err) {
        return res
          .status(403)
          .json({ error: "Invalid or expired access token" });
      }

      if (!decoded || decoded.email !== String(student_email)) {
        return res
          .status(403)
          .json({ error: "Token does not match provided email" });
      }

      const bookings = await bookingService.getBookingsByStudentEmail(
        String(student_email)
      );
      return res.json({ success: true, bookings });
    } catch (err: any) {
      console.error("getStudentBookingsProtected error:", err);
      return res.status(500).json({ success: false, error: "Server error" });
    }
  },

  // Deprecated direct GET (reject)
  async getStudentBookingsDeprecated(_req: Request, res: Response) {
    return res.status(400).json({
      error:
        "Unprotected student lookups are disabled. Use POST /api/bookings/student/view with { student_email, access_token }.",
    });
  },

  // Counselor view: Return bookings for logged-in counselor only
  async getCounselorBookings(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      if (!user) return res.status(401).json({ error: "Unauthorized" });

      const counselorId = Number(
        user.counselor_id ?? user.id ?? user.counselorId ?? user.user_id
      );
      if (!counselorId) return res.status(401).json({ error: "Unauthorized" });

      const bookings = await bookingService.getBookingsByCounselorId(
        counselorId
      );
      return res.json({ success: true, bookings });
    } catch (err: any) {
      console.error("getCounselorBookings error:", err);
      return res.status(500).json({ success: false, error: "Server error" });
    }
  },

  // Admin: Return all bookings
  async getAllBookingsAdmin(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      if (!user || String(user.role).toLowerCase() !== "admin") {
        return res.status(403).json({ error: "Forbidden" });
      }
      const bookings = await bookingService.getAllBookings();
      return res.json({ success: true, bookings });
    } catch (err: any) {
      console.error("getAllBookingsAdmin error:", err);
      return res.status(500).json({ success: false, error: "Server error" });
    }
  },

  // PATCH /api/bookings/:id/status - Admins or owning counselor or owning student (cancel)
  async patchBookingStatus(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      if (!user) return res.status(401).json({ error: "Unauthorized" });

      const bookingId = req.params.id;
      const { status } = req.body;
      if (!status) return res.status(400).json({ error: "status required" });

      const normalized = normalizeStatus(status);

      // Admins can change any booking
      if (String(user.role).toLowerCase() === "admin") {
        const updated = await bookingService.updateBookingStatus(
          bookingId,
          normalized
        );

        if (!updated) {
          return res
            .status(404)
            .json({ success: false, error: "Booking not found" });
        }

        // Previously we would delete a Google event here. The google service is removed;
        // if you reintroduce it restore that behavior.
        return res.json({ success: true, booking: updated });
      }

      // Student owner: allow cancelling their own booking only
      const userEmail = (user.email ?? "").toString();
      if (userEmail) {
        try {
          const studentBookings =
            await bookingService.getBookingsByStudentEmail(userEmail);
          const owned = (studentBookings || []).find(
            (b: any) => String(b.booking_id) === String(bookingId)
          );
          if (owned) {
            if (normalized === "canceled") {
              const updated = await bookingService.updateBookingStatus(
                bookingId,
                normalized
              );

              if (!updated) {
                return res
                  .status(404)
                  .json({ success: false, error: "Booking not found" });
              }

              // Previously would delete Google event here; omitted.
              return res.json({ success: true, booking: updated });
            } else {
              return res
                .status(403)
                .json({ error: "Students may only cancel their bookings" });
            }
          }
        } catch (err) {
          console.error(
            "Error while checking student ownership in patchBookingStatus:",
            err
          );
        }
      }

      // Counselors: verify the booking belongs to them
      const counselorId = Number(
        user.counselor_id ?? user.id ?? user.counselorId ?? user.user_id
      );
      if (!counselorId) return res.status(403).json({ error: "Forbidden" });

      const myBookings = await bookingService.getBookingsByCounselorId(
        counselorId
      );
      const found = myBookings.find(
        (b: any) => String(b.booking_id) === String(bookingId)
      );
      if (!found) return res.status(403).json({ error: "Forbidden" });

      const updated = await bookingService.updateBookingStatus(
        bookingId,
        normalized
      );

      if (!updated) {
        return res
          .status(404)
          .json({ success: false, error: "Booking not found" });
      }

      // Previously would trigger Google event deletion if canceled.
      return res.json({ success: true, booking: updated });
    } catch (err: any) {
      console.error("patchBookingStatus error:", err);
      const msg =
        err?.message && typeof err.message === "string"
          ? err.message
          : "Server error";
      return res.status(500).json({ success: false, error: msg });
    }
  },

  // POST /api/bookings/:id/reschedule - Admin or owning counselor only
  async rescheduleBooking(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      if (!user) return res.status(401).json({ error: "Unauthorized" });

      const bookingId = req.params.id;
      const { booking_date, booking_time } = req.body;
      if (!booking_date || !booking_time)
        return res
          .status(400)
          .json({ error: "booking_date and booking_time required" });

      // Admins can change any booking
      if (String(user.role).toLowerCase() === "admin") {
        // Attempt to reschedule event on Google, but do not block DB update if Google fails.
        let googleResult: any = null;
        try {
          // Try to load booking row if repository supports getBookingById
          let bookingRow = null;
          if (typeof (bookingRepository as any).getBookingById === "function") {
            bookingRow = await (bookingRepository as any).getBookingById(
              bookingId
            );
          }
          const gRes = await GoogleCalendarService.rescheduleEventForBooking(
            bookingRow ?? bookingId,
            booking_date,
            booking_time,
            // try to infer duration from bookingRow if available
            bookingRow?.duration ?? 60
          );
          googleResult = gRes;
        } catch (err) {
          console.warn("Google reschedule attempt failed (admin path):", err);
          googleResult = { success: false, error: String(err) };
        }

        // Proceed to update DB
        const updated = await bookingService.rescheduleBooking(
          bookingId,
          booking_date,
          booking_time
        );

        return res.json({
          success: true,
          booking: updated,
          googleResult,
        });
      }

      // For counselors, verify ownership
      const counselorId = Number(
        user.counselor_id ?? user.id ?? user.counselorId ?? user.user_id
      );
      if (!counselorId) return res.status(403).json({ error: "Forbidden" });

      const myBookings = await bookingService.getBookingsByCounselorId(
        counselorId
      );
      const found = myBookings.find(
        (b: any) => String(b.booking_id) === String(bookingId)
      );
      if (!found) return res.status(403).json({ error: "Forbidden" });

      // Attempt Google reschedule for counselor-owned booking
      let googleResultCounselor: any = null;
      try {
        // pass booking row (found) to Google service to improve matching
        const gRes = await GoogleCalendarService.rescheduleEventForBooking(
          found,
          booking_date,
          booking_time,
          found?.duration ?? 60
        );
        googleResultCounselor = gRes;
      } catch (err) {
        console.warn("Google reschedule attempt failed (counselor path):", err);
        googleResultCounselor = { success: false, error: String(err) };
      }

      const updated = await bookingService.rescheduleBooking(
        bookingId,
        booking_date,
        booking_time
      );

      return res.json({
        success: true,
        booking: updated,
        googleResult: googleResultCounselor,
      });
    } catch (err: any) {
      console.error("rescheduleBooking error:", err);
      return res
        .status(500)
        .json({ success: false, error: err.message || "Server error" });
    }
  },

  // GET /api/bookings/export - Admin (all) or counselor (their bookings)
  async exportBookings(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      if (!user) return res.status(401).json({ error: "Unauthorized" });

      const role = String(user.role).toLowerCase();
      let rows: any[] = [];

      if (role === "admin") {
        rows = await bookingService.getAllBookings();
      } else {
        const counselorId = Number(
          user.counselor_id ?? user.id ?? user.counselorId ?? user.user_id
        );
        if (!counselorId) return res.status(403).json({ error: "Forbidden" });
        rows = await bookingService.getBookingsByCounselorId(counselorId);
      }

      const headers = [
        "booking_id",
        "student_name",
        "student_email",
        "counselor_id",
        "counselor_name",
        "booking_date",
        "booking_time",
        "year_level",
        "status",
        "created_at",
        "updated_at",
      ];

      const csvRows = [headers.join(",")];
      for (const r of rows) {
        const line = [
          r.booking_id ?? "",
          (r.student_name ?? r.userName ?? "").replace(/"/g, '""'),
          (r.student_email ?? "").replace(/"/g, '""'),
          r.counselor_id ?? "",
          (r.counselor_name ?? r.therapistName ?? "").replace(/"/g, '""'),
          r.booking_date ?? "",
          r.booking_time ?? "",
          r.year_level ?? "",
          r.status ?? "",
          r.created_at ?? "",
          r.updated_at ?? "",
        ]
          .map((c) => `"${String(c).replace(/"/g, '""')}"`)
          .join(",");
        csvRows.push(line);
      }

      const csv = csvRows.join("\n");
      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="bookings_export_${new Date()
          .toISOString()
          .slice(0, 10)}.csv"`
      );
      res.status(200).send(csv);
    } catch (err: any) {
      console.error("exportBookings error:", err);
      return res.status(500).json({ success: false, error: "Server error" });
    }
  },
};

export default BookingController;
