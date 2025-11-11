// src/services/bookingService.ts
import pool from "../config/db";
import { studentRepository } from "../repositories/studentRepository";
import { bookingRepository } from "../repositories/bookingRepository";
import { BookingRow } from "../models/Booking";

export const bookingService = {
  async createBooking({
    student_name,
    student_email,
    counselor_id,
    booking_date,
    booking_time,
    year_level,
    additional_notes,
  }: {
    student_name?: string | null;
    student_email: string;
    counselor_id: number;
    booking_date: string;
    booking_time: string;
    year_level?: string | null;
    additional_notes?: string | null;
  }): Promise<BookingRow> {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // assume studentRepository has methods that accept client for transactional consistency
      let student = await studentRepository.findByEmail(student_email, client);
      if (!student) {
        // create returns the created student row { student_id, name, email, ... }
        student = await studentRepository.create(
          student_name ?? null,
          student_email,
          client
        );
      }

      const booking = await bookingRepository.createBooking(
        student.student_id,
        Number(counselor_id),
        booking_date,
        booking_time,
        year_level ?? null,
        additional_notes ?? null,
        client
      );

      await client.query("COMMIT");
      return booking;
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  },

  async getBookingsByStudentEmail(email: string) {
    return bookingRepository.getBookingsByStudentEmail(email);
  },

  async getBookingsByCounselorId(counselorId: number) {
    return bookingRepository.getBookingsByCounselorId(counselorId);
  },

  async getAllBookings() {
    return bookingRepository.getAllBookings();
  },

  async updateBookingStatus(bookingId: string | number, status: string) {
    return bookingRepository.updateBookingStatus(bookingId, status);
  },

  async rescheduleBooking(
    bookingId: string | number,
    bookingDate: string,
    bookingTime: string
  ) {
    return bookingRepository.rescheduleBooking(
      bookingId,
      bookingDate,
      bookingTime
    );
  },
};

export default bookingService;
