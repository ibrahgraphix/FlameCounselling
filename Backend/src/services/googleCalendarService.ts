// src/services/googleCalendarService.ts
import { google } from "googleapis";
import dotenv from "dotenv";
import crypto from "crypto";
import counselorRepository from "../repositories/counselorRepository";
import bookingRepository from "../repositories/bookingRepository";
import { studentRepository } from "../repositories/studentRepository";
import { DateTime } from "luxon";
import { generateTimeSlots, BusyRange } from "../utils/timeUtils";
import pool from "../config/db";

// import canonical scopes from authService so we don't duplicate scope definitions
import { OAUTH_SCOPES } from "./authService";

dotenv.config();

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI!;
const DEFAULT_TIMEZONE = process.env.DEFAULT_TIMEZONE || "Asia/Kolkata";

function buildOAuthClient(redirectUri?: string) {
  return new google.auth.OAuth2(
    CLIENT_ID,
    CLIENT_SECRET,
    redirectUri || REDIRECT_URI
  );
}

function expiryToISOString(expiry: any): string | null {
  if (expiry === null || typeof expiry === "undefined") return null;
  if (typeof expiry === "string") {
    const maybeNum = Number(expiry);
    if (!isNaN(maybeNum)) return new Date(maybeNum).toISOString();
    const d = new Date(expiry);
    if (!isNaN(d.getTime())) return d.toISOString();
    return String(expiry);
  }
  if (typeof expiry === "number") {
    return new Date(expiry).toISOString();
  }
  try {
    const n = Number(expiry);
    if (!isNaN(n)) return new Date(n).toISOString();
  } catch (e) {}
  return null;
}

/**
 * Parse many human time formats into Luxon DateTime in tz.
 */
function parseBookingStartDateTime(
  bookingDate: string,
  bookingTimeRaw: string,
  tz: string
): DateTime | null {
  if (!bookingDate || !bookingTimeRaw) return null;

  let s = String(bookingTimeRaw)
    .replace(/\u2013|\u2014|\u2015/g, "-")
    .replace(/\u202F|\u00A0/g, " ")
    .trim();

  if (s.includes("-")) {
    const parts = s.split("-");
    if (parts.length > 0) s = parts[0].trim();
  }

  if (s.includes("T") || /Z$/.test(s) || /\+\d{2}:\d{2}/.test(s)) {
    const dtIso = DateTime.fromISO(s, { zone: tz });
    if (dtIso.isValid) return dtIso;
  }

  const reTime = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/;
  const m = s.match(reTime);
  if (m) {
    const hour = Number(m[1]);
    const minute = Number(m[2]);
    const second = m[3] ? Number(m[3]) : 0;
    const dateParts = bookingDate.split("-").map((p) => Number(p));
    if (dateParts.length >= 3 && dateParts.every((n) => !Number.isNaN(n))) {
      const [year, month, day] = dateParts;
      const dt = DateTime.fromObject(
        { year, month, day, hour, minute, second, millisecond: 0 },
        { zone: tz }
      );
      if (dt.isValid) return dt;
    } else {
      const isoAttempt = DateTime.fromISO(`${bookingDate}T${s}`, { zone: tz });
      if (isoAttempt.isValid) return isoAttempt;
    }
  }

  const ampmFormats = [
    "h:mm a",
    "hh:mm a",
    "h:mm:ss a",
    "hh:mm:ss a",
    "h:mma",
    "hh:mma",
    "h:mm",
  ];
  for (const fmt of ampmFormats) {
    const dt = DateTime.fromFormat(s, fmt, { zone: tz });
    if (dt.isValid) {
      const dateParts = bookingDate.split("-").map((p) => Number(p));
      if (dateParts.length >= 3 && dateParts.every((n) => !Number.isNaN(n))) {
        const [year, month, day] = dateParts;
        const result = dt.set({ year, month, day });
        if (result.isValid) return result;
      } else {
        return dt;
      }
    }
  }

  try {
    const naive = new Date(`${bookingDate} ${s}`);
    if (!isNaN(naive.getTime())) {
      const dt = DateTime.fromJSDate(naive, { zone: tz });
      if (dt.isValid) return dt;
    }
  } catch (e) {}

  return null;
}

class GoogleAuthError extends Error {
  code?: string;
  cause?: any;
  constructor(message: string, code?: string, cause?: any) {
    super(message);
    this.name = "GoogleAuthError";
    this.code = code;
    this.cause = cause;
  }
}

