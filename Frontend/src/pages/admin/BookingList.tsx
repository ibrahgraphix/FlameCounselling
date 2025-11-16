// src/pages/admin/BookingList.tsx
import React, { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import {
  getAllAppointments,
  getCounselorBookings,
  updateBookingStatus,
  rescheduleBooking,
  exportBookings,
  getAvailableSlots,
} from "@/services/api";
import api from "@/services/api";
import { toast } from "@/components/ui/sonner";
import { format, parseISO, isValid as isValidDate, addDays } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { useDarkMode } from "@/contexts/Darkmode";
import { useIsMobile } from "@/hooks/use-mobile";

type Maybe<T> = T | null | undefined;

type BookingItem = {
  booking_id?: string | number;
  id?: string | number;
  student_name?: string | null;
  userName?: string | null;
  year_level?: string | null;
  year?: string | null;
  booking_date?: string | null;
  date?: string | null;
  booking_time?: string | null;
  time?: string | null;
  status?: string | null;
  booking_status?: string | null;
  counselor_id?: number | null;
  therapistId?: number | null;
  counselorName?: string | null;
  therapistName?: string | null;
  userId?: number | string | null;
  student_email?: string | null;
  student_id?: number | null;
  session_note_exists?: boolean;
  note_count?: number;
  notes_filled?: boolean;
  session_note_created_at?: string | null;
  [k: string]: any;
};

type SessionNote = {
  note_id: number;
  student_id: number;
  counselor_id: number;
  session_datetime: string;
  notes: string;
  created_at?: string;
  student_name?: string | null;
  student_email?: string | null;
};

const BookingList: React.FC = () => {
  const { user } = useAuth() as any;
  const { darkMode } = useDarkMode();
  const isMobile = useIsMobile();

  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoadingId, setActionLoadingId] =
    useState<Maybe<string | number>>(null);

  // Reschedule UI state
  const [rescheduleBookingId, setRescheduleBookingId] =
    useState<Maybe<string | number>>(null);
  const [rescheduleCounselorId, setRescheduleCounselorId] =
    useState<Maybe<number>>(null);
  const [rescheduleSelectedDate, setRescheduleSelectedDate] = useState<
    Date | undefined
  >(undefined);
  const [rescheduleAvailableSlots, setRescheduleAvailableSlots] = useState<
    string[]
  >([]);
  const [rescheduleSelectedTime, setRescheduleSelectedTime] =
    useState<string>("");
  const [rescheduleLoading, setRescheduleLoading] = useState<boolean>(false);

  // Notes modal state
  const [notesModalOpen, setNotesModalOpen] = useState<boolean>(false);
  const [modalBooking, setModalBooking] = useState<BookingItem | null>(null);
  const [modalStudentName, setModalStudentName] = useState<string>("");
  const [modalStudentEmail, setModalStudentEmail] = useState<string>("");
  const [modalCounselorName, setModalCounselorName] = useState<string>("");
  const [modalDateTime, setModalDateTime] = useState<string>("");
  const [modalNotes, setModalNotes] = useState<string>("");
  const [notesSaving, setNotesSaving] = useState<boolean>(false);

  // session notes loaded from server for the current counselor
  const [sessionNotes, setSessionNotes] = useState<SessionNote[]>([]);

  // --- Helpers to normalize booking student id/email ---
  const getStudentIdFromBooking = (b: BookingItem): number | null => {
    const candidate =
      b.student_id ??
      b.studentId ??
      b.userId ??
      b.user_id ??
      (b as any).userId ??
      (b as any).studentId;
    if (candidate == null) return null;
    if (typeof candidate === "number") return candidate;
    if (typeof candidate === "string" && /^\d+$/.test(candidate)) {
      return Number(candidate);
    }
    return null;
  };

  const getStudentEmailFromBooking = (b: BookingItem): string | null => {
    return (
      (b.student_email as string) ??
      (b.email as string) ??
      (b.studentEmail as string) ??
      null
    );
  };

  // parse to Date with tolerance for a few common server formats
  const parseToDate = (s?: string | null): Date | null => {
    if (!s) return null;
    const str = String(s);
    try {
      if (str.includes("T") || str.endsWith("Z")) {
        const d = new Date(str);
        if (!isNaN(d.getTime())) return d;
      }

      const reYMDHMS = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;
      if (reYMDHMS.test(str)) {
        const iso = str.replace(" ", "T") + "Z";
        const d = new Date(iso);
        if (!isNaN(d.getTime())) return d;
      }

      const reYMD = /^\d{4}-\d{2}-\d{2}$/;
      if (reYMD.test(str)) {
        const [y, m, dN] = str.split("-").map(Number);
        const d = new Date(y, m - 1, dN);
        if (!isNaN(d.getTime())) return d;
      }

      const d2 = new Date(str);
      if (!isNaN(d2.getTime())) return d2;
    } catch {}
    return null;
  };

  // Convert Date to local YYYY-MM-DD
  const toLocalYMD = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${dd}`;
  };

  // Build booking local date from booking record (prefer booking_date+booking_time when available)
  const getBookingLocalDate = (b: BookingItem): string | null => {
    const dateOnly = b.booking_date ?? b.date ?? null;
    const timeOnly = b.booking_time ?? b.time ?? null;

    if (!dateOnly) return null;

    try {
      if (String(dateOnly).includes("T")) {
        const d = parseToDate(String(dateOnly));
        if (d) return toLocalYMD(d);
      }

      if (timeOnly && /^\d{1,2}:\d{2}(:\d{2})?$/.test(String(timeOnly))) {
        const [y, m, dd] = String(dateOnly).split("-").map(Number);
        const [hh, mm, ss] = String(timeOnly)
          .split(":")
          .map((x) => Number(x));
        const d = new Date(y, (m ?? 1) - 1, dd ?? 1, hh ?? 0, mm ?? 0, ss ?? 0);
        if (!isNaN(d.getTime())) return toLocalYMD(d);
      }

      const d2 = parseToDate(String(dateOnly));
      if (d2) return toLocalYMD(d2);
    } catch (e) {}
    return null;
  };

  const markNotesOnBookings = (
    bookingsArr: BookingItem[],
    notesArr: SessionNote[]
  ) => {
    if (!Array.isArray(bookingsArr)) return bookingsArr;
    if (!Array.isArray(notesArr) || notesArr.length === 0) {
      return bookingsArr.map((b) => ({
        ...b,
        session_note_exists: b.session_note_exists ?? b.notes_filled ?? false,
      }));
    }

    const notesWithLocalDate = notesArr.map((n) => {
      const noteSource = n.created_at ?? n.session_datetime ?? null;
      const noteDateObj = parseToDate(noteSource);
      const noteLocalDate = noteDateObj ? toLocalYMD(noteDateObj) : null;
      return { ...n, _noteLocalDate: noteLocalDate };
    });

    const mapped = bookingsArr.map((b) => {
      const bStudentId = getStudentIdFromBooking(b);
      const bEmail = (getStudentEmailFromBooking(b) || "").toLowerCase();
      const bLocalDate = getBookingLocalDate(b);

      if (bLocalDate) {
        const found = notesWithLocalDate.find((n) => {
          if (!n._noteLocalDate) return false;
          if (n._noteLocalDate !== bLocalDate) return false;

          if (bStudentId && n.student_id && Number(n.student_id) === bStudentId)
            return true;
          if (bEmail && (n as any).student_email) {
            try {
              const ne = String((n as any).student_email).toLowerCase();
              if (ne && ne === bEmail) return true;
            } catch {}
          }
          return false;
        });

        return {
          ...b,
          session_note_exists: Boolean(found) || Boolean(b.notes_filled),
          session_note_created_at: found
            ? found.created_at ?? found.session_datetime
            : b.session_note_created_at ?? null,
        };
      }

      return {
        ...b,
        session_note_exists: b.session_note_exists ?? b.notes_filled ?? false,
      };
    });

    return mapped;
  };

  const fetchAndMarkSessionNotes = async (bookingsArr?: BookingItem[]) => {
    try {
      const resp = await api.get("/api/session-notes");
      const notes = Array.isArray(resp?.data) ? resp.data : [];
      setSessionNotes(notes);
      const target = bookingsArr ?? bookings;
      const updated = markNotesOnBookings(target, notes);
      setBookings(updated);
    } catch (err) {
      console.warn("Could not fetch session-notes:", err);
    }
  };

  useEffect(() => {
    const fetchBookings = async () => {
      setLoading(true);
      try {
        const role = user ? String(user.role).toLowerCase() : null;
        const isAdminUser = role === "admin";

        if (isAdminUser) {
          const data = await getAllAppointments();
          const arr = Array.isArray(data) ? data : [];
          setBookings(arr);
          await fetchAndMarkSessionNotes(arr);
          return;
        }

        const data = await getCounselorBookings();

        if (user) {
          const counselorId = Number(
            user.counselor_id ?? user.id ?? user.counselorId ?? user.user_id
          );

          if (counselorId && Array.isArray(data)) {
            const filtered = data.filter(
              (b: any) =>
                Number(
                  b.counselor_id ??
                    b.therapistId ??
                    b.counselorId ??
                    b.c_counselor_id ??
                    b.counselorId
                ) === counselorId
            );
            setBookings(filtered);
            await fetchAndMarkSessionNotes(filtered);
            return;
          }
        }

        const arr = Array.isArray(data) ? data : [];
        setBookings(arr);
        await fetchAndMarkSessionNotes(arr);
      } catch (err) {
        console.error("Error loading bookings:", err);
        toast.error("Could not load bookings from server.");
        setBookings([]);
      } finally {
        setLoading(false);
      }
    };

    fetchBookings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Fetch available slots whenever rescheduleCounselorId + selected date change
  useEffect(() => {
    const fetchSlots = async () => {
      if (!rescheduleCounselorId || !rescheduleSelectedDate) {
        setRescheduleAvailableSlots([]);
        setRescheduleSelectedTime("");
        return;
      }
      try {
        const formattedDate = format(rescheduleSelectedDate, "yyyy-MM-dd");
        const slots = await getAvailableSlots(
          rescheduleCounselorId,
          formattedDate
        );
        setRescheduleAvailableSlots(Array.isArray(slots) ? slots : []);
        setRescheduleSelectedTime("");
      } catch (err) {
        console.error("Error fetching available slots:", err);
        setRescheduleAvailableSlots([]);
        setRescheduleSelectedTime("");
      }
    };

    fetchSlots();
  }, [rescheduleCounselorId, rescheduleSelectedDate]);

  // Update booking status (confirm/complete/cancel)
  const handleAction = async (bookingId: string | number, action: string) => {
    setActionLoadingId(bookingId);
    try {
      const statusToSet =
        action === "confirm"
          ? "confirmed"
          : action === "complete"
          ? "completed"
          : action === "cancel"
          ? "canceled"
          : action;

      const res = await updateBookingStatus(bookingId, statusToSet);

      const newStatus =
        (res && (res.status ?? (res.booking && res.booking.status))) ||
        statusToSet;

      setBookings((prev) =>
        prev.map((b) =>
          String(b.booking_id ?? b.id) === String(bookingId)
            ? { ...b, status: newStatus }
            : b
        )
      );

      if (action === "confirm") toast.success("Booking confirmed");
      else if (action === "complete") toast.success("Booking marked completed");
      else if (action === "cancel") toast.success("Booking cancelled");
      else toast.success(`Action ${action} completed`);
    } catch (err) {
      console.error("Action error:", err);
      toast.error("Action failed");
    } finally {
      setActionLoadingId(null);
    }
  };

  const openRescheduleUI = (b: BookingItem) => {
    const id = b.booking_id ?? b.id;
    setRescheduleBookingId(id);
    const counselorId =
      Number(
        b.counselor_id ?? b.therapistId ?? b.counselorId ?? b.c_counselor_id
      ) || null;
    setRescheduleCounselorId(counselorId ?? null);

    const dateString = b.booking_date ?? b.date;
    let parsedDate: Date | undefined = undefined;
    if (dateString) {
      try {
        const d = parseISO(String(dateString));
        if (isValidDate(d)) parsedDate = d;
      } catch (e) {}
    }
    setRescheduleSelectedDate(parsedDate ?? undefined);
    setRescheduleSelectedTime(b.booking_time ?? b.time ?? "");
  };

  const closeRescheduleUI = () => {
    setRescheduleBookingId(null);
    setRescheduleCounselorId(null);
    setRescheduleSelectedDate(undefined);
    setRescheduleAvailableSlots([]);
    setRescheduleSelectedTime("");
    setRescheduleLoading(false);
  };

  const submitReschedule = async () => {
    if (!rescheduleBookingId) return;
    if (!rescheduleSelectedDate) {
      toast.error("Please select a date");
      return;
    }
    if (!rescheduleSelectedTime) {
      toast.error("Please pick a time slot");
      return;
    }

    setRescheduleLoading(true);
    setActionLoadingId(rescheduleBookingId);
    try {
      const formattedDate = format(rescheduleSelectedDate, "yyyy-MM-dd");
      const updated = await rescheduleBooking(
        rescheduleBookingId,
        formattedDate,
        rescheduleSelectedTime
      );

      setBookings((prev) =>
        prev.map((b) =>
          String(b.booking_id ?? b.id) === String(rescheduleBookingId)
            ? {
                ...b,
                booking_date: updated?.booking_date ?? formattedDate,
                booking_time: updated?.booking_time ?? rescheduleSelectedTime,
              }
            : b
        )
      );

      toast.success("Booking rescheduled");
      closeRescheduleUI();
    } catch (err) {
      console.error("Reschedule submit error:", err);
      if ((err as any)?.response?.data?.error) {
        toast.error((err as any).response.data.error);
      } else {
        toast.error("Failed to reschedule booking");
      }
    } finally {
      setRescheduleLoading(false);
      setActionLoadingId(null);
    }
  };

  const handleExport = async () => {
    try {
      const blob = await exportBookings();
      const fileName = `bookings_${new Date()
        .toISOString()
        .slice(0, 19)
        .replace(/[:T]/g, "-")}.csv`;
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Export started");
    } catch (err) {
      console.error("Export error:", err);
      toast.error("Could not export bookings");
    }
  };

  // --- Notes modal helpers ---
  const openNotesModalForBooking = (b: BookingItem) => {
    const studentName =
      (b.student_name as string) ??
      (b.userName as string) ??
      b.student_name ??
      b.userName ??
      "";
    const studentEmail =
      (b.student_email as string) ?? (b.email as string) ?? "";
    const counselorName =
      (user && (user.name || (user as any).full_name || user.email)) ??
      b.counselorName ??
      b.therapistName ??
      "";

    setModalBooking(b);
    setModalStudentName(String(studentName ?? ""));
    setModalStudentEmail(String(studentEmail ?? ""));
    setModalCounselorName(String(counselorName ?? ""));
    setModalDateTime(new Date().toISOString());
    setModalNotes("");
    setNotesModalOpen(true);
  };

  const closeNotesModal = () => {
    setNotesModalOpen(false);
    setModalBooking(null);
    setModalStudentName("");
    setModalStudentEmail("");
    setModalCounselorName("");
    setModalDateTime("");
    setModalNotes("");
    setNotesSaving(false);
  };

  const saveSessionNoteFromModal = async () => {
    if (!modalBooking) {
      toast.error("Booking context missing");
      return;
    }

    const studentId = getStudentIdFromBooking(modalBooking);
    if (!studentId) {
      toast.error(
        "Student ID not available on this booking. Cannot create session note."
      );
      return;
    }

    if (!modalNotes.trim()) {
      toast.error("Please enter notes");
      return;
    }

    setNotesSaving(true);
    try {
      const payload = {
        student_id: Number(studentId),
        session_datetime: new Date().toISOString(),
        notes: modalNotes.trim(),
      };

      const resp = await api.post("/api/session-notes", payload);
      const created = resp?.data ?? null;
      const bookingKey = modalBooking.booking_id ?? modalBooking.id ?? "";

      if (
        resp?.status === 201 ||
        (created && (created.note_id || created.note_id === 0))
      ) {
        toast.success("Session note saved");

        const createdAt =
          created?.created_at ??
          created?.session_datetime ??
          new Date().toISOString();

        setBookings((prev) =>
          prev.map((b) =>
            String(b.booking_id ?? b.id) === String(bookingKey)
              ? {
                  ...b,
                  notes_filled: true,
                  session_note_exists: true,
                  session_note_created_at: createdAt,
                }
              : b
          )
        );

        await fetchAndMarkSessionNotes();

        try {
          setActionLoadingId(bookingKey);
          await updateBookingStatus(bookingKey, "completed");
          setBookings((prev) =>
            prev.map((b) =>
              String(b.booking_id ?? b.id) === String(bookingKey)
                ? { ...b, status: "completed" }
                : b
            )
          );
          toast.success("Booking marked completed");
        } catch (err) {
          console.warn(
            "Failed to mark booking completed after saving note:",
            err
          );
          setBookings((prev) =>
            prev.map((b) =>
              String(b.booking_id ?? b.id) === String(bookingKey)
                ? { ...b, status: "completed" }
                : b
            )
          );
          toast.warn(
            "Note saved, but failed to mark booking completed on server."
          );
        } finally {
          setActionLoadingId(null);
        }

        closeNotesModal();
        return;
      }

      if (resp?.data) {
        toast.success("Session note saved");

        const createdAt =
          resp.data?.created_at ??
          resp.data?.session_datetime ??
          new Date().toISOString();

        const bookingKey2 = modalBooking.booking_id ?? modalBooking.id ?? "";
        setBookings((prev) =>
          prev.map((b) =>
            String(b.booking_id ?? b.id) === String(bookingKey2)
              ? {
                  ...b,
                  notes_filled: true,
                  session_note_exists: true,
                  session_note_created_at: createdAt,
                }
              : b
          )
        );

        await fetchAndMarkSessionNotes();

        try {
          setActionLoadingId(bookingKey2);
          await updateBookingStatus(bookingKey2, "completed");
          setBookings((prev) =>
            prev.map((b) =>
              String(b.booking_id ?? b.id) === String(bookingKey2)
                ? { ...b, status: "completed" }
                : b
            )
          );
          toast.success("Booking marked completed");
        } catch (err) {
          console.warn(
            "Failed to mark booking completed after saving note:",
            err
          );
          setBookings((prev) =>
            prev.map((b) =>
              String(b.booking_id ?? b.id) === String(bookingKey2)
                ? { ...b, status: "completed" }
                : b
            )
          );
          toast.warn(
            "Note saved, but failed to mark booking completed on server."
          );
        } finally {
          setActionLoadingId(null);
        }

        closeNotesModal();
        return;
      }

      toast.error("Could not save session note");
    } catch (err: any) {
      console.error("saveSessionNote error:", err);
      if (err?.response?.data?.message) {
        toast.error(err.response.data.message);
      } else {
        toast.error("Failed to save session note");
      }
    } finally {
      setNotesSaving(false);
    }
  };

  // Determine whether booking has a note (server or local)
  const hasNoteForBooking = (b: BookingItem) => {
    if (b.session_note_exists) return true;
    if ((b as any).hasSessionNote) return true;
    if ((b as any).notes_filled) return true;

    const bStudentId = getStudentIdFromBooking(b);
    const bEmail = getStudentEmailFromBooking(b);
    const bLocalDate = getBookingLocalDate(b);

    if (!bStudentId && !bEmail) return false;
    if (!bLocalDate) return false;

    const found = sessionNotes.find((n) => {
      const noteSource = n.created_at ?? n.session_datetime ?? null;
      const noteObj = parseToDate(noteSource);
      if (!noteObj) return false;
      const noteLocalDate = toLocalYMD(noteObj);
      if (noteLocalDate !== bLocalDate) return false;

      if (bStudentId && n.student_id && Number(n.student_id) === bStudentId)
        return true;
      if (bEmail && (n as any).student_email) {
        try {
          const ne = String((n as any).student_email).toLowerCase();
          if (ne && ne === String(bEmail).toLowerCase()) return true;
        } catch {}
      }
      return false;
    });

    return Boolean(found);
  };

  const displayLabel =
    user && String(user.role).toLowerCase() === "admin"
      ? "All Bookings"
      : "My Bookings";
  const isAdminUser = user && String(user.role).toLowerCase() === "admin";

  const statusClass = (status?: string) => {
    const s = (status ?? "pending").toString().toLowerCase();
    if (s === "confirmed")
      return darkMode
        ? "bg-green-900 text-green-300"
        : "bg-green-100 text-green-700";
    if (s === "pending")
      return darkMode
        ? "bg-yellow-900 text-yellow-300"
        : "bg-yellow-100 text-yellow-700";
    if (s === "completed")
      return darkMode
        ? "bg-indigo-900 text-indigo-300"
        : "bg-indigo-100 text-indigo-700";
    return darkMode ? "bg-red-900 text-red-300" : "bg-red-100 text-red-700";
  };

  // Render helpers for mobile card
  const BookingCard: React.FC<{ b: BookingItem }> = ({ b }) => {
    const id = b.booking_id ?? b.id;
    const studentName = b.student_name ?? b.userName ?? "Unknown";
    const year = b.year_level ?? b.year ?? "—";
    const dateRaw = b.booking_date ?? b.date;
    const timeRaw = b.booking_time ?? b.time;
    const status =
      (b.status ?? b.booking_status ?? "pending")?.toString() ?? "pending";

    let datePretty = dateRaw;
    try {
      if (dateRaw) {
        const pd = parseToDate(String(dateRaw));
        if (pd) datePretty = format(pd, "MMM d, yyyy");
        else datePretty = String(dateRaw);
      }
    } catch (e) {
      datePretty = dateRaw ?? "";
    }

    const noteExists = hasNoteForBooking(b);
    const isCompleted = String(status).toLowerCase() === "completed";

    return (
      <div
        className={cn(
          "rounded-lg shadow-sm p-4 mb-4",
          darkMode ? "bg-slate-800 text-slate-100" : "bg-white text-slate-900"
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-lg font-medium truncate">{studentName}</h3>
              <span
                className={`text-xs px-2 py-1 rounded-full ${statusClass(
                  status
                )}`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </span>
            </div>
            <div className="mt-2 text-sm text-muted-foreground">
              <div>
                <strong>Date:</strong> {datePretty || "—"}
              </div>
              <div>
                <strong>Time:</strong> {timeRaw || "—"}
              </div>
              <div>
                <strong>Year:</strong> {year}
              </div>
            </div>
            {noteExists && (
              <div className="mt-2 text-xs text-green-500">
                Session note exists
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-end gap-2">
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleAction(id as any, "confirm")}
              disabled={
                actionLoadingId === id ||
                isCompleted ||
                status === "confirmed" ||
                status === "cancelled" ||
                status === "canceled"
              }
            >
              Confirm
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => openRescheduleUI(b)}
              disabled={
                actionLoadingId === id ||
                isCompleted ||
                status === "cancelled" ||
                status === "canceled"
              }
            >
              Reschedule
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => handleAction(id as any, "complete")}
              disabled={
                actionLoadingId === id ||
                isCompleted ||
                status === "cancelled" ||
                status === "canceled"
              }
            >
              Completed
            </Button>

            {!noteExists ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => openNotesModalForBooking(b)}
                disabled={isCompleted || actionLoadingId === id}
              >
                Notes
              </Button>
            ) : (
              <Button variant="ghost" size="sm" disabled>
                Filled
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      className="p-4 sm:p-6 space-y-6 min-h-screen"
      style={{ background: darkMode ? "#0f1724" : "white" }}
    >
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-2xl font-bold tracking-tight"
            style={{ color: darkMode ? "#e6eefc" : undefined }}
          >
            Booking List
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={handleExport}>Export Excel</Button>
        </div>
      </div>

      {/* Reschedule panel */}
      {rescheduleBookingId && (
        <Card>
          <CardHeader>
            <CardTitle>Reschedule Booking</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-1">
                <div className="space-y-2">
                  <label
                    className="text-sm font-medium"
                    style={{ color: darkMode ? "#cbd5e1" : undefined }}
                  >
                    Select a Date
                  </label>
                  <div
                    className={cn(
                      "rounded-md p-3",
                      darkMode
                        ? "border border-slate-700"
                        : "border border-gray-200"
                    )}
                  >
                    <Calendar
                      mode="single"
                      selected={rescheduleSelectedDate}
                      onSelect={(d) => setRescheduleSelectedDate(d as Date)}
                      disabled={(date) =>
                        date < new Date() || date > addDays(new Date(), 30)
                      }
                      className={cn("mx-auto rounded-md")}
                    />
                  </div>
                </div>
              </div>

              <div className="md:col-span-2">
                <div className="space-y-4">
                  <div>
                    <label
                      className="text-sm font-medium"
                      style={{ color: darkMode ? "#cbd5e1" : undefined }}
                    >
                      Available Time Slots
                    </label>
                    <div className="mt-2">
                      {rescheduleSelectedDate ? (
                        rescheduleAvailableSlots.length > 0 ? (
                          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                            {rescheduleAvailableSlots.map((slot, idx) => (
                              <button
                                key={idx}
                                className={cn(
                                  "border rounded-md py-2 px-3 text-sm transition-colors",
                                  rescheduleSelectedTime === slot
                                    ? "bg-mindease-primary text-white border-mindease-primary"
                                    : darkMode
                                    ? "hover:border-slate-400 border-slate-700 bg-slate-800 text-slate-100"
                                    : "hover:border-mindease-primary"
                                )}
                                onClick={() => setRescheduleSelectedTime(slot)}
                              >
                                {slot}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div
                            className={cn(
                              "border rounded-md p-6 text-center",
                              darkMode
                                ? "text-slate-300 border-slate-700"
                                : "text-muted-foreground"
                            )}
                          >
                            No available slots for this date.
                          </div>
                        )
                      ) : (
                        <div
                          className={cn(
                            "border rounded-md p-6 text-center",
                            darkMode
                              ? "text-slate-300 border-slate-700"
                              : "text-muted-foreground"
                          )}
                        >
                          Select a date to view slots.
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Button
                      onClick={submitReschedule}
                      disabled={
                        rescheduleLoading ||
                        !rescheduleSelectedDate ||
                        !rescheduleSelectedTime
                      }
                    >
                      {rescheduleLoading ? "Saving..." : "Save"}
                    </Button>
                    <Button variant="ghost" onClick={closeRescheduleUI}>
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{displayLabel}</CardTitle>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div
              className="py-8 text-center"
              style={{ color: darkMode ? "#cbd5e1" : undefined }}
            >
              Loading bookings…
            </div>
          ) : bookings.length === 0 ? (
            <div
              className="py-12 text-center"
              style={{ color: darkMode ? "#cbd5e1" : undefined }}
            >
              No bookings found.
            </div>
          ) : isMobile ? (
            // Mobile: render card list
            <div>
              {bookings.map((b) => (
                <BookingCard key={String(b.booking_id ?? b.id)} b={b} />
              ))}
            </div>
          ) : (
            // Desktop/table view (unchanged)
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Full Name</TableHead>
                  <TableHead>Year</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Status</TableHead>
                  {!isAdminUser && (
                    <TableHead className="text-right">Actions</TableHead>
                  )}
                </TableRow>
              </TableHeader>

              <TableBody>
                {bookings.map((b) => {
                  const id = b.booking_id ?? b.id;
                  const studentName = b.student_name ?? b.userName ?? "Unknown";
                  const year = b.year_level ?? b.year ?? "—";
                  const dateRaw = b.booking_date ?? b.date;
                  const timeRaw = b.booking_time ?? b.time;
                  const status =
                    (b.status ?? b.booking_status ?? "pending")?.toString() ??
                    "pending";

                  let datePretty = dateRaw;
                  try {
                    if (dateRaw) {
                      const pd = parseToDate(String(dateRaw));
                      if (pd) datePretty = format(pd, "MMM d, yyyy");
                      else datePretty = String(dateRaw);
                    }
                  } catch (e) {
                    datePretty = dateRaw ?? "";
                  }

                  const noteExists = hasNoteForBooking(b);
                  const isCompleted =
                    String(status).toLowerCase() === "completed";

                  return (
                    <TableRow key={String(id)}>
                      <TableCell
                        style={{ color: darkMode ? "#e6eefc" : undefined }}
                      >
                        {studentName}
                      </TableCell>
                      <TableCell
                        style={{ color: darkMode ? "#cbd5e1" : undefined }}
                      >
                        {year}
                      </TableCell>
                      <TableCell
                        style={{ color: darkMode ? "#cbd5e1" : undefined }}
                      >
                        {datePretty}
                      </TableCell>
                      <TableCell
                        style={{ color: darkMode ? "#cbd5e1" : undefined }}
                      >
                        {timeRaw}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${statusClass(
                            status
                          )}`}
                        >
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </span>
                      </TableCell>

                      {!isAdminUser && (
                        <TableCell className="text-right space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAction(id as any, "confirm")}
                            disabled={
                              actionLoadingId === id ||
                              isCompleted ||
                              status === "confirmed" ||
                              status === "cancelled" ||
                              status === "canceled"
                            }
                          >
                            Confirm
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              openRescheduleUI(b);
                            }}
                            disabled={
                              actionLoadingId === id ||
                              isCompleted ||
                              status === "cancelled" ||
                              status === "canceled"
                            }
                          >
                            Reschedule
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAction(id as any, "complete")}
                            disabled={
                              actionLoadingId === id ||
                              isCompleted ||
                              status === "cancelled" ||
                              status === "canceled"
                            }
                          >
                            Completed
                          </Button>

                          {!noteExists ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openNotesModalForBooking(b)}
                              title="Add session note"
                              disabled={isCompleted || actionLoadingId === id}
                            >
                              Notes
                            </Button>
                          ) : (
                            <Button variant="ghost" size="sm" disabled>
                              Filled
                            </Button>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Notes Modal */}
      {notesModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          aria-modal="true"
          role="dialog"
        >
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => {
              if (!notesSaving) closeNotesModal();
            }}
          />
          <div
            className={cn(
              "relative w-full max-w-2xl mx-4 rounded-lg shadow-lg",
              darkMode
                ? "bg-slate-800 text-slate-100"
                : "bg-white text-gray-900"
            )}
            role="document"
          >
            <div
              className="p-4 border-b"
              style={{ borderColor: darkMode ? "#111" : "#eee" }}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Add Session Note</h3>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      if (!notesSaving) closeNotesModal();
                    }}
                  >
                    Close
                  </Button>
                </div>
              </div>
            </div>

            <div className="p-4 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label>Student Name</Label>
                  <Input value={modalStudentName} readOnly />
                </div>
                <div>
                  <Label>Student Email</Label>
                  <Input value={modalStudentEmail} readOnly />
                </div>
                <div>
                  <Label>Counselor</Label>
                  <Input value={modalCounselorName} readOnly />
                </div>
                <div>
                  <Label>Date & Time</Label>
                  <Input
                    value={
                      modalDateTime
                        ? new Date(modalDateTime).toLocaleString()
                        : new Date().toLocaleString()
                    }
                    readOnly
                  />
                </div>
              </div>

              <div>
                <Label>Notes</Label>
                <Textarea
                  placeholder="Write notes for this session..."
                  value={modalNotes}
                  onChange={(e) => setModalNotes(e.target.value)}
                  rows={6}
                />
              </div>

              <div className="flex items-center justify-end gap-2">
                <Button
                  variant="ghost"
                  onClick={closeNotesModal}
                  disabled={notesSaving}
                >
                  Cancel
                </Button>
                <Button
                  onClick={saveSessionNoteFromModal}
                  disabled={notesSaving || !modalNotes.trim()}
                >
                  {notesSaving ? "Saving..." : "Save Note"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookingList;
