// src/services/api.ts
import axios from "axios";
import { toast } from "@/components/ui/sonner";

const API_BASE =
  import.meta.env.VITE_API_URL || "https://c22d755b01d1a5.lhr.life";
const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
});

// getCounselorCalendar — simplified and robust: returns internal bookings only
export const getCounselorCalendar = async () => {
  try {
    // The previous implementation attempted to call /api/counselors/google/calendar
    // which doesn't exist on your server (caused 404). Instead we directly use the
    // counselor bookings route as the canonical source for the calendar data.
    const fallback = await getCounselorBookings();
    return {
      success: true,
      source: "db",
      internalBookings: fallback,
    };
  } catch (err: any) {
    console.warn("getCounselorCalendar backend failed:", err?.message ?? err);
    toast.error("Could not load calendar data from server");
    return { success: false, source: "db", internalBookings: [] };
  }
};

// Helper to set Authorization token (call this after login)
export const setAuthToken = (token?: string | null) => {
  if (token) {
    api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    if (typeof window !== "undefined") localStorage.setItem("token", token);
  } else {
    delete api.defaults.headers.common["Authorization"];
    if (typeof window !== "undefined") localStorage.removeItem("token");
  }
};

// On module init attempt to read persisted token. Be tolerant to older key `mindease_token`.
if (typeof window !== "undefined") {
  const persistedToken =
    localStorage.getItem("token") || localStorage.getItem("mindease_token");
  if (persistedToken) setAuthToken(persistedToken);
}

// --------------------- Counselors (from backend) ---------------------
const avatarFor = (name = "counselor") =>
  `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`;

const normalizeCounselor = (r: any, fallbackId?: number) => {
  const id = r?.counselor_id ?? r?.id ?? fallbackId ?? null;
  const name =
    r?.name ?? (r?.email ? r.email.split("@")[0] : `Counselor ${id}`);
  return {
    id,
    name,
    role: (r?.role ?? r?.user_role ?? r?.role_name ?? null) as string | null,
    specialty: r?.specialty ?? r?.speciality ?? null,
    avatar: avatarFor(name),
    email: r?.email ?? null,
    raw: r,
  };
};

export const getCounselors = async () => {
  try {
    const resp = await api.get("/api/counselors");
    const data = resp?.data;

    const rows: any[] =
      Array.isArray(data) && data.length > 0
        ? data
        : Array.isArray(data?.counselors)
        ? data.counselors
        : Array.isArray(data?.rows)
        ? data.rows
        : [];

    const mapped = rows
      .map((r: any, idx: number) => normalizeCounselor(r, idx + 1))
      .filter((c: any) => {
        const role =
          (c.role ?? c.raw?.role ?? c.raw?.user_role ?? "")
            .toString()
            .toLowerCase() || "";
        return role === "counselor";
      });

    return mapped;
  } catch (err) {
    console.warn("getCounselors backend failed:", err);
    toast.error("Could not load counselors from server");
    return [];
  }
};

export const getCounselorById = async (id: number) => {
  try {
    const resp = await api.get(`/api/counselors/${id}`);
    const data = resp?.data;
    const c = data?.counselor ?? data ?? null;
    if (!c) return null;
    return normalizeCounselor(c, id);
  } catch (err) {
    console.warn("getCounselorById backend failed:", err);
    toast.error("Could not load counselor details");
    return null;
  }
};

// Backwards-compatible alias names (so components still importing getTherapists work)
export const getTherapists = getCounselors;
export const getTherapistById = getCounselorById;

/**
 * getAvailableSlots
 * Calls the backend Google Calendar availability endpoint and returns an array of string labels
 * suitable for the UI (e.g., "09:00-10:00").
 *
 * Fallback: if google endpoint is not available or fails, it falls back to the old mock slots.
 */
