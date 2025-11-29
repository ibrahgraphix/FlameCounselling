// src/services/adminAnalytics.ts
import pool from "../config/db";

/**
 * fetchSystemAnalytics
 * - If opts.counselorId is provided -> compute analytics scoped to that counselor.
 * - Otherwise -> compute system-wide analytics.
 *
 * Returned shape matches what the frontend expects.
 */
export const fetchSystemAnalytics = async (opts?: {
  counselorId?: string | number;
}) => {
  const activeWindow = "30 days";
  const counselorId =
    typeof opts?.counselorId !== "undefined"
      ? String(opts!.counselorId)
      : undefined;

  // Helper to build WHERE clause and params
  const withCounselorWhere = (baseQuery: string) => {
    if (!counselorId) return { query: baseQuery, params: [] as any[] };
    // assume bookings, session_notes use counselor_id column
    return {
      query: `${baseQuery} WHERE counselor_id = $1`,
      params: [Number(counselorId)] as any[],
    };
  };

  try {
    if (counselorId) {
      // Counselor-scoped queries
      const qStudentsCount = `SELECT COUNT(DISTINCT student_id)::int AS count FROM bookings WHERE counselor_id = $1`;
      const qCounselorsCount = `SELECT COUNT(*)::int AS count FROM counselors WHERE id = $1 OR counselor_id = $1`;
      const qSessionNotesCount = `SELECT COUNT(*)::int AS count FROM session_notes WHERE counselor_id = $1`;
      const qBookingsCount = `SELECT COUNT(*)::int AS count FROM bookings WHERE counselor_id = $1`;
      const qBookingsToday = `SELECT COUNT(*)::int AS count FROM bookings WHERE counselor_id = $1 AND created_at::date = CURRENT_DATE`;
      const qAppointmentsBreakdown = `
        SELECT
          COUNT(*)::int AS total,
          SUM(CASE WHEN lower(status) = 'completed' THEN 1 ELSE 0 END)::int AS completed,
          SUM(CASE WHEN lower(status) IN ('pending','confirmed') AND (booking_date::date >= CURRENT_DATE) THEN 1 ELSE 0 END)::int AS upcoming,
          SUM(CASE WHEN lower(status) IN ('canceled','cancelled') THEN 1 ELSE 0 END)::int AS cancelled
        FROM bookings
        WHERE counselor_id = $1
      `;
      const qActiveUsers = `
        SELECT COUNT(DISTINCT student_id)::int AS count
        FROM bookings
        WHERE counselor_id = $1
          AND (booking_date >= (now() - interval '${activeWindow}') OR created_at >= (now() - interval '${activeWindow}'))
      `;

      const [
        studentsRes,
        counselorsRes,
        notesRes,
        bookingsRes,
        bookingsTodayRes,
        apptRes,
        activeUsersRes,
      ] = await Promise.all([
        pool.query(qStudentsCount, [Number(counselorId)]),
        pool.query(qCounselorsCount, [Number(counselorId)]),
        pool.query(qSessionNotesCount, [Number(counselorId)]),
        pool.query(qBookingsCount, [Number(counselorId)]),
        pool.query(qBookingsToday, [Number(counselorId)]),
        pool.query(qAppointmentsBreakdown, [Number(counselorId)]),
        pool.query(qActiveUsers, [Number(counselorId)]),
      ]);

      const studentsCount = Number(studentsRes.rows[0]?.count ?? 0);
      // If counselors table doesn't return count, fallback to 1 (self)
      const counselorsCount = Number(counselorsRes.rows[0]?.count ?? 1);
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
      const userCount = studentsCount + (counselorsCount || 1);

      // Mood distribution - keep placeholder zeros (replace with your actual mood queries if you have a moods table)
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
        userCount,
        activeUsers,
        blogPosts: sessionNotesCount,
        communityPosts: bookingsCount,
        moodDistribution,
        appointments,
        bookingsToday,
      };
    } else {
      // System-wide queries (existing behavior)
      const qStudentsCount = `SELECT COUNT(*)::int AS count FROM students`;
      const qCounselorsCount = `SELECT COUNT(*)::int AS count FROM counselors`;
      const qSessionNotesCount = `SELECT COUNT(*)::int AS count FROM session_notes`;
      const qBookingsCount = `SELECT COUNT(*)::int AS count FROM bookings`;
      const qBookingsToday = `SELECT COUNT(*)::int AS count FROM bookings WHERE created_at::date = CURRENT_DATE`;
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
      const qActiveUsers = `
        SELECT COUNT(*)::int AS count FROM (
          SELECT student_id AS id, last_active FROM students
          UNION ALL
          SELECT counselor_id AS id, last_active FROM counselors
        ) t
        WHERE t.last_active IS NOT NULL
          AND t.last_active >= (now() - interval '${activeWindow}')
      `;

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
        userCount,
        activeUsers,
        blogPosts: sessionNotesCount,
        communityPosts: bookingsCount,
        moodDistribution,
        appointments,
        bookingsToday,
      };
    }
  } catch (err) {
    console.error("adminAnalytics.fetchSystemAnalytics error:", err);
    throw err;
  }
};

export default { fetchSystemAnalytics };
