// src/services/authService.ts
import {
  findByEmail as findCounselorByEmail,
  updateLastActive as updateCounselorLastActive,
  createCounselor as createCounselorRepo,
} from "../repositories/counselorRepository";
import bcrypt from "bcrypt";
import { signToken } from "../utils/jwt";
import { OAuth2Client } from "google-auth-library";
import dotenv from "dotenv";
dotenv.config();

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";

/**
 * Export OAuth scopes from here so other services (e.g. googleCalendarService)
 * can reuse the same canonical scope list instead of duplicating it.
 */
export const OAUTH_SCOPES = ["https://www.googleapis.com/auth/calendar"];

export const loginCounselor = async (email: string, password: string) => {
  const counselor = await findCounselorByEmail(email);
  if (!counselor) {
    const e: any = new Error("Email not found");
    e.status = 404;
    throw e;
  }

  if (!counselor.password_hash) {
    const e: any = new Error("User has no password set");
    e.status = 401;
    throw e;
  }

  const match = await bcrypt.compare(password, counselor.password_hash);
  if (!match) {
    const e: any = new Error("Invalid password");
    e.status = 401;
    throw e;
  }

  try {
    await updateCounselorLastActive(counselor.counselor_id);
  } catch (err) {
    console.warn("Could not update counselor last_active:", err);
  }

  const payload = {
    id: counselor.counselor_id,
    name: counselor.name,
    email: counselor.email,
    role: counselor.role,
  };

  const token = signToken(payload);
  return { token, counselor: payload };
};

/**
 * Google sign-in.
 *
 * IMPORTANT CHANGE:
 *  - Do NOT auto-create a counselor row on Google login.
 *  - Only allow login if an existing counselor/admin row is present in counselors table.
 *  - If not found, return an error (403) so frontend can refuse dashboard access.
 */
export const loginWithGoogle = async (idToken: string) => {
  if (!GOOGLE_CLIENT_ID) {
    const e: any = new Error("GOOGLE_CLIENT_ID not configured on server");
    e.status = 500;
    throw e;
  }

  const client = new OAuth2Client(GOOGLE_CLIENT_ID);
  let ticket;
  try {
    ticket = await client.verifyIdToken({
      idToken,
      audience: GOOGLE_CLIENT_ID,
    });
  } catch (err) {
    console.error("Google token verify failed:", err);
    const e: any = new Error("Invalid Google ID token");
    e.status = 401;
    throw e;
  }

  const payload = ticket.getPayload();
  if (!payload || !payload.email) {
    const e: any = new Error("Google token missing email");
    e.status = 400;
    throw e;
  }

  const email: string = String(payload.email).toLowerCase();
  const name: string | null = payload.name ?? payload.given_name ?? null;

  // Lookup counselor row only (do NOT create)
  const counselor = await findCounselorByEmail(email);

  if (!counselor) {
    // No counselor row exists for this Google email → deny access
    const e: any = new Error(
      "Not authorized: this account is not registered as a counselor or admin"
    );
    e.status = 403;
    throw e;
  }

  // Ensure role is counselor or admin (be tolerant to casing)
  const role = (counselor.role ?? "").toString().toLowerCase();
  if (role !== "counselor" && role !== "admin") {
    const e: any = new Error(
      "Not authorized: this account is not a counselor or admin"
    );
    e.status = 403;
    throw e;
  }

  // update last active (best-effort)
  try {
    await updateCounselorLastActive(counselor.counselor_id);
  } catch (err) {
    console.warn("Could not update counselor last_active:", err);
  }

  const tokenPayload = {
    id: counselor.counselor_id,
    name: counselor.name,
    email: counselor.email,
    role: counselor.role ?? "counselor",
  };

  const token = signToken(tokenPayload);

  return { token, counselor: tokenPayload };
};