export const getAvailableSlots = async (therapistId: number, date: string) => {
  // Try Google Calendar endpoint
  try {
    // Pass duration=60 (1 hour) to the backend
    const resp = await api.get("/api/google-calendar/available-slots", {
      params: { counselorId: therapistId, date, duration: 60 },
    });

    const data = resp?.data ?? {};
    // The service may return { slots: [...] } where each slot is { startISO, endISO, label } or strings.
    let slotsRaw: any[] = [];
    if (Array.isArray(data)) slotsRaw = data;
    else if (Array.isArray(data.slots)) slotsRaw = data.slots;
    else if (Array.isArray(data.result?.slots)) slotsRaw = data.result.slots;
    else if (Array.isArray(data.data)) slotsRaw = data.data;
    else if (Array.isArray(data?.availableSlots))
      slotsRaw = data.availableSlots;

    // Map to string labels the UI expects.
    const mapped = slotsRaw
      .map((s) => {
        if (!s) return "";
        if (typeof s === "string") return s;
        // prefer 'label'
        if (s.label) return s.label;
        // fallback: format start/end ISO to HH:mm or HH:mm-HH:mm
        if (s.startISO && s.endISO) {
          try {
            const start = new Date(s.startISO);
            const end = new Date(s.endISO);
            const fmt = (d: Date) =>
              d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
            return `${fmt(start)}-${fmt(end)}`;
          } catch (e) {
            return s.startISO;
          }
        }
        // as final fallback check common keys
        if (s.start && s.end) {
          try {
            const start = new Date(s.start);
            const end = new Date(s.end);
            const fmt = (d: Date) =>
              d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
            return `${fmt(start)}-${fmt(end)}`;
          } catch (e) {
            return s.start;
          }
        }
        return String(s);
      })
      .filter(Boolean);

    if (mapped.length > 0) return mapped;
    // if google endpoint returned empty array, return empty to UI
    return [];
  } catch (err) {
    // fallback to mock logic below
    console.warn(
      "getAvailableSlots: Google endpoint failed, falling back to mock slots:",
      err
    );
  }

  // ---- Legacy mock fallback (kept for resilience) ----
  await new Promise((r) => setTimeout(r, 300));
  // only hourly slots now for 1-hour duration
  const hours = [9, 10, 11, 13, 14, 15, 16];
  const availableHours = hours.filter((h) => (h + therapistId) % 3 !== 0);
  const slots: string[] = [];
  for (const hour of availableHours) {
    // only top-of-hour entries for 1-hour slots
    slots.push(`${hour}:00`);
  }
  return slots;
};

// localStorage key helper: works with numeric userId or email string
const APPT_KEY = (owner: string | number) =>
  `mindease_appointments_${String(owner)}`;
// access token storage key for guest emails
const ACCESS_TOKEN_KEY = (email: string) => `mindease_token_${String(email)}`;

/* ---------- Booking & Appointments (real + fallback to mock) ---------- */

export const bookAppointment = async (payload: {
  therapistId: number;
  date: string;
  time: string;
  userId?: string | number | null;
  notes?: string;
  fullName?: string;
  email?: string | null;
  year?: string;
  timezone?: string;
}) => {
  // Try Google Calendar booking endpoint first
  try {
    const body: any = {
      // student_id only set when there is a userId; otherwise we omit it (guest flow)
      student_id: payload.userId ? Number(payload.userId) : undefined,
      student_email: payload.email ?? null,
      counselor_id: payload.therapistId,
      booking_date: payload.date,
      booking_time: payload.time,
      // change default duration to 60 (1 hour)
      duration: 60,
      summary: `Counselling session with ${
        payload.fullName ?? payload.email ?? "student"
      }`,
      description: payload.notes ?? null,
      year_level: payload.year ?? null,
      additional_notes: payload.notes ?? null,
    };

    // Only include timezone if a timezone was explicitly passed in payload
    if (payload.timezone) body.timezone = payload.timezone;

    // Remove undefined student_id property if not present (guest flow)
    if (typeof body.student_id === "undefined") delete (body as any).student_id;

    const response = await api.post("/api/google-calendar/book-session", body);

    // shape can be { success: true, result: { booking: ..., googleEvent: ... } }
    if (
      response?.data?.success &&
      (response?.data?.result || response?.data?.booking)
    ) {
      // prefer booking object
      const booking =
        response.data.result?.booking ??
        response.data.booking ??
        response.data.result;
      return booking;
    }

    // Some implementations may return booking directly
    if (response?.data?.booking) return response.data.booking;
    if (response?.data?.result) return response.data.result;
    return response.data;
  } catch (err: any) {
    // If the endpoint is unavailable (404/501), fallback to old bookings endpoint; otherwise warn and fallback.
    console.warn(
      "bookAppointment: Google booking failed, falling back:",
      err?.message ?? err
    );
  }

  // Fallback: call legacy bookings endpoint (server-side booking without calendar)
  try {
    const bodyOld: any = {
      student_name: payload.fullName ?? null,
      student_email: payload.email ?? null,
      counselor_id: payload.therapistId,
      booking_date: payload.date,
      booking_time: payload.time,
      year_level: payload.year ?? null,
      additional_notes: payload.notes ?? null,
      include_calendar: false,
    };

    // Only include timezone if explicitly provided
    if (payload.timezone) bodyOld.timezone = payload.timezone;

    const response = await api.post("/api/bookings", bodyOld);

    if (response?.data?.success) {
      const token = response?.data?.access_token;
      if (token && payload.email && typeof window !== "undefined") {
        localStorage.setItem(ACCESS_TOKEN_KEY(payload.email), token);
        setAuthToken(token);
      }
      return response.data.booking || response.data;
    }
    console.warn(
      "Booking API returned non-success, falling back to mock",
      response?.data
    );
  } catch (err) {
    console.warn("bookAppointment backend error (falling back to mock):", err);
  }

  // fallback: create mock booking in localStorage (NO pseudo-token stored)
  await new Promise((r) => setTimeout(r, 700));
  const mockBooking = {
    booking_id: Date.now().toString(),
    student_name: payload.fullName || "Guest",
    student_email: payload.email || "unknown@example.com",
    counselor_id: payload.therapistId,
    booking_date: payload.date,
    booking_time: payload.time,
    year_level: payload.year || null,
    additional_notes: payload.notes ?? null,
    status: "pending",
    created_at: new Date().toISOString(),
    therapistId: payload.therapistId,
    date: payload.date,
    time: payload.time,
  };

  const ownerKey = payload.email ? payload.email : payload.userId ?? "guest";
  if (typeof window !== "undefined") {
    const key = APPT_KEY(ownerKey);
    const stored = localStorage.getItem(key);
    const arr = stored ? JSON.parse(stored) : [];
    arr.push(mockBooking);
    localStorage.setItem(key, JSON.stringify(arr));
  }

  return mockBooking;
};

