// src/controllers/googleCalendarController.ts
import { Request, Response } from "express";
import GoogleCalendarService from "../services/googleCalendarService";
import counselorRepository from "../repositories/counselorRepository";

const FRONTEND_ORIGIN =
  process.env.CLIENT_URL ||
  process.env.FRONTEND_ORIGIN ||
  "https://flamestudentcouncil.in:7070";

export const getAuthUrl = async (req: Request, res: Response) => {
  try {
    const counselorId = Number(req.query.counselorId ?? req.params.counselorId);
    if (!counselorId)
      return res.status(400).json({ error: "counselorId required" });
    const result = await GoogleCalendarService.generateAuthUrl(counselorId);
    return res.json(result);
  } catch (err: any) {
    console.error("getAuthUrl error:", err);
    return res
      .status(500)
      .json({ error: err.message || "Could not generate auth url" });
  }
};

export const oauthCallback = async (req: Request, res: Response) => {
  try {
    const code = String(req.query.code ?? "");
    const state =
      typeof req.query.state !== "undefined"
        ? String(req.query.state)
        : undefined;

    if (!code) {
      // If Google redirected with no code (maybe error param), pass error back to frontend
      const errorDescription = String(
        req.query.error_description ?? req.query.error ?? "missing_code"
      );
      console.warn("OAuth callback missing code, error:", errorDescription);
      return res.redirect(
        `${FRONTEND_ORIGIN}/?google_connected=0&error=${encodeURIComponent(
          errorDescription
        )}`
      );
    }

    const exchangeResult =
      await GoogleCalendarService.exchangeCodeAndStoreTokens({
        code,
        state,
      });

    try {
      let counselorRow = null;
      if (state) {
        counselorRow = await counselorRepository.findCounselorByOAuthState(
          state
        );
      }
      if (
        counselorRow &&
        typeof (counselorRepository as any).setGoogleConnected === "function"
      ) {
        // call via any to avoid TypeScript errors if repository typings don't include this function
        await (counselorRepository as any)
          .setGoogleConnected(counselorRow.counselor_id, true)
          .catch(() => {});
      }
    } catch (e) {
      // non-fatal
    }

    // Redirect back to frontend — the UI will poll for the connection status.
    return res.redirect(`${FRONTEND_ORIGIN}/?google_connected=1`);
  } catch (err: any) {
    console.error("oauthCallback error:", err);
    const msg = err?.message ?? "oauth_exchange_failed";
    return res.redirect(
      `${FRONTEND_ORIGIN}/?google_connected=0&error=${encodeURIComponent(msg)}`
    );
  }
};

export const exchangeOauthCode = async (req: Request, res: Response) => {
  try {
    const { code, state, counselorId } = req.body;
    if (!code) return res.status(400).json({ error: "code is required" });

    const result = await GoogleCalendarService.exchangeCodeAndStoreTokens({
      code,
      counselorId: counselorId ? Number(counselorId) : undefined,
      state,
    });

    return res.json({ success: true, ...result });
  } catch (err: any) {
    console.error("exchangeOauthCode error:", err);
    return res
      .status(500)
      .json({ error: err.message || "Could not exchange code" });
  }
};

export const getAvailableSlots = async (req: Request, res: Response) => {
  try {
    const counselorId = Number(req.query.counselorId);
    const date = String(req.query.date ?? "");
    // Changed default duration to 60 minutes
    const duration = Number(req.query.duration ?? 60);

    if (!counselorId || !date)
      return res
        .status(400)
        .json({ error: "counselorId and date are required" });

    // Quick DB check: if counselor is not google_connected, return connected: false
    const counselor = await counselorRepository.getCounselorById(counselorId);
    if (!counselor)
      return res.status(404).json({ error: "Counselor not found" });

    if (!counselor.google_connected) {
      return res.json({ connected: false, slots: [] });
    }

    try {
      const result = await GoogleCalendarService.getAvailableSlots(
        counselorId,
        date,
        duration
      );
      return res.json(result);
    } catch (e: any) {
      console.error("getAvailableSlots (service) error:", e);
      // If the error indicates invalid grant or missing refresh token, return connected:false
      if (
        e?.code === "INVALID_GRANT" ||
        e?.code === "NO_REFRESH_TOKEN" ||
        /invalid_grant/i.test(e?.message ?? "")
      ) {
        // Optionally clear the google_connected flag or leave to admin tooling; we return connected:false
        return res.status(400).json({
          connected: false,
          slots: [],
          error:
            "Google calendar authorization invalid or expired. Reauthorization required.",
        });
      }
      return res.status(500).json({
        connected: false,
        slots: [],
        error: e?.message ?? "Failed to fetch slots",
      });
    }
  } catch (err: any) {
    console.error("getAvailableSlots error:", err);
    return res.status(500).json({
      connected: false,
      slots: [],
      error: err.message ?? "Failed to fetch slots",
    });
  }
};

export const bookSession = async (req: Request, res: Response) => {
  try {
    const body = req.body ?? {};
    const required = ["counselor_id", "booking_date", "booking_time"];
    for (const r of required) {
      if (typeof body[r] === "undefined" || body[r] === null) {
        return res.status(400).json({ error: `${r} is required` });
      }
    }

    const payload = {
      student_id: body.student_id ? Number(body.student_id) : undefined,
      student_email: body.student_email ?? null,
      counselor_id: Number(body.counselor_id),
      booking_date: String(body.booking_date),
      booking_time: String(body.booking_time),
      // duration will be passed through if provided; otherwise undefined (service defaults)
      duration: body.duration ? Number(body.duration) : undefined,
      summary: body.summary ?? undefined,
      description: body.description ?? body.additional_notes ?? undefined,
      timezone: body.timezone ?? undefined,
      year_level: body.year_level ?? undefined,
      additional_notes: body.additional_notes ?? undefined,
    };

    // If counselor not connected, optionally allow fallback booking (but here we require connection)
    const counselor = await counselorRepository.getCounselorById(
      payload.counselor_id
    );
    if (!counselor)
      return res.status(404).json({ error: "Counselor not found" });

    if (!counselor.google_connected) {
      return res.status(400).json({
        error: "Counselor has not connected Google Calendar",
        connected: false,
      });
    }

    try {
      const result = await GoogleCalendarService.bookSession(payload as any);
      return res.json({ success: true, result });
    } catch (e: any) {
      console.error("bookSession (service) error:", e);
      // If auth-specific error, ask frontend to prompt reauth
      if (
        e?.code === "INVALID_GRANT" ||
        /invalid_grant/i.test(e?.message ?? "")
      ) {
        return res.status(400).json({
          success: false,
          connected: false,
          error:
            "Google calendar authorization invalid or expired. Reauthorization required.",
        });
      }
      return res.status(500).json({
        success: false,
        error: e?.message ?? "Failed to book session",
      });
    }
  } catch (err: any) {
    console.error("bookSession error:", err);
    return res
      .status(500)
      .json({ success: false, error: err.message ?? "Failed to book session" });
  }
};
