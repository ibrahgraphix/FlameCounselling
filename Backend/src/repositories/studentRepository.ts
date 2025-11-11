// src/repositories/studentRepository.ts
import pool from "../config/db";
import { Student } from "../models/Students";

export const studentRepository = {
  async findByEmail(email: string, client?: any): Promise<Student | null> {
    const q = `SELECT student_id, name, email, created_at, updated_at, last_active, status
       FROM students
       WHERE email = $1
       LIMIT 1`;
    const res = client
      ? await client.query(q, [email])
      : await pool.query(q, [email]);
    return res.rows[0] ?? null;
  },

  async create(
    name: string | null,
    email: string,
    client?: any
  ): Promise<Student> {
    const q = `INSERT INTO students (name, email, created_at, updated_at)
       VALUES ($1, $2, NOW(), NOW())
       RETURNING student_id, name, email, created_at, updated_at`;
    const res = client
      ? await client.query(q, [name, email])
      : await pool.query(q, [name, email]);
    return res.rows[0];
  },

  async findByName(name: string, client?: any): Promise<Student | null> {
    const q = `SELECT student_id, name, email, created_at, updated_at, last_active, status
       FROM students
       WHERE name ILIKE '%' || $1 || '%'
       ORDER BY student_id ASC
       LIMIT 1`;
    const res = client
      ? await client.query(q, [name])
      : await pool.query(q, [name]);
    return res.rows[0] ?? null;
  },

  async findByNamePartial(term: string, client?: any): Promise<Student[]> {
    const q = `SELECT student_id, name, email, created_at, updated_at, last_active, status
      FROM students
      WHERE name ILIKE '%' || $1 || '%'
      ORDER BY name
      LIMIT 50`;
    const res = client
      ? await client.query(q, [term])
      : await pool.query(q, [term]);
    return res.rows ?? [];
  },

  /**
   * Update last_active timestamp to NOW() for the given student.
   * Returns true if updated (rowCount > 0).
   */
  async updateLastActive(student_id: number): Promise<boolean> {
    try {
      const q = `UPDATE students SET last_active = NOW() WHERE student_id = $1`;
      const res = await pool.query(q, [student_id]);
      return res.rowCount > 0;
    } catch (err) {
      console.error("studentRepository.updateLastActive error:", err);
      return false;
    }
  },

  /**
   * Set status (e.g. 'active'/'inactive') on student row.
   */
  async setStatus(student_id: number, status: string): Promise<boolean> {
    try {
      const q = `UPDATE students SET status = $1 WHERE student_id = $2`;
      const res = await pool.query(q, [status, student_id]);
      return res.rowCount > 0;
    } catch (err) {
      console.error("studentRepository.setStatus error:", err);
      return false;
    }
  },

  async delete(student_id: number): Promise<boolean> {
    try {
      const q = `DELETE FROM students WHERE student_id = $1`;
      const res = await pool.query(q, [student_id]);
      return res.rowCount > 0;
    } catch (err) {
      console.error("studentRepository.delete error:", err);
      return false;
    }
  },
};