export const getUserAppointments = async (owner: string | number) => {
  if (typeof owner === "string" && owner.includes("@")) {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem(ACCESS_TOKEN_KEY(owner));
      try {
        const resp = await api.post("/api/bookings/student/view", {
          student_email: owner,
          access_token: token,
        });
        if (resp?.data?.success) return resp.data.bookings;
        if (Array.isArray(resp?.data)) return resp.data;
        if (resp?.data?.bookings) return resp.data.bookings;
      } catch (err) {
        console.warn(
          "Protected student bookings fetch failed; falling back to localStorage:",
          err
        );
      }
    }

    if (typeof window === "undefined") return [];
    const stored = localStorage.getItem(APPT_KEY(owner));
    return stored ? JSON.parse(stored) : [];
  }

  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem(APPT_KEY(owner));
  return stored ? JSON.parse(stored) : [];
};

export const saveUserAppointment = async (
  owner: string | number,
  appointment: any
) => {
  if (typeof window === "undefined") return appointment;
  const key = APPT_KEY(owner);
  const stored = localStorage.getItem(key);
  const arr = stored ? JSON.parse(stored) : [];
  arr.push(appointment);
  localStorage.setItem(key, JSON.stringify(arr));
  return appointment;
};

export const getAllAppointments = async () => {
  try {
    const resp = await api.get("/api/bookings/admin");
    if (resp?.data?.success) return resp.data.bookings;
    if (Array.isArray(resp?.data)) return resp.data;
  } catch (err) {
    console.warn("getAllAppointments backend failed:", err);
  }

  await new Promise((r) => setTimeout(r, 600));
  return [
    {
      booking_id: "1001",
      therapistId: 1,
      therapistName: "Dr. Sarah Johnson",
      userId: "user123",
      userName: "John Smith",
      booking_date: "2025-05-15",
      booking_time: "10:00",
      status: "confirmed",
    },
    {
      booking_id: "1002",
      therapistId: 2,
      therapistName: "Dr. Michael Chen",
      userId: "user456",
      userName: "Emily Davis",
      booking_date: "2025-05-16",
      booking_time: "14:30",
      status: "confirmed",
    },
    {
      booking_id: "1003",
      therapistId: 3,
      therapistName: "Dr. Aisha Patel",
      userId: "user789",
      userName: "David Wilson",
      booking_date: "2025-05-17",
      booking_time: "11:00",
      status: "cancelled",
    },
  ];
};

export const getCounselorBookings = async () => {
  try {
    const resp = await api.get("/api/bookings/counselor");
    if (resp?.data?.success) return resp.data.bookings;
    if (Array.isArray(resp?.data)) return resp.data;
    if (resp?.data?.bookings) return resp.data.bookings;
  } catch (err: any) {
    console.warn(
      "getCounselorBookings backend failed, falling back to localStorage:",
      err?.message || err
    );
  }

  if (typeof window === "undefined") return [];
  const results: any[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key) continue;
    if (!key.startsWith("mindease_appointments_")) continue;
    try {
      const arr = JSON.parse(localStorage.getItem(key) || "[]");
      if (!Array.isArray(arr)) continue;
      for (const b of arr) {
        results.push(b);
      }
    } catch (e) {}
  }
  return results;
};

