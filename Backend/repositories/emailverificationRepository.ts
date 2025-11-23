// src/repositories/emailVerificationRepository.ts
import pool from "../config/db";

export type EmailVerificationRow = {
  email: string;
  code: string | null;
  expires_at: Date | null;
  verified: boolean;
  verified_at: Date | null;
  created_at: Date | null;
  updated_at: Date | null;
};

const TABLE = "email_verification";

export const emailVerificationRepository = {
  /**
   * Insert or update a code for an email.
   * If a row exists for the email it will be updated.
   */
  async upsertCode(
    email: string,
    code: string,
    expiresAt: Date
  ): Promise<EmailVerificationRow | null> {
    const q = `
      INSERT INTO ${TABLE} (email, code, expires_at, verified, created_at, updated_at)
      VALUES ($1, $2, $3, false, NOW(), NOW())
      ON CONFLICT (email) DO UPDATE
        SET code = EXCLUDED.code,
            expires_at = EXCLUDED.expires_at,
            verified = false,
            verified_at = NULL,
            updated_at = NOW()
      RETURNING email, code, expires_at, verified, verified_at, created_at, updated_at
    `;
    const res = await pool.query(q, [email, code, expiresAt]);
    return res.rows[0] ?? null;
  },

  async getByEmail(email: string): Promise<EmailVerificationRow | null> {
    const q = `SELECT email, code, expires_at, verified, verified_at, created_at, updated_at FROM ${TABLE} WHERE lower(email) = lower($1) LIMIT 1`;
    const res = await pool.query(q, [email]);
    if (!res.rows || res.rows.length === 0) return null;
    return res.rows[0];
  },

  async markVerified(email: string): Promise<EmailVerificationRow | null> {
    const q = `
      UPDATE ${TABLE}
      SET verified = true,
          verified_at = NOW(),
          updated_at = NOW()
      WHERE lower(email) = lower($1)
      RETURNING email, code, expires_at, verified, verified_at, created_at, updated_at
    `;
    const res = await pool.query(q, [email]);
    return res.rows[0] ?? null;
  },

  async deleteByEmail(email: string): Promise<boolean> {
    const q = `DELETE FROM ${TABLE} WHERE lower(email) = lower($1)`;
    const res = await pool.query(q, [email]);
    return res.rowCount > 0;
  },
};

export default emailVerificationRepository;
