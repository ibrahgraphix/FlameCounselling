// src/pages/admin/Calendar.tsx
import React, { useEffect, useState, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Calendar as CalendarIcon, Loader2, Check } from "lucide-react";
import api, {
  getCounselorCalendar,
  getCounselors,
  getCounselorById,
  getCounselorBookings,
} from "@/services/api";
import { toast } from "@/components/ui/sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useDetectDarkMode } from "@/components/ui/card";

import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import listPlugin from "@fullcalendar/list";

type Booking = {
  booking_id?: string | number;
  student_name?: string;
  student_email?: string;
  counselor_id?: number;
  counselor_name?: string;
  booking_date?: string; // "YYYY-MM-DD"
  booking_time?: string; // "HH:MM:SS"
  status?: string;
  created_at?: string | null;
  updated_at?: string | null;
  [k: string]: any;
};

type CounselorInfo = {
  counselor_id?: number;
  counselorId?: number;
  id?: number;
  name?: string;
  email?: string;
  google_connected?: boolean | null;
  raw?: any;
  [k: string]: any;
};

const parseTimeParts = (timeStr: string | null) => {
  if (!timeStr) return null;
  const t = timeStr.trim();
  const m = t.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm)?$/i);
  if (!m) return null;

  let hours = Number(m[1]);
  const minutes = Number(m[2]);
  const seconds = m[3] ? Number(m[3]) : 0;
  const ampm = m[4] ? m[4].toLowerCase() : null;

  if (ampm) {
    if (ampm === "pm" && hours < 12) hours += 12;
    if (ampm === "am" && hours === 12) hours = 0;
  }

  return {
    hours: Math.max(0, Math.min(23, hours)),
    minutes: Math.max(0, Math.min(59, minutes)),
    seconds: Math.max(0, Math.min(59, seconds)),
  };
};

const localIsoNoZone = (d: Date) => {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    d.getFullYear() +
    "-" +
    pad(d.getMonth() + 1) +
    "-" +
    pad(d.getDate()) +
    "T" +
    pad(d.getHours()) +
    ":" +
    pad(d.getMinutes()) +
    ":" +
    pad(d.getSeconds())
  );
};

const parseDateTime = (
  dateStr?: string | null,
  timeStr?: string | null
): Date | null => {
  if (!dateStr) return null;
  const makeLocal = (y: number, m: number, d: number, h = 0, min = 0, s = 0) =>
    new Date(y, m - 1, d, h, min, s, 0);

  const simpleDateMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (simpleDateMatch) {
    const y = Number(simpleDateMatch[1]);
    const mo = Number(simpleDateMatch[2]);
    const da = Number(simpleDateMatch[3]);
    const timeParts = parseTimeParts(timeStr ?? null);
    if (timeParts)
      return makeLocal(
        y,
        mo,
        da,
        timeParts.hours,
        timeParts.minutes,
        timeParts.seconds
      );
    return makeLocal(y, mo, da);
  }

  const fallback = new Date(dateStr);
  if (!isNaN(fallback.getTime())) {
    const timeParts = parseTimeParts(timeStr ?? null);
    if (timeParts)
      return new Date(
        fallback.getFullYear(),
        fallback.getMonth(),
        fallback.getDate(),
        timeParts.hours,
        timeParts.minutes,
        timeParts.seconds
      );
    return fallback;
  }

  return null;
};

