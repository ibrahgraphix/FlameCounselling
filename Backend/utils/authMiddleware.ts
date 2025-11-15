// src/utils/authMiddleware.ts
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "./jwt";

export const requireAuth = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // look in header first
  const authHeader = (req.headers["authorization"] || "") as string;
  let token =
    authHeader && authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  // if not present in header, check body (useful for guest access_token)
  if (!token) {
    try {
      // body may be parsed by express.json() already
      const bodyToken = (req as any).body?.access_token;
      if (bodyToken && typeof bodyToken === "string") token = bodyToken;
    } catch (e) {
      // ignore
    }
  }

  // if still no token, check query param
  if (!token) {
    try {
      const q = (req as any).query?.access_token;
      if (q && typeof q === "string") token = q;
    } catch (e) {}
  }

  if (!token) {
    return res.status(401).json({ message: "No token provided" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    // Debug line can help while testing — remove or comment in production.
    console.log("[auth] decoded token:", decoded);
    (req as any).user = decoded;
    next();
  } catch (err) {
    console.error("JWT verify error:", err);
    return res.status(403).json({ message: "Invalid or expired token" });
  }
};

export default requireAuth;