export const updateBookingStatus = async (
  bookingId: string | number,
  newStatus: string
) => {
  try {
    const resp = await api.patch(`/api/bookings/${bookingId}/status`, {
      status: newStatus,
    });
    if (resp?.data?.success) return resp.data.booking;
    if (resp?.data) return resp.data;
  } catch (err) {
    console.warn("updateBookingStatus backend failed:", err);
    // rethrow so callers can decide how to handle (and show error to user)
    throw err;
  }
  return { booking_id: bookingId, status: newStatus };
};

export const rescheduleBooking = async (
  bookingId: string | number,
  booking_date: string,
  booking_time: string
) => {
  try {
    const resp = await api.post(`/api/bookings/${bookingId}/reschedule`, {
      booking_date,
      booking_time,
    });
    if (resp?.data?.success) return resp.data.booking;
    if (resp?.data) return resp.data;
  } catch (err) {
    console.warn("rescheduleBooking backend failed:", err);
    throw err;
  }
};

export const exportBookings = async (): Promise<Blob> => {
  try {
    const resp = await api.get("/api/bookings/export", {
      responseType: "blob",
    });
    return resp.data as Blob;
  } catch (err) {
    console.warn("exportBookings backend failed:", err);
    throw err;
  }
};

/* ---------- Other helpers left unchanged ---------- */
const MOOD_KEY = (userId: string | number) => `mindease_mood_${userId}`;

export const getMoodEntries = async (userId: string | number) => {
  await new Promise((r) => setTimeout(r, 200));
  try {
    if (typeof window === "undefined") return [];
    const stored = localStorage.getItem(MOOD_KEY(userId));
    return stored ? JSON.parse(stored) : [];
  } catch (err) {
    console.warn("getMoodEntries parse error:", err);
    return [];
  }
};

export const saveMoodEntry = async (userId: string | number, entry: any) => {
  const normalized = {
    date: entry.date,
    mood: Number(entry.mood),
    anxiety: Number(entry.anxiety),
    sleep: Number(entry.sleep),
    notes: entry.notes ?? "",
    timestamp: new Date().toISOString(),
  };
  const entries = await getMoodEntries(userId);
  entries.push(normalized);
  if (typeof window !== "undefined")
    localStorage.setItem(MOOD_KEY(userId), JSON.stringify(entries));
  return normalized;
};

export type ApiUser = {
  id: number | string;
  name: string;
  email: string;
  avatar?: string;
  role?: string;
  status?: string;
  lastActive?: string | null;
  registeredDate?: string | null;
};

export const createUser = async (payload: {
  name: string;
  email: string;
  role: "admin" | "counselor" | "student" | string;
}) => {
  try {
    const resp = await api.post("/api/admin/users", {
      name: payload.name,
      email: payload.email,
      role: payload.role,
    });
    if (resp?.data?.success) return resp.data.user ?? resp.data;
    if (resp?.data?.user) return resp.data.user;
    return resp.data;
  } catch (err: any) {
    console.error("createUser backend failed:", err?.response ?? err);
    // bubble up error for caller to show toast
    throw err;
  }
};

export const getUsers = async (limit = 50): Promise<ApiUser[]> => {
  try {
    // call the admin users API which returns merged students + counselors
    const resp = await api.get("/api/admin/users", { params: { limit } });
    const data = resp?.data;
    if (data?.success && Array.isArray(data.users)) {
      return data.users;
    }
    if (Array.isArray(data)) return data;
    return [];
  } catch (err) {
    console.warn("getUsers backend failed:", err);
    toast.error("Could not load users from server");
    return [];
  }
};

export const updateUserStatus = async (
  role: "student" | "counselor" | "admin" | string,
  id: string | number,
  status: "active" | "inactive"
) => {
  // role should be "student" or "counselor" when called from UI (admin users)
  const r = role === "user" ? "student" : role;
  const resp = await api.patch(`/api/admin/users/${r}/${id}/status`, {
    status,
  });
  return resp.data;
};

export const deleteUser = async (role: string, id: string | number) => {
  const r = role === "user" ? "student" : role;
  const resp = await api.delete(`/api/admin/users/${r}/${id}`);
  return resp.data;
};

export const getSystemAnalytics = async () => {
  try {
    const resp = await api.get("/api/admin/analytics");
    if (resp?.data?.success) return resp.data.analytics;
    if (resp?.data) return resp.data;
  } catch (err) {}
  await new Promise((r) => setTimeout(r, 250));
  return {
    userCount: 1240,
    activeUsers: 312,
    blogPosts: 142,
    communityPosts: 980,
    userGrowth: [
      { month: "Jan", users: 40 },
      { month: "Feb", users: 55 },
      { month: "Mar", users: 65 },
    ],
    moodDistribution: [
      { name: "Mon", excellent: 50, good: 80, neutral: 40, poor: 15, bad: 5 },
    ],
    appointments: { completed: 480, upcoming: 120, cancelled: 40, total: 640 },
  };
};

export default api;