const CalendarPage: React.FC = () => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [counselor, setCounselor] = useState<CounselorInfo | null>(null);
  const [refreshKey, setRefreshKey] = useState<number>(0);
  const [checkingConnect, setCheckingConnect] = useState<boolean>(false);

  const isDark = useDetectDarkMode();

  // theme
  const PRIMARY = "#1e3a8a";
  const SECONDARY = "#3b82f6";
  const GRADIENT = "linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)";

  /**
   * Prefer the currently-authenticated user if they are a counselor.
   * Otherwise fall back to using bookings to resolve counselor or
   * using the first counselor from getCounselors().
   */
  const resolveCounselorForUI = async (existingBookings: Booking[]) => {
    // 1) If the signed-in user exists and their role is counselor, prefer them
    try {
      if (user && (user.role ?? "").toString().toLowerCase() === "counselor") {
        // normalize to shape expected by UI
        return {
          id: Number(user.id ?? user.id),
          name:
            user.name ?? (user as any).full_name ?? user.email ?? "Counselor",
          email: user.email ?? undefined,
          google_connected:
            // try to preserve google_connected if present in user.raw or user.google_connected
            (user as any).google_connected ??
            (user as any).raw?.google_connected ??
            null,
          raw: user,
        } as CounselorInfo;
      }
    } catch (e) {
      // ignore and continue to fallback
    }

    // 2) If bookings exist, attempt to use counselor_id from the first booking
    if (existingBookings && existingBookings.length > 0) {
      const possibleId = existingBookings[0].counselor_id;
      if (possibleId) {
        try {
          const c = await getCounselorById(possibleId);
          if (c) return c;
        } catch (e) {
          // ignore and continue to fallback
        }
      }
    }

    // 3) fallback to the first counselor in the system
    try {
      const all = await getCounselors();
      if (all && all.length > 0) {
        return all[0];
      }
    } catch (e) {
      // ignore
    }

    return null;
  };

  const loadCalendar = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getCounselorCalendar();

      const rows: any[] =
        Array.isArray(data.internalBookings) && data.internalBookings.length > 0
          ? data.internalBookings
          : Array.isArray(data.bookings)
          ? data.bookings
          : Array.isArray(data) && data.length
          ? data
          : [];

      setBookings(rows);

      try {
        const resolved = await resolveCounselorForUI(rows);
        setCounselor(resolved);
      } catch (e) {
        setCounselor(null);
      }
    } catch (err) {
      console.error("Failed to load counselor calendar:", err);
      toast.error("Could not load appointments");
      setBookings([]);
      setCounselor(null);
    } finally {
      setLoading(false);
    }
  }, [refreshKey, user]);

  useEffect(() => {
    let mounted = true;
    const fetch = async () => {
      if (!mounted) return;
      await loadCalendar();

      // try to proactively fetch counselor details if not present
      try {
        const idFromUser =
          user && (user.role ?? "").toString().toLowerCase() === "counselor"
            ? Number((user as any).id ?? (user as any).counselor_id ?? null)
            : null;
        if (idFromUser) {
          const fetched = await getCounselorById(idFromUser);
          if (fetched) setCounselor((c) => ({ ...(c ?? {}), ...fetched }));
        }
      } catch (e) {
        // ignore
      }
    };
    fetch();
    return () => {
      mounted = false;
    };
  }, [loadCalendar, refreshKey]);

  const isCanceled = (b: Booking) =>
    String(b.status ?? "").toLowerCase() === "canceled" ||
    String(b.status ?? "").toLowerCase() === "cancelled";

  const total = bookings.length;
  const upcoming = bookings.filter((b) => {
    const dt = parseDateTime(b.booking_date!, b.booking_time ?? null);
    if (!dt) return !isCanceled(b);
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    return dt >= startOfDay && !isCanceled(b);
  }).length;
  const completed = bookings.filter((b) => {
    const dt = parseDateTime(b.booking_date!, b.booking_time ?? null);
    if (!dt) return false;
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);
    return dt < endOfToday && !isCanceled(b);
  }).length;

  const mapBookingToFC = (b: Booking) => {
    const startDate = parseDateTime(b.booking_date!, b.booking_time ?? null);
    if (!startDate) return null;
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
    const status = (b.status ?? "pending").toLowerCase();
    const baseTitle = b.student_name ?? b.student_email ?? "Appointment";
    const title = isCanceled(b) ? `${baseTitle} (Cancelled)` : baseTitle;

    const backgroundColor = isCanceled(b)
      ? isDark
        ? "#2b0f0f"
        : "#fff0f0"
      : isDark
      ? "#071033"
      : "#ffffff";
    const borderColor = isCanceled(b)
      ? isDark
        ? "#7f1d1d"
        : "#ef4444"
      : PRIMARY;
    const textColor = isCanceled(b)
      ? isDark
        ? "#fca5a5"
        : "#7f1d1d"
      : PRIMARY;

    return {
      id: String(
        b.booking_id ?? `${b.booking_date}_${b.booking_time}_${b.student_email}`
      ),
      title,
      start: localIsoNoZone(startDate),
      end: localIsoNoZone(endDate),
      extendedProps: {
        raw: b,
        status,
        student_email: b.student_email,
        counselor_id: b.counselor_id,
      },
      backgroundColor,
      borderColor,
      textColor,
      classNames: [isCanceled(b) ? "fc-event-cancelled" : "fc-event-normal"],
    };
  };

  const buildEvents = () => {
    const internalEvents = bookings
      .map((b) => mapBookingToFC(b))
      .filter(Boolean) as any[];
    internalEvents.sort(
      (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
    );
    return internalEvents;
  };

  const events = buildEvents();

  const handleEventClick = (info: any) => {
    const bookingId =
      info.event.extendedProps?.raw?.booking_id ?? info.event.id ?? null;
    if (bookingId) window.location.assign(`/admin/bookings/${bookingId}`);
  };

  /**
   * Start the Connect flow:
   * - ask server for auth URL (server should include counselorId param)
   * - open OAuth in new tab and poll the counselor record until google_connected === true
   * Note: clicking is required only when the counselor has not previously connected their Google account.
   */
  const handleConnectGoogle = async () => {
    let counselorId =
      Number(
        counselor?.counselor_id ??
          counselor?.counselorId ??
          counselor?.id ??
          counselor?.raw?.counselor_id ??
          counselor?.raw?.id
      ) || null;

    if (!counselorId && bookings && bookings.length > 0)
      counselorId = Number(bookings[0].counselor_id) || null;

    if (!counselorId) {
      toast.error(
        "Could not determine counselor id. Please reload or select a counselor."
      );
      return;
    }

    try {
      setCheckingConnect(true);
      const resp = await api.get("/api/google-calendar/auth-url", {
        params: { counselorId },
      });
      const url = resp?.data?.url ?? resp?.data?.authUrl ?? resp?.data;
      if (!url) {
        toast.error(
          "Server did not return a Google authorization URL. Check server logs."
        );
        return;
      }

      // Open OAuth consent in a new tab so user doesn't lose current session
      window.open(String(url), "_blank", "noopener,noreferrer");
      toast.info(
        "Authorization tab opened. Complete consent and return to this page."
      );

      // Poll counselor record until server updates google_connected
      const pollIntervalMs = 2500; // 2.5s
      const maxAttempts = 20; // ~50s total

      for (let i = 0; i < maxAttempts; i++) {
        await new Promise((r) => setTimeout(r, pollIntervalMs));
        try {
          const refreshed = await getCounselorById(counselorId);
          if (
            refreshed &&
            (refreshed.raw?.google_connected || refreshed.google_connected)
          ) {
            setRefreshKey((k) => k + 1);
            toast.success("Google Calendar connected successfully!");
            // update local counselor quickly so UI toggles immediately
            setCounselor((prev) => ({ ...(prev ?? {}), ...refreshed }));
            await loadCalendar();
            return;
          }
        } catch (e) {
          // ignore transient failures and continue polling
        }
      }

      toast.warn(
        "No confirmation detected. If you completed consent, try reloading the page or re-running Connect."
      );
    } catch (err: any) {
      console.error("Failed to start Google connect flow:", err);
      toast.error(
        "Failed to initiate Google connect: " + (err?.message ?? err)
      );
    } finally {
      setCheckingConnect(false);
    }
  };

  // colors for page-level usage
  const BG = isDark ? "bg-gray-900" : "bg-white";
  const headingColor = isDark ? "#e6eefc" : "text-gray-700";
  const muted = isDark ? "text-gray-400" : "text-gray-600";
  const cardBg = isDark ? "bg-gray-800" : "bg-white";
  const cardBorder = isDark ? "border-gray-600" : "border-gray-200";

  return (
    <div className={`p-6 space-y-6 ${BG}`}>
      {/* Inline CSS to style FullCalendar with theme colors (and dark adjustments) */}
      <style>{`
        :root {
          --m-theme-primary: ${PRIMARY};
          --m-theme-secondary: ${SECONDARY};
          --m-theme-grad: ${GRADIENT};
        }

        .fc .fc-toolbar { margin-bottom: 12px; }
        .fc .fc-toolbar-chunk { gap: 8px; display: flex; align-items: center; }

        /* Buttons */
        .fc .fc-button {
          background: ${isDark ? "#0b1220" : "#fff"};
          border: 1px solid ${
            isDark ? "rgba(255,255,255,0.06)" : "rgba(30,58,138,0.16)"
          };
          color: ${isDark ? "#cfe0ff" : "var(--m-theme-primary)"};
          box-shadow: none;
          border-radius: 8px;
          padding: 6px 10px;
          font-weight: 600;
        }
        .fc .fc-button:hover {
          background: ${
            isDark
              ? "linear-gradient(135deg, rgba(30,58,138,0.08), rgba(59,130,246,0.04))"
              : "linear-gradient(135deg, rgba(30,58,138,0.06), rgba(59,130,246,0.04))"
          };
          transform: translateY(-1px);
        }
        .fc .fc-button-primary {
          background: var(--m-theme-grad);
          color: #fff;
          border: none;
        }

        /* Column headers */
        .fc .fc-col-header-cell {
          background: ${
            isDark ? "rgba(30,58,138,0.02)" : "rgba(30,58,138,0.03)"
          };
          color: ${isDark ? "#cfe0ff" : "var(--m-theme-primary)"};
          font-weight: 600;
        }

        .fc .fc-daygrid-day-top { color: ${
          isDark ? "#cfe0ff" : "var(--m-theme-primary)"
        }; font-weight:600; }
        .fc .fc-timegrid-slot-label { color: ${
          isDark ? "#94a3b8" : "rgba(0,0,0,0.55)"
        }; }

        .fc .fc-now-indicator { background: var(--m-theme-secondary); height: 2px; }

        .fc-event-normal {
          background-color: ${isDark ? "#071033" : "#fff"} !important;
          border: 2px solid var(--m-theme-primary) !important;
          color: ${isDark ? "#9ec0ff" : "var(--m-theme-primary)"} !important;
          border-radius: 8px !important;
        }
        .fc-event-cancelled {
          background-color: ${isDark ? "#2b0f0f" : "#fff0f0"} !important;
          border: 2px dashed ${isDark ? "#7f1d1d" : "#ef4444"} !important;
          color: ${isDark ? "#fca5a5" : "#9f1239"} !important;
        }

        .fc-list-event .fc-event-title { color: ${
          isDark ? "#9ec0ff" : "var(--m-theme-primary)"
        }; font-weight:600; }

      `}</style>

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h1
            className="text-2xl font-bold tracking-tight"
            style={{ color: headingColor }}
          >
            My Calendar
          </h1>
          <div className="text-sm" style={{ color: muted }}>
            {counselor ? (
              <span>
                Signed in as{" "}
                <strong style={{ color: headingColor }}>
                  {counselor.name ?? counselor.email ?? "Counselor"}
                </strong>
              </span>
            ) : (
              <span>
                {loading ? "Loading counselor…" : "No counselor profile found"}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Show Connect button only when counselor is present and not connected */}
          {counselor &&
            !counselor.raw?.google_connected &&
            !counselor.google_connected && (
              <button
                onClick={handleConnectGoogle}
                className="inline-flex items-center px-4 py-2 rounded-lg font-semibold"
                style={{
                  background: GRADIENT,
                  color: "#fff",
                  boxShadow: "0 6px 18px rgba(30,58,138,0.12)",
                }}
                disabled={checkingConnect}
              >
                {checkingConnect ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="animate-spin h-4 w-4" /> Connecting…
                  </span>
                ) : (
                  <span>Connect Google Calendar</span>
                )}
              </button>
            )}

          {/* When connected show a persistent connected badge */}
          {counselor &&
            (counselor.raw?.google_connected || counselor.google_connected) && (
              <div
                className="px-3 py-1 rounded-md font-medium text-sm inline-flex items-center gap-2"
                style={{ background: "rgba(59,130,246,0.12)", color: PRIMARY }}
              >
                <Check className="h-4 w-4" />
                Google Calendar connected
              </div>
            )}
        </div>
      </div>

      {loading && (
        <div className={`flex items-center justify-center py-8 ${muted}`}>
          <Loader2
            className="animate-spin h-6 w-6"
            style={{ color: PRIMARY }}
          />
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Card className={`${cardBg} ${cardBorder}`}>
          <CardHeader>
            <CardTitle className={headingColor}>Total Appointments</CardTitle>
          </CardHeader>
          <CardContent
            className="text-2xl font-semibold"
            style={{ color: isDark ? "#e6eefc" : undefined }}
          >
            {total}
          </CardContent>
        </Card>
        <Card className={`${cardBg} ${cardBorder}`}>
          <CardHeader>
            <CardTitle className={headingColor}>Upcoming</CardTitle>
          </CardHeader>
          <CardContent
            className="text-2xl font-semibold"
            style={{ color: isDark ? "#e6eefc" : undefined }}
          >
            {upcoming}
          </CardContent>
        </Card>
        <Card className={`${cardBg} ${cardBorder}`}>
          <CardHeader>
            <CardTitle className={headingColor}>Completed</CardTitle>
          </CardHeader>
          <CardContent
            className="text-2xl font-semibold"
            style={{ color: isDark ? "#e6eefc" : undefined }}
          >
            {completed}
          </CardContent>
        </Card>
      </div>

      <Card className={`${cardBg} ${cardBorder}`}>
        <CardHeader className="flex items-center space-x-2">
          <CalendarIcon className="h-5 w-5" style={{ color: PRIMARY }} />
        </CardHeader>
        <CardContent>
          <FullCalendar
            plugins={[
              dayGridPlugin,
              timeGridPlugin,
              interactionPlugin,
              listPlugin,
            ]}
            initialView="timeGridWeek"
            headerToolbar={{
              left: "prev,next today",
              center: "title",
              right: "timeGridWeek,timeGridDay,dayGridMonth,listWeek",
            }}
            timeZone="local"
            allDaySlot={false}
            slotMinTime="07:00:00"
            slotMaxTime="20:00:00"
            events={events}
            eventClick={handleEventClick}
            height="auto"
            nowIndicator={true}
            eventTimeFormat={{
              hour: "numeric",
              minute: "2-digit",
              hour12: true,
            }}
            dayMaxEvents={3}
            eventDisplay="block"
            editable={false}
            selectable={false}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default CalendarPage;
