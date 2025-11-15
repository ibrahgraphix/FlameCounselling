// src/utils/jwt.ts
import * as jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

export const JWT_SECRET: jwt.Secret =
  (process.env.JWT_SECRET as jwt.Secret) || "supersecret";
export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "1h";

export const signToken = (
  payload: string | object | Buffer,
  expiresIn?: string
): string => {
  return jwt.sign(payload as any, JWT_SECRET, {
    expiresIn: expiresIn ?? JWT_EXPIRES_IN,
  } as jwt.SignOptions);
};

export default {
  JWT_SECRET,
  JWT_EXPIRES_IN,
  signToken,
};
