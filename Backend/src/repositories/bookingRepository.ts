// src/repositories/bookingRepository.ts
import pool from "../config/db";
import { BookingRow } from "../models/Booking";

export const bookingRepository = {
  async createBooking(
    studentId: number | null,
    counselorId: number,
    bookingDate: string,
    bookingTime: string,
    yearLevel?: string | null,
    additionalNotes?: string | null,
    client?: any
  ): Promise<BookingRow> {
    const q = `INSERT INTO bookings
       (student_id, counselor_id, booking_date, booking_time, year_level, additional_notes, status, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,'pending', NOW(), NOW())
       RETURNING booking_id, student_id, counselor_id, booking_date, booking_time, year_level, additional_notes, status, created_at, updated_at`;
    const params = [
      // allow null for guest bookings
      studentId,
      counselorId,
      bookingDate,
      bookingTime,
      yearLevel ?? null,
      additionalNotes ?? null,
    ];
    const res = client
      ? await client.query(q, params)
      : await pool.query(q, params);
    return res.rows[0];
  },

  async getBookingsByStudentEmail(email: string): Promise<any[]> {
    const res = await pool.query(
      `SELECT b.booking_id, b.student_id, b.counselor_id, b.booking_date, b.booking_time,
              b.year_level, b.additional_notes, b.status, b.created_at, b.updated_at,
              c.counselor_id AS c_counselor_id, c.name as counselor_name, c.email as counselor_email,
              s.student_id AS s_student_id, s.name AS student_name, s.email AS student_email
       FROM bookings b
       JOIN students s ON b.student_id = s.student_id
       LEFT JOIN counselors c ON b.counselor_id = c.counselor_id
       WHERE lower(s.email) = lower($1)
       ORDER BY b.booking_date DESC, b.booking_time DESC`,
      [email]
    );
    return res.rows;
  },

  async getBookingsByCounselorId(counselorId: number): Promise<any[]> {
    const res = await pool.query(
      `SELECT b.booking_id, b.student_id, b.counselor_id, b.booking_date, b.booking_time,
              b.year_level, b.additional_notes, b.status, b.created_at, b.updated_at,
              s.student_id AS s_student_id, s.name AS student_name, s.email AS student_email
       FROM bookings b
       JOIN students s ON b.student_id = s.student_id
       WHERE b.counselor_id = $1
       ORDER BY b.booking_date DESC, b.booking_time DESC`,
      [counselorId]
    );
    return res.rows;
  },

  async getAllBookings(): Promise<any[]> {
    const res = await pool.query(
      `SELECT b.booking_id, b.student_id, b.counselor_id, b.booking_date, b.booking_time,
              b.year_level, b.additional_notes, b.status, b.created_at, b.updated_at,
              s.student_id AS s_student_id, s.name AS student_name, s.email AS student_email,
              c.counselor_id AS c_counselor_id, c.name AS counselor_name, c.email AS counselor_email
       FROM bookings b
       LEFT JOIN students s ON b.student_id = s.student_id
       LEFT JOIN counselors c ON b.counselor_id = c.counselor_id
       ORDER BY b.created_at DESC`
    );
    return res.rows;
  },

  async updateBookingStatus(
    bookingId: string | number,
    status: string
  ): Promise<any | null> {
    if (!status || typeof status !== "string") {
      const e: any = new Error("Invalid status");
      e.code = "INVALID_INPUT";
      throw e;
    }

    const q = `UPDATE bookings SET status = $1, updated_at = NOW() WHERE booking_id = $2 RETURNING booking_id, student_id, counselor_id, booking_date, booking_time, year_level, additional_notes, status, created_at, updated_at`;

    try {
      const res = await pool.query(q, [status, bookingId]);
      if (!res.rows || res.rows.length === 0) return null;
      return res.rows[0];
    } catch (err: any) {
      console.error("bookingRepository.updateBookingStatus error:", err);
      throw err;
    }
  },

  async rescheduleBooking(
    bookingId: string | number,
    bookingDate: string,
    bookingTime: string
  ): Promise<any | null> {
    const res = await pool.query(
      `UPDATE bookings
       SET booking_date = $1, booking_time = $2, updated_at = NOW()
       WHERE booking_id = $3
       RETURNING booking_id, student_id, counselor_id, booking_date, booking_time, year_level, additional_notes, status, created_at, updated_at`,
      [bookingDate, bookingTime, bookingId]
    );
    if (!res.rows || res.rows.length === 0) return null;
    return res.rows[0];
  },
};

export default bookingRepository;
