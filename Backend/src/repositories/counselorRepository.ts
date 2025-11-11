// src/repositories/counselorRepository.ts
import pool from "../config/db";
import { Counselor } from "../models/Counselor";

const normalizeRow = (r: any) => ({
  counselor_id: r.counselor_id ?? r.id ?? null,
  name: r.name ?? r.full_name ?? null,
  email: r.email ?? r.email_address ?? null,
  password_hash: r.password_hash ?? null,
  role: r.role ?? null,
  specialty: r.specialty ?? r.speciality ?? null, // support both spellings

  // Google OAuth / calendar columns (may be null / absent in older DB)
  google_connected:
    r.google_connected === true ||
    r.google_connected === "t" ||
    r.google_connected === 1 ||
    r.google_connected === "1"
      ? true
      : false,
  google_access_token: r.google_access_token ?? null,
  google_refresh_token: r.google_refresh_token ?? null,
  google_token_expiry: r.google_token_expiry ?? null,
  google_calendar_id: r.google_calendar_id ?? null,
  google_oauth_state: r.google_oauth_state ?? null,
  last_active: r.last_active ?? r.lastActive ?? null,
  status:
    r.status ??
    (typeof r.is_active !== "undefined"
      ? r.is_active
        ? "active"
        : "inactive"
      : null),
  raw: r,
});

export const getAllCounselors = async (): Promise<Counselor[]> => {
  try {
    const res = await pool.query(
      `SELECT * FROM counselors ORDER BY counselor_id`
    );
    return res.rows.map(normalizeRow) as Counselor[];
  } catch (err) {
    console.error("getAllCounselors error:", err);
    return [];
  }
};

export const getCounselorById = async (id: number): Promise<any | null> => {
  try {
    const res = await pool.query(
      `SELECT * FROM counselors WHERE counselor_id = $1 LIMIT 1`,
      [id]
    );
    if (res.rows.length === 0) return null;
    return normalizeRow(res.rows[0]);
  } catch (err) {
    console.error("getCounselorById error:", err);
    return null;
  }
};

export const findByEmail = async (email: string): Promise<any | null> => {
  try {
    const res = await pool.query(
      `SELECT * FROM counselors WHERE lower(email) = lower($1) LIMIT 1`,
      [email]
    );
    if (res.rows.length === 0) return null;
    return normalizeRow(res.rows[0]);
  } catch (err) {
    console.error("findByEmail error:", err);
    return null;
  }
};

/**
 * createCounselor
 * Inserts a new counselor row and returns the normalized row.
 * passwordHash can be null when creating from Google sign-in.
 *
 * This function first attempts the insert with created_at/updated_at (which
 * matches recent migrations). If the table doesn't have those columns,
 * Postgres returns error 42703 (undefined_column) — in that case we retry
 * with a simpler INSERT that omits created_at/updated_at.
 */
export const createCounselor = async (
  name: string | null,
  email: string,
  role: string | null = "counselor",
  passwordHash: string | null = null
): Promise<any | null> => {
  // Primary query (includes created_at/updated_at)
  const qPrimary = `
    INSERT INTO counselors
      (name, email, password_hash, role, status, created_at, updated_at)
    VALUES
      ($1, $2, $3, $4, $5, NOW(), NOW())
    RETURNING *
  `;

  // Fallback query (omits timestamps) for older schemas
  const qFallback = `
    INSERT INTO counselors
      (name, email, password_hash, role, status)
    VALUES
      ($1, $2, $3, $4, $5)
    RETURNING *
  `;

  const status = "active";
  try {
    const res = await pool.query(qPrimary, [
      name ?? null,
      email,
      passwordHash,
      role,
      status,
    ]);
    if (!res || !res.rows || res.rows.length === 0) return null;
    return normalizeRow(res.rows[0]);
  } catch (err: any) {
    console.error("createCounselor primary error:", err);

    // If the DB reports "column does not exist" (Postgres code 42703),
    // retry with the fallback query that excludes created_at/updated_at
    if (err && err.code === "42703") {
      try {
        const res2 = await pool.query(qFallback, [
          name ?? null,
          email,
          passwordHash,
          role,
          status,
        ]);
        if (!res2 || !res2.rows || res2.rows.length === 0) return null;
        return normalizeRow(res2.rows[0]);
      } catch (err2: any) {
        console.error("createCounselor fallback error:", err2);
        if (err2.code === "23505") {
          // unique_violation
          const e: any = new Error("Email already exists");
          e.status = 409;
          throw e;
        }
        throw err2;
      }
    }

    // Existing handling for unique violation on primary attempt
    if (err.code === "23505") {
      const e: any = new Error("Email already exists");
      e.status = 409;
      throw e;
    }
    throw err;
  }
};

