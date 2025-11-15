// src/repositories/sessionNotesRepository.ts
import pool from "../config/db";
import { SessionNote } from "../models/sessionNotes";

/**
 * Create session note and return created row.
 */
export const create = async (payload: {
  student_id: number;
  counselor_id: number;
  session_datetime: string;
  notes: string;
}): Promise<SessionNote> => {
  const { student_id, counselor_id, session_datetime, notes } = payload;

  const q = `
    INSERT INTO session_notes (student_id, counselor_id, session_datetime, notes)
    VALUES ($1, $2, $3, $4)
    RETURNING note_id, student_id, counselor_id, session_datetime, notes, created_at
  `;
  const values = [student_id, counselor_id, session_datetime, notes];
  const { rows } = await pool.query(q, values);
  return rows[0];
};

/**
 * Find all session notes for a counselor (ordered by created_at desc).
 * This version joins with students so each row includes student_name and student_email.
 */
export const findByCounselor = async (
  counselor_id: number
): Promise<SessionNote[]> => {
  const q = `
    SELECT 
      sn.note_id,
      sn.student_id,
      sn.counselor_id,
      sn.session_datetime,
      sn.notes,
      sn.created_at,
      s.name AS student_name,
      s.email AS student_email
    FROM session_notes sn
    LEFT JOIN students s ON s.student_id = sn.student_id
    WHERE sn.counselor_id = $1
    ORDER BY sn.created_at DESC, sn.session_datetime DESC
  `;
  const { rows } = await pool.query(q, [counselor_id]);
  return rows;
};

/**
 * Utility: check whether a student exists by id.
 */
export const getStudentById = async (
  student_id: number
): Promise<any | null> => {
  const q = `SELECT student_id, name, email, created_at, updated_at FROM students WHERE student_id = $1 LIMIT 1`;
  const { rows } = await pool.query(q, [student_id]);
  return rows[0] ?? null;
};
