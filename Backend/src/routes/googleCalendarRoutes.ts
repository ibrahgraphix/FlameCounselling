// src/routes/googleCalendarRoutes.ts
import express from "express";
import {
  getAuthUrl,
  exchangeOauthCode,
  getAvailableSlots,
  bookSession,
  oauthCallback,
} from "../controllers/googleCalendarController";

const router = express.Router();

// Example:
// GET /api/google-calendar/auth-url?counselorId=15
router.get("/auth-url", getAuthUrl);

// GET /api/google-calendar/callback  <-- for the OAuth redirect (also mounted under /api/counselors/google/callback)
router.get("/callback", oauthCallback);

// POST /api/google-calendar/oauth  { code, state, counselorId? }
router.post("/oauth", exchangeOauthCode);

// GET /api/google-calendar/available-slots?counselorId=15&date=2025-10-20&duration=30
router.get("/available-slots", getAvailableSlots);

// POST /api/google-calendar/book-session
router.post("/book-session", bookSession);

export default router;