const GoogleCalendarService = {
  generateAuthUrl: async (counselorId: number) => {
    const oauth2Client = buildOAuthClient();
    const state = crypto.randomBytes(16).toString("hex");
    await counselorRepository.setGoogleOAuthState(counselorId, state);

    // use the canonical scopes from authService
    const url = oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: OAUTH_SCOPES,
      prompt: "consent",
      state,
    });

    return { url, state };
  },

  exchangeCodeAndStoreTokens: async (args: {
    code: string;
    counselorId?: number;
    state?: string;
  }) => {
    const { code, counselorId, state } = args;
    let foundCounselor = null;
    if (!counselorId && !state)
      throw new Error("Either counselorId or state must be provided");
    if (state) {
      foundCounselor = await counselorRepository.findCounselorByOAuthState(
        state
      );
      if (!foundCounselor) throw new Error("Invalid OAuth state");
    }
    const cid = counselorId ?? foundCounselor.counselor_id;
    const oauth2Client = buildOAuthClient();
    const tokenResp = await oauth2Client.getToken(code);
    const tokens = tokenResp.tokens;
    oauth2Client.setCredentials(tokens);

    const counselorRow = await counselorRepository.getCounselorById(cid);
    const calendarId = counselorRow?.email ?? null;

    const expiryIso = expiryToISOString(
      tokens.expiry_date ?? oauth2Client.credentials.expiry_date
    );
    await counselorRepository.storeGoogleTokens(
      cid,
      tokens.access_token ?? null,
      tokens.refresh_token ?? null,
      expiryIso,
      calendarId
    );

    // Indicate to caller whether a refresh token was obtained (useful in UI to prompt reauth)
    return { saved: true, hasRefreshToken: !!tokens.refresh_token };
  },

  getAuthorizedCalendarClient: async (counselorId: number) => {
    const counselor = await counselorRepository.getCounselorById(counselorId);
    if (!counselor) throw new Error("Counselor not found");

    // If counselor does not have a stored refresh token, we must reauthorize
    if (!counselor.google_refresh_token) {
      throw new GoogleAuthError(
        "Counselor has not connected Google Calendar or refresh token missing",
        "NO_REFRESH_TOKEN"
      );
    }

    const oauth2Client = buildOAuthClient();
    oauth2Client.setCredentials({
      refresh_token: counselor.google_refresh_token,
      access_token: counselor.google_access_token ?? undefined,
      expiry_date: counselor.google_token_expiry
        ? Number(new Date(counselor.google_token_expiry).valueOf())
        : undefined,
    });
    try {
      // getAccessToken will attempt refresh if necessary.
      await oauth2Client.getAccessToken();
      // save latest tokens if changed
      const cred = oauth2Client.credentials;
      const newAccess = cred.access_token ?? null;
      const newExpiryIso = expiryToISOString(
        cred.expiry_date ?? cred.expiry_date
      );
      if (newAccess || newExpiryIso) {
        await counselorRepository.storeGoogleTokens(
          counselor.counselor_id,
          newAccess,
          counselor.google_refresh_token ?? null,
          newExpiryIso,
          counselor.google_calendar_id ?? null
        );
      }
    } catch (e: any) {
      const msg =
        (e?.message && String(e.message)) || "Google token refresh failed";
      // detect typical invalid_grant
      if (
        (e?.response?.data &&
          String(e.response.data.error) === "invalid_grant") ||
        /invalid_grant/i.test(msg)
      ) {
        throw new GoogleAuthError(
          "Google refresh token invalid or revoked (invalid_grant). Reauthorization required.",
          "INVALID_GRANT",
          e
        );
      }
      // Other auth errors
      throw new GoogleAuthError("Google auth failure: " + msg, "AUTH_ERROR", e);
    }

    const calendar = google.calendar({ version: "v3", auth: oauth2Client });
    return { calendar, oauth2Client, counselor };
  },

  /**
   * durationMinutes default changed to 60 (1 hour slots)
   */
  getAvailableSlots: async (
    counselorId: number,
    dateStr: string,
    durationMinutes = 60
  ) => {
    // getAuthorizedCalendarClient will throw GoogleAuthError on auth problems
    const { calendar, counselor } =
      await GoogleCalendarService.getAuthorizedCalendarClient(counselorId);

    const timezone = counselor.timezone ?? DEFAULT_TIMEZONE;

    const dayStart = DateTime.fromISO(dateStr, { zone: timezone })
      .startOf("day")
      .toISO();
    const dayEnd = DateTime.fromISO(dateStr, { zone: timezone })
      .endOf("day")
      .toISO();

    // wrap remote call with try/catch to produce helpful errors
    let fbRes;
    try {
      const freebusyReq = {
        resource: {
          timeMin: dayStart,
          timeMax: dayEnd,
          timeZone: timezone,
          items: [{ id: counselor.google_calendar_id ?? counselor.email }],
        },
      };
      fbRes = await calendar.freebusy.query(freebusyReq as any);
    } catch (e: any) {
      // If the error is due to invalid_grant it will have been thrown earlier by getAuthorizedCalendarClient.
      // Otherwise surface a descriptive message.
      throw new Error(
        "Failed to query Google freebusy: " +
          ((e && e.message) || String(e) || "unknown")
      );
    }

    const calendarIdUsed = counselor.google_calendar_id ?? counselor.email;
    const busy = fbRes.data.calendars?.[calendarIdUsed]?.busy ?? [];

    const busyRanges: BusyRange[] = (busy || []).map((b: any) => {
      const s = DateTime.fromISO(b.start).setZone(timezone).toISO();
      const e = DateTime.fromISO(b.end).setZone(timezone).toISO();
      return { start: s, end: e };
    });

    const workingStart = counselor.work_start_time ?? "09:00";
    const workingEnd = counselor.work_end_time ?? "17:00";

    const slots = generateTimeSlots(
      dateStr,
      workingStart,
      workingEnd,
      durationMinutes,
      timezone,
      busyRanges
    );

    return { connected: true, slots };
  },

  /**
   * bookSession default duration changed to 60 minutes
   */
  bookSession: async (payload: {
    student_id?: number | null;
    student_email?: string | null;
    counselor_id: number;
    booking_date: string;
    booking_time: string;
    duration?: number;
    summary?: string;
    description?: string | null;
    timezone?: string | null;
    year_level?: string | null;
    additional_notes?: string | null;
  }) => {
    const {
      student_id,
      student_email,
      counselor_id,
      booking_date,
      booking_time,
      // default to 60 minutes if not provided
      duration = 60,
      summary,
      description,
      timezone,
      year_level,
      additional_notes,
    } = payload;

    if (!counselor_id || !booking_date || !booking_time) {
      throw new Error(
        "counselor_id, booking_date and booking_time are required"
      );
    }

    // getAuthorizedCalendarClient will throw GoogleAuthError if auth is broken
    const { calendar, counselor } =
      await GoogleCalendarService.getAuthorizedCalendarClient(counselor_id);

    const tz = timezone ?? counselor.timezone ?? DEFAULT_TIMEZONE;

    const startDT = parseBookingStartDateTime(booking_date, booking_time, tz);
    if (!startDT || !startDT.isValid) {
      throw new Error(
        "Invalid booking_time format, expected HH:mm or HH:mm:ss or common human formats (e.g. '9:00 AM' or '09:00-09:30')"
      );
    }

    const endDT = startDT.plus({ minutes: duration });

    // Check freebusy for conflicts
    let fbRes;
    try {
      fbRes = await calendar.freebusy.query({
        resource: {
          timeMin: startDT.toISO(),
          timeMax: endDT.toISO(),
          timeZone: tz,
          items: [{ id: counselor.google_calendar_id ?? counselor.email }],
        },
      });
    } catch (e: any) {
      throw new Error("Failed to query Google freebusy: " + (e?.message ?? e));
    }

    const calId = counselor.google_calendar_id ?? counselor.email;
    const busy = fbRes.data.calendars?.[calId]?.busy ?? [];
    if (Array.isArray(busy) && busy.length > 0) {
      throw new Error("Selected slot is no longer available");
    }

    const event: any = {
      summary:
        summary ?? `Counselling session with ${student_email ?? "student"}`,
      description: description ?? additional_notes ?? "",
      start: { dateTime: startDT.toISO(), timeZone: tz },
      end: { dateTime: endDT.toISO(), timeZone: tz },
      attendees: [{ email: counselor.email }],
      reminders: { useDefault: true },
    };
    if (student_email) event.attendees.push({ email: student_email });

    // Create the event; catch and surface Google API errors
    let created;
    try {
      created = await calendar.events.insert({
        calendarId: calId,
        resource: event,
        sendUpdates: "all",
      });
    } catch (e: any) {
      throw new Error("Google event creation failed: " + (e?.message ?? e));
    }
    const googleEvent = created.data;

    // Resolve or create student row
    let finalStudentId: number | null = null;
    try {
      if (typeof student_id !== "undefined" && student_id !== null) {
        finalStudentId = student_id;
      } else if (student_email) {
        const found = await studentRepository.findByEmail(student_email);
        if (found && found.student_id) {
          finalStudentId = found.student_id;
        } else {
          const guestName =
            (student_email && student_email.split("@")[0]) || "Guest Student";
          const createdStudent = await studentRepository.create(
            guestName,
            student_email
          );
          finalStudentId = createdStudent.student_id;
        }
      } else {
        throw new Error("student_id or student_email required");
      }
    } catch (err) {
      throw new Error("studentRepository failure: " + (err as any).message);
    }

    // Create booking row in DB
    const bookingRow = await bookingRepository.createBooking(
      finalStudentId,
      counselor_id,
      booking_date,
      startDT.toFormat("HH:mm:ss"),
      year_level ?? null,
      additional_notes ?? null
    );

    // Try to store google event id (non-fatal)
    try {
      if (
        bookingRow &&
        googleEvent?.id &&
        typeof bookingRepository.updateGoogleEventId === "function"
      ) {
        await (bookingRepository as any).updateGoogleEventId(
          bookingRow.booking_id,
          googleEvent.id
        );
      }
    } catch (e) {
      console.warn("Could not persist google event id to booking row:", e);
    }

    const confirmed = await bookingRepository.updateBookingStatus(
      bookingRow.booking_id,
      "confirmed"
    );

    return { booking: confirmed ?? bookingRow, googleEvent };
  },

  rescheduleEventForBooking: async (
    bookingIdOrRow: any,
    booking_date: string,
    booking_time: string,
    durationMinutes = 60
  ) => {
    try {
      // Resolve booking row if id provided
      let bookingRow: any = null;
      if (typeof bookingIdOrRow === "object" && bookingIdOrRow !== null) {
        bookingRow = bookingIdOrRow;
      } else {
        // attempt to use bookingRepository.getBookingById if available
        if (typeof (bookingRepository as any).getBookingById === "function") {
          bookingRow = await (bookingRepository as any).getBookingById(
            bookingIdOrRow
          );
        } else {
          throw new Error(
            "bookingRepository.getBookingById not available to fetch booking row"
          );
        }
      }

      if (!bookingRow) {
        return { success: false, reason: "booking_not_found" };
      }

      const counselorId =
        Number(bookingRow.counselor_id ?? bookingRow.therapistId) || null;
      if (!counselorId) {
        return { success: false, reason: "missing_counselor_id" };
      }

      const { calendar, counselor } =
        await GoogleCalendarService.getAuthorizedCalendarClient(counselorId);
      const tz = counselor.timezone ?? DEFAULT_TIMEZONE;
      const calId = counselor.google_calendar_id ?? counselor.email;

      // Parse new start/end
      const newStartDT = parseBookingStartDateTime(
        booking_date,
        booking_time,
        tz
      );
      if (!newStartDT || !newStartDT.isValid) {
        return { success: false, reason: "invalid_new_start_time" };
      }
      const newEndDT = newStartDT.plus({ minutes: durationMinutes });

      // Check freebusy for new slot (to avoid conflicting with other events)
      const fb = await calendar.freebusy.query({
        resource: {
          timeMin: newStartDT.toISO(),
          timeMax: newEndDT.toISO(),
          timeZone: tz,
          items: [{ id: calId }],
        },
      });
      const busy = fb.data.calendars?.[calId]?.busy ?? [];
      if (Array.isArray(busy) && busy.length > 0) {
      }

      // Attempt to find existing event id
      let eventId: string | null =
        bookingRow.google_event_id ??
        bookingRow.googleEventId ??
        bookingRow.google_eventid ??
        null;

      // If event id not found, try to search events around the old booking start (or near new time)
      if (!eventId) {
        // build a search window: from newStart - 1 day to newEnd + 1 day
        const windowStart = newStartDT.minus({ days: 1 }).toISO();
        const windowEnd = newEndDT.plus({ days: 1 }).toISO();

        // Prefer searching by student_email if present
        const q =
          bookingRow.student_email ?? String(bookingRow.booking_id ?? "");

        const eventsRes = await calendar.events.list({
          calendarId: calId,
          timeMin: windowStart,
          timeMax: windowEnd,
          singleEvents: true,
          orderBy: "startTime",
          // q may be undefined; google accepts undefined
          q,
          maxResults: 50,
        });

        const items: any[] = eventsRes?.data?.items ?? [];

        // Try to match event by attendee email or by summary containing booking id or student name
        const match = items.find((ev) => {
          if (!ev) return false;
          const attendees = ev.attendees ?? [];
          if (
            attendees.some(
              (a: any) =>
                a?.email &&
                bookingRow.student_email &&
                a.email.toLowerCase() === bookingRow.student_email.toLowerCase()
            )
          )
            return true;
          if (
            ev.summary &&
            bookingRow.booking_id &&
            String(ev.summary).includes(String(bookingRow.booking_id))
          )
            return true;
          if (
            ev.summary &&
            bookingRow.student_name &&
            String(ev.summary)
              .toLowerCase()
              .includes(String(bookingRow.student_name).toLowerCase())
          )
            return true;
          return false;
        });

        if (match && match.id) {
          eventId = match.id;
        }
      }

      // If we still don't have an event id, optionally create a new event (fallback)
      if (!eventId) {
        // build a basic event similar to bookSession
        const event: any = {
          summary: `Counselling session with ${
            bookingRow.student_email ?? "student"
          }`,
          description: bookingRow.additional_notes ?? "",
          start: { dateTime: newStartDT.toISO(), timeZone: tz },
          end: { dateTime: newEndDT.toISO(), timeZone: tz },
          attendees: [{ email: counselor.email }],
          reminders: { useDefault: true },
        };
        if (bookingRow.student_email)
          event.attendees.push({ email: bookingRow.student_email });

        const created = await calendar.events.insert({
          calendarId: calId,
          resource: event,
          sendUpdates: "all",
        });

        const createdEvent = created.data;
        // attempt to persist google event id back to booking row if repository supports it
        try {
          if (
            createdEvent?.id &&
            typeof bookingRepository.updateGoogleEventId === "function"
          ) {
            await (bookingRepository as any).updateGoogleEventId(
              bookingRow.booking_id,
              createdEvent.id
            );
          }
        } catch (e) {
          console.warn(
            "Could not persist new google event id to booking row:",
            e
          );
        }

        return {
          success: true,
          createdNewEvent: true,
          googleEvent: createdEvent,
        };
      }
      try {
        const existingGet = await calendar.events.get({
          calendarId: calId,
          eventId,
        });

        const evt = existingGet.data;
        const fb2 = await calendar.freebusy.query({
          resource: {
            timeMin: newStartDT.toISO(),
            timeMax: newEndDT.toISO(),
            timeZone: tz,
            items: [{ id: calId }],
          },
        });
        const busy2 = fb2.data.calendars?.[calId]?.busy ?? [];
        const patched = await calendar.events.patch({
          calendarId: calId,
          eventId,
          resource: {
            start: { dateTime: newStartDT.toISO(), timeZone: tz },
            end: { dateTime: newEndDT.toISO(), timeZone: tz },
          },
          sendUpdates: "all",
        });

        return {
          success: true,
          googleEvent: patched.data,
          updatedEventId: eventId,
        };
      } catch (e) {
        console.warn("Failed to fetch/patch existing google event:", e);
        // As a fallback attempt, create a new event (and attempt to link it)
        try {
          const fallbackEvent = {
            summary: `Counselling session with ${
              bookingRow.student_email ?? "student"
            }`,
            description: bookingRow.additional_notes ?? "",
            start: { dateTime: newStartDT.toISO(), timeZone: tz },
            end: { dateTime: newEndDT.toISO(), timeZone: tz },
            attendees: [{ email: counselor.email }],
            reminders: { useDefault: true },
          };
          if (bookingRow.student_email)
            fallbackEvent.attendees.push({ email: bookingRow.student_email });

          const created2 = await calendar.events.insert({
            calendarId: calId,
            resource: fallbackEvent,
            sendUpdates: "all",
          });
          const createdEvent2 = created2.data;
          // attempt to store created event id
          try {
            if (
              createdEvent2?.id &&
              typeof bookingRepository.updateGoogleEventId === "function"
            ) {
              await (bookingRepository as any).updateGoogleEventId(
                bookingRow.booking_id,
                createdEvent2.id
              );
            }
          } catch (ee) {
            console.warn("Could not persist fallback google event id:", ee);
          }

          return {
            success: true,
            createdNewEvent: true,
            googleEvent: createdEvent2,
          };
        } catch (ee) {
          console.error("Failed to create fallback google event:", ee);
          return {
            success: false,
            reason: "google_update_failed",
            error: String(ee),
          };
        }
      }
    } catch (err: any) {
      console.error("rescheduleEventForBooking error:", err);
      return {
        success: false,
        reason: "exception",
        error: err?.message ?? String(err),
      };
    }
  },
};

export default GoogleCalendarService;
