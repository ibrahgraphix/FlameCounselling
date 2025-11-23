// src/services/adminAnalyticsService.ts
import pool from "../config/db";

/**
 * fetchSystemAnalytics
 * Returns an analytics object used by the admin dashboard.
 * Adds bookingsToday (number of bookings created today).
 */
export const fetchSystemAnalytics = async () => {
  const activeWindow = "30 days";

  const qStudentsCount = `SELECT COUNT(*)::int AS count FROM students`;
  const qCounselorsCount = `SELECT COUNT(*)::int AS count FROM counselors`;
  const qSessionNotesCount = `SELECT COUNT(*)::int AS count FROM session_notes`;
  const qBookingsCount = `SELECT COUNT(*)::int AS count FROM bookings`;

  // Bookings created today (server's current_date)
  const qBookingsToday = `SELECT COUNT(*)::int AS count FROM bookings WHERE created_at::date = CURRENT_DATE`;

  // Compute appointments breakdown in one query (attempts to handle common status values)
  const qAppointmentsBreakdown = `
    SELECT
      COUNT(*)::int AS total,
      SUM(
        CASE
          WHEN lower(status) = 'completed' THEN 1
          WHEN lower(status) = 'confirmed' AND (booking_date::date < CURRENT_DATE) THEN 1
          ELSE 0
        END
      )::int AS completed,
      SUM(
        CASE
          WHEN lower(status) IN ('pending', 'confirmed') AND (booking_date::date >= CURRENT_DATE) THEN 1
          ELSE 0
        END
      )::int AS upcoming,
      SUM(
        CASE
          WHEN lower(status) IN ('canceled','cancelled') THEN 1
          ELSE 0
        END
      )::int AS cancelled
    FROM bookings
  `;

  // Count active users (students + counselors) who had last_active within last 30 days
  const qActiveUsers = `
    SELECT COUNT(*)::int AS count FROM (
      SELECT student_id AS id, last_active FROM students
      UNION ALL
      SELECT counselor_id AS id, last_active FROM counselors
    ) t
    WHERE t.last_active IS NOT NULL
      AND t.last_active >= (now() - interval '${activeWindow}')
  `;

  // Run queries in parallel
  const [
    studentsRes,
    counselorsRes,
    notesRes,
    bookingsRes,
    bookingsTodayRes,
    apptRes,
    activeUsersRes,
  ] = await Promise.all([
    pool.query(qStudentsCount),
    pool.query(qCounselorsCount),
    pool.query(qSessionNotesCount),
    pool.query(qBookingsCount),
    pool.query(qBookingsToday),
    pool.query(qAppointmentsBreakdown),
    pool.query(qActiveUsers),
  ]);

  const studentsCount = Number(studentsRes.rows[0]?.count ?? 0);
  const counselorsCount = Number(counselorsRes.rows[0]?.count ?? 0);
  const sessionNotesCount = Number(notesRes.rows[0]?.count ?? 0);
  const bookingsCount = Number(bookingsRes.rows[0]?.count ?? 0);
  const bookingsToday = Number(bookingsTodayRes.rows[0]?.count ?? 0);

  const apptRow = apptRes.rows[0] ?? {};
  const appointments = {
    total: Number(apptRow.total ?? bookingsCount),
    completed: Number(apptRow.completed ?? 0),
    upcoming: Number(apptRow.upcoming ?? 0),
    cancelled: Number(apptRow.cancelled ?? 0),
  };

  const activeUsers = Number(activeUsersRes.rows[0]?.count ?? 0);
  const userCount = studentsCount + counselorsCount;

  // moodDistribution placeholder (keep existing mock or replace with your real mood table counts)
  const moodDistribution = [
    { name: "Mon", excellent: 0, good: 0, neutral: 0, poor: 0, bad: 0 },
    { name: "Tue", excellent: 0, good: 0, neutral: 0, poor: 0, bad: 0 },
    { name: "Wed", excellent: 0, good: 0, neutral: 0, poor: 0, bad: 0 },
    { name: "Thu", excellent: 0, good: 0, neutral: 0, poor: 0, bad: 0 },
    { name: "Fri", excellent: 0, good: 0, neutral: 0, poor: 0, bad: 0 },
    { name: "Sat", excellent: 0, good: 0, neutral: 0, poor: 0, bad: 0 },
    { name: "Sun", excellent: 0, good: 0, neutral: 0, poor: 0, bad: 0 },
  ];

  return {
    // legacy keys frontend expects
    userCount,
    activeUsers,
    // frontend currently expects blogPosts -> session notes count
    blogPosts: sessionNotesCount,
    // frontend expects communityPosts -> total bookings count
    communityPosts: bookingsCount,
    moodDistribution,
    appointments,

    // NEW: bookings created today
    bookingsToday,
  };
};

export default { fetchSystemAnalytics };