/* ---------------- Google helpers ---------------- */

export const setGoogleOAuthState = async (
  counselorId: number,
  state: string | null
) => {
  try {
    await pool.query(
      `UPDATE counselors SET google_oauth_state = $1 WHERE counselor_id = $2`,
      [state, counselorId]
    );
    return true;
  } catch (err) {
    console.error("setGoogleOAuthState error:", err);
    return false;
  }
};

export const findCounselorByOAuthState = async (state: string) => {
  try {
    const res = await pool.query(
      `SELECT * FROM counselors WHERE google_oauth_state = $1 LIMIT 1`,
      [state]
    );
    if (res.rows.length === 0) return null;
    return normalizeRow(res.rows[0]);
  } catch (err) {
    console.error("findCounselorByOAuthState error:", err);
    return null;
  }
};

/**
 * storeGoogleTokens
 * Saves access + refresh tokens and expiry into the counselors table.
 *
 * expiryDate may come from Google as milliseconds since epoch (number) or a string.
 * Convert to a proper ISO timestamp so Postgres can store it in a TIMESTAMP/TIMESTAMPTZ column.
 */
export const storeGoogleTokens = async (
  counselorId: number,
  accessToken: string | null,
  refreshToken: string | null,
  expiryDate: string | number | null,
  calendarId?: string | null
) => {
  try {
    // Convert expiryDate (ms since epoch or ISO string) into ISO timestamp, or null.
    let expiryISO: string | null = null;
    if (expiryDate !== null && typeof expiryDate !== "undefined") {
      // expiryDate can be string like "1760793105956" or number 1760793105956 or ISO string.
      // Try to coerce to number first; if it's a valid number, treat as ms since epoch.
      const asNum =
        typeof expiryDate === "number" ? expiryDate : Number(expiryDate);
      if (!isNaN(asNum) && String(expiryDate).length >= 10) {
        // treat as ms since epoch if it's a large number (ms)
        // if it's in seconds, new Date(asNum*1000) would be needed; Google uses ms.
        expiryISO = new Date(asNum).toISOString();
      } else {
        // fallback: if string and parseable as ISO, use it
        const parsed = Date.parse(String(expiryDate));
        if (!isNaN(parsed)) expiryISO = new Date(parsed).toISOString();
        else expiryISO = null;
      }
    }

    await pool.query(
      `UPDATE counselors
         SET google_connected = TRUE,
             google_access_token = $1,
             google_refresh_token = $2,
             google_token_expiry = $3,
             google_calendar_id = COALESCE($4, google_calendar_id),
             google_oauth_state = NULL
       WHERE counselor_id = $5`,
      [accessToken, refreshToken, expiryISO, calendarId ?? null, counselorId]
    );
    return true;
  } catch (err) {
    console.error("storeGoogleTokens error:", err);
    return false;
  }
};

export const unsetGoogleConnection = async (counselorId: number) => {
  try {
    await pool.query(
      `UPDATE counselors
         SET google_connected = FALSE,
             google_access_token = NULL,
             google_refresh_token = NULL,
             google_token_expiry = NULL,
             google_calendar_id = NULL,
             google_oauth_state = NULL
       WHERE counselor_id = $1`,
      [counselorId]
    );
    return true;
  } catch (err) {
    console.error("unsetGoogleConnection error:", err);
    return false;
  }
};

export const updateLastActive = async (
  counselorId: number
): Promise<boolean> => {
  try {
    const q = `UPDATE counselors SET last_active = NOW() WHERE counselor_id = $1`;
    const r = await pool.query(q, [counselorId]);
    return r.rowCount > 0;
  } catch (err) {
    console.error("counselorRepository.updateLastActive error:", err);
    return false;
  }
};

export const setStatus = async (
  counselorId: number,
  status: string
): Promise<boolean> => {
  try {
    const q = `UPDATE counselors SET status = $1 WHERE counselor_id = $2`;
    const r = await pool.query(q, [status, counselorId]);
    return r.rowCount > 0;
  } catch (err) {
    console.error("counselorRepository.setStatus error:", err);
    return false;
  }
};

export const deleteCounselor = async (
  counselorId: number
): Promise<boolean> => {
  try {
    const q = `DELETE FROM counselors WHERE counselor_id = $1`;
    const r = await pool.query(q, [counselorId]);
    return r.rowCount > 0;
  } catch (err) {
    console.error("counselorRepository.delete error:", err);
    return false;
  }
};

export default {
  getAllCounselors,
  getCounselorById,
  findByEmail,
  createCounselor,
  updateLastActive,
  setStatus,
  delete: deleteCounselor,
  setGoogleOAuthState,
  findCounselorByOAuthState,
  storeGoogleTokens,
  unsetGoogleConnection,
};
