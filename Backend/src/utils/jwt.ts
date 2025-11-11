// src/utils/jwt.ts
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

export const JWT_SECRET = process.env.JWT_SECRET || "supersecret";
export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "1h";

/**
 * signToken(payload)
 * - Use this to sign tokens across the app. It uses the centralized JWT_SECRET.
 */
export const signToken = (payload: object, expiresIn?: string) => {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: expiresIn ?? JWT_EXPIRES_IN,
  });
};
