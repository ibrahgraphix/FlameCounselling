// src/pages/Appointments.tsx
import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { format, addDays, parseISO, isValid as isValidDate } from "date-fns";
import { CalendarIcon, Clock, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getCounselors,
  getCounselorById,
  getAvailableSlots,
  bookAppointment,
  getUserAppointments,
  saveUserAppointment,
  rescheduleBooking,
  updateBookingStatus,
  setAuthToken,
} from "@/services/api";
import api from "@/services/api"; // axios instance (used for server proxy student lookup)
import { toast } from "@/components/ui/sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const APPT_TOKEN_PREFIX = "mindease_token_";
const APPT_KEY_PREFIX = "mindease_appointments_";
const LAST_GUEST_EMAIL_KEY = "mindease_last_guest_email";

const makeAvatar = (seed?: string) =>
  `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(
    seed ?? "counselor"
  )}`;

const POLL_INTERVAL_MS = 10000; // 10s

// Theme constants
const PRIMARY = "#1e3a8a";
const SECONDARY = "#3b82f6";
const GRADIENT_CLASS = "bg-[linear-gradient(135deg,#1e3a8a_0%,#3b82f6_100%)]";

const Appointments: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<string>("upcoming");
  const [isLoading, setIsLoading] = useState<boolean>(true);

  interface Counselor {
    id: number;
    name: string;
    avatar?: string;
    specialty?: string | null;
    email?: string;
    role?: string | null;
    raw?: any;
  }
  const [counselors, setCounselors] = useState<Counselor[]>([]);

  interface Appointment {
    booking_id?: string | number;
    id?: string | number;
    therapistName?: string;
    therapist_name?: string;
    therapistId?: number;
    date?: string;
    time?: string;
    status?: string;
    student_name?: string;
    student_email?: string;
    booking_date?: string;
    booking_time?: string;
    counselor_id?: number;
    booking_status?: string;
    raw?: any;
    [k: string]: any;
  }
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  const [selectedCounselorId, setSelectedCounselorId] = useState<number | null>(
    null
  );
  const [selectedCounselor, setSelectedCounselor] = useState<Counselor | null>(
    null
  );
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [bookingNotes, setBookingNotes] = useState<string>("");
  const [isBooking, setIsBooking] = useState<boolean>(false);
  const [bookingStep, setBookingStep] = useState<number>(1);

  // Student-related fields
  const [studentId, setStudentId] = useState<string>(""); // student code / EmployeeCode
  const [fullName, setFullName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [year, setYear] = useState<string>("");

  const [guestLoadedEmail, setGuestLoadedEmail] = useState<string | null>(null);

  const [rescheduleBookingId, setRescheduleBookingId] = useState<
    string | number | null
  >(null);
  const [rescheduleSelectedDate, setRescheduleSelectedDate] = useState<
    Date | undefined
  >(undefined);
  const [rescheduleAvailableSlots, setRescheduleAvailableSlots] = useState<
    string[]
  >([]);
  const [rescheduleSelectedTime, setRescheduleSelectedTime] =
    useState<string>("");
  const [rescheduleLoading, setRescheduleLoading] = useState<boolean>(false);

  // -------------------- helpers --------------------
  const getAppointmentKey = (a: Appointment) => {
    const idKey = a.booking_id ?? a.id;
    if (idKey !== undefined && idKey !== null && String(idKey).trim() !== "") {
      return `id:${String(idKey)}`;
    }
    const student = String(a.student_email ?? a.student_name ?? "")
      .trim()
      .toLowerCase();
    const date = String(a.booking_date ?? a.date ?? "").trim();
    const time = String(a.booking_time ?? a.time ?? "").trim();
    const counselor = String(
      (a as any).counselor_id ??
        (a as any).therapistId ??
        (a as any).therapist_id ??
        ""
    ).trim();
    return `u:${student}|d:${date}|t:${time}|c:${counselor}`;
  };

  const dedupeAppointments = (arr: Appointment[] | null | undefined) => {
    if (!Array.isArray(arr)) return [];
    const map = new Map<string, Appointment>();
    for (const a of arr) {
      const key = getAppointmentKey(a);
      if (!map.has(key)) {
        map.set(key, a);
      }
    }
    return Array.from(map.values());
  };

  const detectGuestEmailFromLocalStorage = (): string | null => {
    if (typeof window === "undefined") return null;
    try {
      const last = localStorage.getItem(LAST_GUEST_EMAIL_KEY);
      if (last && last.trim() !== "") return last;

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key) continue;
        if (key.startsWith(APPT_TOKEN_PREFIX)) {
          const email = key.slice(APPT_TOKEN_PREFIX.length);
          if (email.includes("@")) return decodeURIComponent(email);
          return email;
        }
      }

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key) continue;
        if (key.startsWith(APPT_KEY_PREFIX)) {
          const owner = key.slice(APPT_KEY_PREFIX.length);
          if (owner.includes("@")) return decodeURIComponent(owner);
        }
      }
    } catch (e) {
      // ignore
    }
    return null;
  };

  const normalizeBookingForClient = (raw: any): Appointment => {
    if (!raw || typeof raw !== "object") return raw;
    const booking_date =
      raw.booking_date ?? raw.date ?? (raw.booking && raw.booking.booking_date);
    const booking_time =
      raw.booking_time ?? raw.time ?? (raw.booking && raw.booking.booking_time);

    const therapistName =
      raw.therapistName ??
      raw.therapist_name ??
      raw.counselor_name ??
      (raw.therapist && raw.therapist.name) ??
      raw.therapistName;

    return {
      booking_id:
        raw.booking_id ??
        raw.id ??
        (raw.booking && (raw.booking.booking_id ?? raw.booking.id)) ??
        raw.id,
      booking_date: booking_date,
      booking_time: booking_time,
      date: booking_date ?? raw.date,
      time: booking_time ?? raw.time,
      therapistName: therapistName,
      therapist_name:
        raw.therapist_name ?? raw.therapistName ?? raw.counselor_name,
      status:
        raw.status ?? raw.booking_status ?? raw.booking?.status ?? "pending",
      student_name: raw.student_name ?? raw.studentName ?? raw.name,
      student_email: raw.student_email ?? raw.studentEmail ?? raw.email,
      counselor_id:
        raw.counselor_id ??
        raw.therapistId ??
        raw.therapist_id ??
        raw.c_counselor_id,
      raw,
    } as Appointment;
  };

  const formatDisplayDate = (d?: string | null) => {
    if (!d) return "-";
    try {
      const iso = parseISO(String(d));
      if (isValidDate(iso)) return format(iso, "MMM d, yyyy");
      const asDate = new Date(String(d));
      if (!isNaN(asDate.getTime())) return format(asDate, "MMM d, yyyy");
    } catch (e) {}
    return String(d);
  };

  const ensureGuestTokenApplied = (email?: string | null) => {
    if (!email || typeof window === "undefined") return;
    try {
      const token = localStorage.getItem(`${APPT_TOKEN_PREFIX}${email}`);
      if (token) {
        setAuthToken(token);
        return;
      }
      const access = localStorage.getItem(`mindease_token_${email}`);
      if (access) {
        setAuthToken(access);
      }
    } catch (e) {
      // ignore
    }
  };

  // -------------------- fetch / boot --------------------
  const fetchMyAppointments = async () => {
    try {
      setIsLoading(true);

      if (user) {
        const userAppointments = await getUserAppointments(user.id);
        setAppointments(
          dedupeAppointments(
            (userAppointments || []).map((x: any) =>
              normalizeBookingForClient(x)
            )
          )
        );
        return;
      }

      const ownerEmail = guestLoadedEmail ?? detectGuestEmailFromLocalStorage();
      if (ownerEmail) {
        setGuestLoadedEmail(ownerEmail);
        ensureGuestTokenApplied(ownerEmail);

        const guestAppts = await getUserAppointments(ownerEmail);
        setAppointments(
          dedupeAppointments(
            (guestAppts || []).map((x: any) => normalizeBookingForClient(x))
          )
        );
      } else {
        setAppointments([]);
      }
    } catch (err) {
      console.error("Error fetching appointments:", err);
      toast.error("Could not load appointments");
      setAppointments([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setIsLoading(true);

        const fetched = await getCounselors();

        let list: any[] = [];
        if (Array.isArray(fetched)) {
          list = fetched;
        } else if (fetched && Array.isArray((fetched as any).counselors)) {
          list = (fetched as any).counselors;
        } else if (fetched && Array.isArray((fetched as any).data)) {
          list = (fetched as any).data;
        } else {
          list = [];
        }

        const isCounselor = (c: any) => {
          const role =
            (c.role ?? c.raw?.role ?? c.role_name ?? c.raw?.user_role ?? "")
              .toString()
              .toLowerCase() || "";
          return role === "counselor";
        };

        const filteredList = list.filter(isCounselor);

        const normalized: Counselor[] = filteredList.map(
          (c: any, i: number) => {
            const name =
              c.name ??
              (c.first_name || c.last_name
                ? `${c.first_name ?? ""} ${c.last_name ?? ""}`.trim()
                : `Counselor ${i + 1}`);
            return {
              id: Number(c.id ?? c.counselor_id ?? i + 1),
              name,
              email: c.email ?? c.email_address ?? "",
              specialty: c.specialty ?? c.speciality ?? null,
              avatar: c.avatar ?? makeAvatar(name ?? c.email ?? `c${i + 1}`),
              role: c.role ?? c.raw?.role ?? null,
              raw: c,
            };
          }
        );
        setCounselors(normalized);

        await fetchMyAppointments();
      } catch (error) {
        console.error("Error fetching initial data:", error);
        toast.error("Could not load appointments data");
      } finally {
        setIsLoading(false);
      }
    };

    fetchInitialData();
  }, [user]);

  useEffect(() => {
    const interval = setInterval(async () => {
      await fetchMyAppointments();
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [user, guestLoadedEmail]);

  useEffect(() => {
    const fetchCounselorDetails = async () => {
      if (selectedCounselorId) {
        try {
          const c = await getCounselorById(selectedCounselorId);
          if (c) {
            const name =
              c.name ??
              (c.raw?.first_name || c.raw?.last_name
                ? `${c.raw?.first_name ?? ""} ${c.raw?.last_name ?? ""}`.trim()
                : `Counselor ${c.id}`);
            setSelectedCounselor({
              id: Number(c.id ?? c.raw?.counselor_id ?? selectedCounselorId),
              name,
              email: c.email ?? "",
              specialty: c.specialty ?? null,
              avatar: c.avatar ?? makeAvatar(name ?? c.email ?? `c${c.id}`),
              role: (c as any).role ?? null,
              raw: c,
            });
          }
        } catch (error) {
          console.error("Error fetching counselor details:", error);
        }
      } else {
        setSelectedCounselor(null);
      }
    };
    fetchCounselorDetails();
  }, [selectedCounselorId]);

  useEffect(() => {
    const fetchAvailableSlots = async () => {
      if (selectedCounselorId && selectedDate) {
        try {
          const slots = await getAvailableSlots(
            selectedCounselorId,
            format(selectedDate, "yyyy-MM-dd")
          );
          setAvailableSlots(slots || []);
          setSelectedTime("");
        } catch (error) {
          console.error("Error fetching available slots:", error);
          setAvailableSlots([]);
          setSelectedTime("");
        }
      } else {
        setAvailableSlots([]);
        setSelectedTime("");
      }
    };

    fetchAvailableSlots();
  }, [selectedCounselorId, selectedDate]);

  useEffect(() => {
    const fetchSlots = async () => {
      if (!rescheduleSelectedDate) {
        setRescheduleAvailableSlots([]);
        setRescheduleSelectedTime("");
        return;
      }

      const booking = appointments.find(
        (a) =>
          String(a.booking_id ?? a.id) === String(rescheduleBookingId ?? "")
      );
      const counselorId =
        Number(
          booking?.counselor_id ??
            booking?.therapistId ??
            booking?.therapist_id ??
            booking?.c_counselor_id ??
            booking?.counselorId
        ) || null;

      if (!counselorId) {
        setRescheduleAvailableSlots([]);
        setRescheduleSelectedTime("");
        return;
      }
      try {
        const slots = await getAvailableSlots(
          counselorId,
          format(rescheduleSelectedDate, "yyyy-MM-dd")
        );
        setRescheduleAvailableSlots(Array.isArray(slots) ? slots : []);
        setRescheduleSelectedTime("");
      } catch (err) {
        console.error("Error fetching reschedule slots:", err);
        setRescheduleAvailableSlots([]);
        setRescheduleSelectedTime("");
      }
    };

    fetchSlots();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rescheduleSelectedDate, rescheduleBookingId, appointments]);

  // -------------------- STUDENT LOOKUP (on blur) --------------------
  // Calls your server proxy at: [API_BASE]/api/student-lookup?code=...
  const lookupStudentById = async (code: string) => {
    if (!code || String(code).trim() === "") return;
    try {
      const resp = await api.get("/api/student-lookup", {
        params: { code: String(code).trim() },
      });

      const data = resp?.data ?? null;
      if (!data) {
        toast.error("Student lookup returned no data");
        return;
      }

      const row = Array.isArray(data) ? data[0] : data;

      const nameCandidates = [
        row?.EmployeeName,
        row?.student_name,
        row?.name,
        row?.full_name,
        row?.StudentName,
        row?.EmployeeName,
      ];
      const emailCandidates = [row?.Email, row?.email, row?.student_email];
      const yearCandidates = [
        row?.Batch,
        row?.batch,
        row?.year,
        row?.year_level,
        row?.Year,
      ];

      const name = nameCandidates.find((v) => v !== undefined && v !== null);
      const emailVal = emailCandidates.find(
        (v) => v !== undefined && v !== null
      );
      const batch = yearCandidates.find((v) => v !== undefined && v !== null);

      if (name) setFullName(String(name));
      if (emailVal) setEmail(String(emailVal));
      if (batch) setYear(String(batch));
      toast.success("Student information auto-filled");
    } catch (err: any) {
      console.error("Student lookup error:", err);
      if (err?.response) {
        console.error(
          "student-lookup proxy axios error:",
          err.message,
          "upstreamStatus:",
          err.response.status
        );
      }
      toast.error(
        "Could not lookup student. Ensure proxy is running or check server CORS."
      );
    }
  };

  // -------------------- BOOKING / RESCHEDULE / CANCEL --------------------
  const handleBookAppointment = async () => {
    if (!selectedCounselorId || !selectedDate || !selectedTime) {
      toast.error(
        "Please complete all required fields (counselor, date, time)"
      );
      return;
    }
    if (!fullName || !email || !year) {
      toast.error("Please provide your full name, email and year");
      return;
    }

    setIsBooking(true);
    try {
      const formattedDate = format(selectedDate, "yyyy-MM-dd");
      const formattedTime =
        selectedTime.length === 5 ? `${selectedTime}:00` : selectedTime;

      const newAppointmentRaw = await bookAppointment({
        therapistId: selectedCounselorId,
        date: formattedDate,
        time: formattedTime,
        userId: user ? user.id : studentId ? studentId : undefined,
        notes: bookingNotes,
        fullName,
        email,
        year,
      } as any);

      const normalized = normalizeBookingForClient(newAppointmentRaw);

      const ownerKey = user ? user.id : email;
      try {
        await saveUserAppointment(ownerKey, normalized);
      } catch (e) {
        console.warn("Could not save booking locally:", e);
      }

      if (!user && email) {
        try {
          localStorage.setItem(LAST_GUEST_EMAIL_KEY, email);
        } catch (e) {}
        setGuestLoadedEmail(email);
        try {
          const possibleToken = localStorage.getItem(
            `${APPT_TOKEN_PREFIX}${email}`
          );
          if (possibleToken) setAuthToken(possibleToken);
          const fallback = localStorage.getItem(`mindease_token_${email}`);
          if (fallback) setAuthToken(fallback);
        } catch (e) {}
      }

      setAppointments((prev) =>
        dedupeAppointments([...(prev || []), normalized])
      );
      setTimeout(() => {
        fetchMyAppointments().catch(() => {});
      }, 700);

      setAvailableSlots((prev) => prev.filter((s) => s !== selectedTime));

      setTimeout(() => {
        if (selectedCounselorId && selectedDate) {
          getAvailableSlots(
            selectedCounselorId,
            format(selectedDate, "yyyy-MM-dd")
          )
            .then((fresh) =>
              setAvailableSlots(Array.isArray(fresh) ? fresh : [])
            )
            .catch(() => {});
        }
      }, 800);

      toast.success("Appointment booked successfully");
      setSelectedCounselorId(null);
      setSelectedCounselor(null);
      setSelectedDate(undefined);
      setAvailableSlots([]);
      setSelectedTime("");
      setBookingNotes("");
      setFullName("");
      setEmail("");
      setYear("");
      setStudentId("");
      setBookingStep(1);
      setActiveTab("upcoming");
    } catch (error) {
      console.error("Error booking appointment:", error);
      toast.error("Could not book appointment");
    } finally {
      setIsBooking(false);
    }
  };

  const openReschedule = (booking: Appointment) => {
    setRescheduleBookingId(booking.booking_id ?? booking.id ?? null);

    const dateStr = booking.booking_date ?? booking.date;
    if (dateStr) {
      try {
        const d = parseISO(String(dateStr));
        if (isValidDate(d)) setRescheduleSelectedDate(d);
        else {
          const asDate = new Date(String(dateStr));
          if (!isNaN(asDate.getTime())) setRescheduleSelectedDate(asDate);
          else setRescheduleSelectedDate(undefined);
        }
      } catch {
        setRescheduleSelectedDate(undefined);
      }
    } else {
      setRescheduleSelectedDate(undefined);
    }
    setRescheduleSelectedTime(booking.booking_time ?? booking.time ?? "");
  };

  const submitReschedule = async () => {
    if (!rescheduleBookingId) return;
    if (!rescheduleSelectedDate) {
      toast.error("Please choose a date to reschedule to.");
      return;
    }
    if (!rescheduleSelectedTime) {
      toast.error("Please choose a time slot.");
      return;
    }
    setRescheduleLoading(true);
    try {
      const newDate = format(rescheduleSelectedDate, "yyyy-MM-dd");
      if (!user) {
        const ownerEmail =
          guestLoadedEmail ?? detectGuestEmailFromLocalStorage();
        ensureGuestTokenApplied(ownerEmail ?? undefined);
      }
      const updatedRaw = await rescheduleBooking(
        rescheduleBookingId,
        newDate,
        rescheduleSelectedTime
      );

      const normalized = normalizeBookingForClient(
        updatedRaw ?? {
          booking_id: rescheduleBookingId,
          booking_date: newDate,
          booking_time: rescheduleSelectedTime,
        }
      );
      setAppointments((prev) =>
        prev.map((a) =>
          String(a.booking_id ?? a.id) === String(rescheduleBookingId)
            ? { ...a, ...normalized }
            : a
        )
      );
      const ownerKey = user
        ? user.id
        : guestLoadedEmail ?? detectGuestEmailFromLocalStorage();
      if (ownerKey) {
        try {
          await saveUserAppointment(ownerKey, normalized);
        } catch (e) {
          console.warn("Could not save updated booking locally:", e);
        }
      }
      await fetchMyAppointments();
      toast.success("Appointment rescheduled");
      setRescheduleBookingId(null);
      setRescheduleSelectedDate(undefined);
      setRescheduleAvailableSlots([]);
      setRescheduleSelectedTime("");
    } catch (err) {
      console.error("Reschedule error:", err);
      toast.error("Could not reschedule appointment");
    } finally {
      setRescheduleLoading(false);
    }
  };
  const cancelReschedule = () => {
    setRescheduleBookingId(null);
    setRescheduleSelectedDate(undefined);
    setRescheduleAvailableSlots([]);
    setRescheduleSelectedTime("");
  };

  const handleCancel = async (bookingId: string | number) => {
    try {
      if (!user) {
        const ownerEmail =
          guestLoadedEmail ?? detectGuestEmailFromLocalStorage();
        ensureGuestTokenApplied(ownerEmail ?? undefined);
      }
      const res = await updateBookingStatus(bookingId, "cancelled");

      const normalized = normalizeBookingForClient(
        res ?? { booking_id: bookingId, status: "cancelled" }
      );
      setAppointments((prev) =>
        prev.map((a) =>
          String(a.booking_id ?? a.id) === String(bookingId)
            ? { ...a, ...normalized }
            : a
        )
      );
      const ownerKey = user
        ? user.id
        : guestLoadedEmail ?? detectGuestEmailFromLocalStorage();
      if (ownerKey) {
        try {
          await saveUserAppointment(ownerKey, normalized);
        } catch (e) {
          console.warn("Could not save cancelled booking locally:", e);
        }
      }
      await fetchMyAppointments();

      toast.success("Appointment cancelled");
    } catch (err) {
      console.error("Cancel error:", err);
      toast.error("Could not cancel appointment");
    }
  };

  const isAppointmentPast = (a: Appointment): boolean => {
    const dateStr = a.booking_date ?? a.date;
    const timeStr = a.booking_time ?? a.time;

    if (!dateStr) return false;
    if (timeStr) {
      let normalizedTime = String(timeStr).trim();
      if (/^\d{1,2}:\d{2}$/.test(normalizedTime)) {
        normalizedTime = `${normalizedTime}:00`;
      }
      const combined = `${String(dateStr)}T${normalizedTime}`;
      try {
        const parsed = parseISO(combined);
        if (isValidDate(parsed)) {
          return parsed.getTime() < Date.now();
        }
      } catch (e) {}
      try {
        const parsed2 = new Date(`${dateStr} ${timeStr}`);
        if (!isNaN(parsed2.getTime())) {
          return parsed2.getTime() < Date.now();
        }
      } catch (e) {}
    }
    try {
      const parsedDate = parseISO(String(dateStr));
      if (isValidDate(parsedDate)) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const apptDay = new Date(parsedDate);
        apptDay.setHours(0, 0, 0, 0);
        return apptDay.getTime() < today.getTime();
      }
      const parsed = new Date(String(dateStr));
      if (!isNaN(parsed.getTime())) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const apptDay = new Date(parsed);
        apptDay.setHours(0, 0, 0, 0);
        return apptDay.getTime() < today.getTime();
      }
    } catch (e) {
      // ignore
    }

    return false;
  };

  // Partition into upcoming vs past based on date+time
  const pastAppointments: Appointment[] =
    appointments.filter(isAppointmentPast);
  const upcomingAppointments: Appointment[] = appointments.filter(
    (a) => !isAppointmentPast(a)
  );

  // -------------------- UI --------------------
  return (
    <div className="min-h-screen pt-6 pb-16 bg-white">
      <div className="mindease-container px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1
            className="page-heading text-lg sm:text-2xl"
            style={{ color: PRIMARY }}
          >
            Therapy Appointments
          </h1>
          <p className="text-sm sm:text-base text-gray-600">
            Schedule and manage your therapy sessions with our licensed
            professionals.
          </p>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={(val) => setActiveTab(val)}
          className="space-y-6"
        >
          {/* Tabs list: responsive horizontal scroll on mobile */}
          <div className="overflow-x-auto pb-2 -mx-4 sm:mx-0">
            <TabsList className="inline-flex gap-2 px-4 sm:px-0">
              <TabsTrigger value="upcoming" className="min-w-[110px]">
                Upcoming
              </TabsTrigger>
              <TabsTrigger value="past" className="min-w-[110px]">
                Past
              </TabsTrigger>
              <TabsTrigger value="book" className="min-w-[110px]">
                Book New
              </TabsTrigger>
            </TabsList>
          </div>

          {/* UPCOMING */}
          <TabsContent value="upcoming" className="animate-in fade-in">
            <Card>
              <CardHeader>
                <CardTitle style={{ color: PRIMARY }}>
                  Upcoming Appointments
                </CardTitle>
                <CardDescription>
                  Your scheduled therapy sessions.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="py-20 flex justify-center">
                    <Loader2
                      className="h-6 w-6 animate-spin"
                      style={{ color: PRIMARY }}
                    />
                  </div>
                ) : (
                  <>
                    {rescheduleBookingId && (
                      <Card className="mb-4">
                        <CardHeader>
                          <CardTitle style={{ color: PRIMARY }}>
                            Reschedule Appointment
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            {/* Calendar area */}
                            <div className="sm:col-span-1">
                              <div className="space-y-2">
                                <Label className="text-sm font-medium">
                                  Select a Date
                                </Label>
                                <div className="border rounded-md p-2">
                                  <Calendar
                                    mode="single"
                                    selected={rescheduleSelectedDate}
                                    onSelect={(d) =>
                                      setRescheduleSelectedDate(d as Date)
                                    }
                                    disabled={(date) =>
                                      date < new Date() ||
                                      date > addDays(new Date(), 30)
                                    }
                                    className={cn("w-full")}
                                  />
                                </div>
                              </div>
                            </div>

                            <div className="sm:col-span-2">
                              <div className="space-y-4">
                                <div>
                                  <Label className="text-sm font-medium">
                                    Available Time Slots
                                  </Label>
                                  <div className="mt-2">
                                    {rescheduleSelectedDate ? (
                                      rescheduleAvailableSlots.length > 0 ? (
                                        <>
                                          {/* mobile: horizontal scroll chips / desktop: grid */}
                                          <div className="sm:hidden flex gap-2 overflow-x-auto pb-2">
                                            {rescheduleAvailableSlots.map(
                                              (slot, idx) => (
                                                <button
                                                  key={idx}
                                                  className={cn(
                                                    "min-w-max border rounded-full py-2 px-3 text-sm transition-colors",
                                                    rescheduleSelectedTime ===
                                                      slot
                                                      ? `${GRADIENT_CLASS} text-white border-transparent`
                                                      : "hover:border-[rgba(30,58,138,0.12)]"
                                                  )}
                                                  onClick={() =>
                                                    setRescheduleSelectedTime(
                                                      slot
                                                    )
                                                  }
                                                  style={
                                                    rescheduleSelectedTime ===
                                                    slot
                                                      ? {
                                                          backgroundImage: `linear-gradient(135deg, ${PRIMARY} 0%, ${SECONDARY} 100%)`,
                                                        }
                                                      : undefined
                                                  }
                                                >
                                                  {slot}
                                                </button>
                                              )
                                            )}
                                          </div>

                                          <div className="hidden sm:grid grid-cols-3 md:grid-cols-4 gap-2">
                                            {rescheduleAvailableSlots.map(
                                              (slot, idx) => (
                                                <button
                                                  key={idx}
                                                  className={cn(
                                                    "border rounded-md py-2 px-3 text-sm transition-colors w-full",
                                                    rescheduleSelectedTime ===
                                                      slot
                                                      ? `${GRADIENT_CLASS} text-white border-transparent`
                                                      : "hover:border-[rgba(30,58,138,0.12)]"
                                                  )}
                                                  onClick={() =>
                                                    setRescheduleSelectedTime(
                                                      slot
                                                    )
                                                  }
                                                  style={
                                                    rescheduleSelectedTime ===
                                                    slot
                                                      ? {
                                                          backgroundImage: `linear-gradient(135deg, ${PRIMARY} 0%, ${SECONDARY} 100%)`,
                                                        }
                                                      : undefined
                                                  }
                                                >
                                                  {slot}
                                                </button>
                                              )
                                            )}
                                          </div>
                                        </>
                                      ) : (
                                        <div className="border rounded-md p-6 text-center text-gray-500">
                                          No available slots for this date.
                                        </div>
                                      )
                                    ) : (
                                      <div className="border rounded-md p-6 text-center text-gray-500">
                                        Select a date to view slots.
                                      </div>
                                    )}
                                  </div>
                                </div>

                                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                                  <Button
                                    onClick={submitReschedule}
                                    disabled={
                                      rescheduleLoading ||
                                      !rescheduleSelectedDate ||
                                      !rescheduleSelectedTime
                                    }
                                    className={`${GRADIENT_CLASS} text-white w-full sm:w-auto`}
                                  >
                                    {rescheduleLoading ? "Saving..." : "Save"}
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    onClick={cancelReschedule}
                                    className="w-full sm:w-auto"
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {upcomingAppointments.length > 0 ? (
                      <div className="space-y-4">
                        {upcomingAppointments.map((appointment, index) => {
                          const rawStatus =
                            appointment.status ??
                            appointment.booking_status ??
                            "pending";
                          const statusKey = String(rawStatus).toLowerCase();
                          const isCancelled =
                            statusKey === "cancelled" ||
                            statusKey === "canceled";

                          return (
                            <div
                              key={String(
                                appointment.booking_id ??
                                  appointment.id ??
                                  index
                              )}
                              className="flex flex-col sm:flex-row sm:items-center justify-between border rounded-lg p-4"
                            >
                              <div className="flex items-start sm:items-center gap-3 w-full sm:w-auto mb-3 sm:mb-0">
                                <Avatar
                                  className="h-12 w-12 flex-shrink-0 border"
                                  style={{ borderColor: PRIMARY }}
                                >
                                  <AvatarImage
                                    src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${
                                      appointment.therapistName || "therapist"
                                    }`}
                                    alt={
                                      appointment.therapistName || "Therapist"
                                    }
                                  />
                                  <AvatarFallback>
                                    {appointment.therapistName?.charAt(0) ||
                                      "T"}
                                  </AvatarFallback>
                                </Avatar>

                                <div className="flex-1 min-w-0">
                                  <h3
                                    className="font-medium truncate"
                                    style={{ color: "#111827" }}
                                  >
                                    {appointment.therapistName || "Therapist"}
                                  </h3>

                                  <div className="mt-1 flex flex-wrap items-center text-sm text-gray-500 gap-2">
                                    <div className="flex items-center gap-1">
                                      <CalendarIcon className="h-4 w-4" />
                                      <span className="truncate">
                                        {formatDisplayDate(
                                          appointment.booking_date ??
                                            appointment.date
                                        )}
                                      </span>
                                    </div>

                                    <div className="flex items-center gap-1">
                                      <Clock className="h-4 w-4" />
                                      <span className="truncate">
                                        {appointment.booking_time ??
                                          appointment.time ??
                                          "-"}
                                      </span>
                                    </div>

                                    <div className="ml-0">
                                      <span className="inline-block text-xs rounded-full px-2 py-1 bg-slate-100 text-slate-700">
                                        {(
                                          appointment.status ??
                                          appointment.booking_status ??
                                          "pending"
                                        )
                                          .toString()
                                          .replace(/^./, (s) =>
                                            s.toUpperCase()
                                          )}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              <div className="flex flex-col sm:flex-row gap-2">
                                {isCancelled ? (
                                  <span className="text-sm px-3 py-2 rounded-md bg-red-50 text-red-600">
                                    Cancelled
                                  </span>
                                ) : (
                                  <>
                                    <Button
                                      variant="destructive"
                                      size="sm"
                                      onClick={() =>
                                        handleCancel(
                                          appointment.booking_id ??
                                            appointment.id ??
                                            ""
                                        )
                                      }
                                      className="w-full sm:w-auto"
                                    >
                                      Cancel
                                    </Button>
                                  </>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="py-10 text-center">
                        <p className="text-gray-500 mb-4">
                          You have no upcoming appointments.
                        </p>
                        <Button
                          className={`${GRADIENT_CLASS} text-white w-full sm:w-auto`}
                          onClick={() => setActiveTab("book")}
                        >
                          Book a Session
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* PAST */}
          <TabsContent value="past">
            <Card>
              <CardHeader>
                <CardTitle style={{ color: PRIMARY }}>
                  Past Appointments
                </CardTitle>
                <CardDescription>
                  Your previous therapy sessions.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="py-20 flex justify-center">
                    <Loader2
                      className="h-6 w-6 animate-spin"
                      style={{ color: PRIMARY }}
                    />
                  </div>
                ) : pastAppointments.length > 0 ? (
                  <div className="space-y-4">
                    {pastAppointments.map((appointment, idx) => {
                      const rawStatus =
                        appointment.status ??
                        appointment.booking_status ??
                        "pending";
                      return (
                        <div
                          key={String(
                            appointment.booking_id ?? appointment.id ?? idx
                          )}
                          className="flex flex-col sm:flex-row items-start sm:items-center justify-between border rounded-lg p-4"
                        >
                          <div className="flex items-start sm:items-center gap-3 w-full sm:w-auto mb-3 sm:mb-0">
                            <Avatar
                              className="h-12 w-12 flex-shrink-0 border"
                              style={{ borderColor: PRIMARY }}
                            >
                              <AvatarImage
                                src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${
                                  appointment.therapistName || "therapist"
                                }`}
                                alt={appointment.therapistName || "Therapist"}
                              />
                              <AvatarFallback>
                                {appointment.therapistName?.charAt(0) || "T"}
                              </AvatarFallback>
                            </Avatar>

                            <div className="min-w-0">
                              <div
                                className="font-medium truncate"
                                style={{ color: "#111827" }}
                              >
                                {appointment.therapistName || "Therapist"}
                              </div>
                              <div className="text-sm text-gray-500 truncate">
                                {formatDisplayDate(
                                  appointment.booking_date ?? appointment.date
                                )}{" "}
                                •{" "}
                                {appointment.booking_time ??
                                  appointment.time ??
                                  "-"}
                              </div>
                            </div>
                          </div>

                          <div className="text-sm text-gray-500 mt-2 sm:mt-0">
                            {(rawStatus ?? "pending")
                              .toString()
                              .replace(/^./, (s) => s.toUpperCase())}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-10 text-center">
                    <p className="text-gray-500 mb-4">No past appointments.</p>
                    <Button
                      className={`${GRADIENT_CLASS} text-white w-full sm:w-auto`}
                      onClick={() => setActiveTab("book")}
                    >
                      Book a Session
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* BOOK */}
          <TabsContent value="book" className="animate-in fade-in">
            <Card>
              <CardHeader>
                <CardTitle style={{ color: PRIMARY }}>
                  Book a Therapy Session
                </CardTitle>
                <CardDescription>
                  Schedule a new appointment with one of our licensed
                  therapists.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {bookingStep === 1 && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="counselor" className="text-base">
                        Select a Therapist
                      </Label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-2">
                        {counselors.length === 0 && !isLoading ? (
                          <div className="col-span-3 text-center text-gray-500 p-6 border rounded">
                            No counselors available right now.
                          </div>
                        ) : (
                          counselors.map((c) => (
                            <div
                              key={c.id}
                              className={cn(
                                "border rounded-lg p-3 cursor-pointer transition-colors flex items-center gap-3"
                              )}
                              onClick={() => {
                                setSelectedCounselorId(c.id);
                                setSelectedCounselor(c);
                              }}
                              style={
                                selectedCounselorId === c.id
                                  ? {
                                      borderColor: PRIMARY,
                                      backgroundColor: "rgba(30,58,138,0.04)",
                                    }
                                  : undefined
                              }
                            >
                              <Avatar className="h-10 w-10">
                                <AvatarImage
                                  src={c.avatar ?? makeAvatar(c.name)}
                                  alt={c.name}
                                />
                                <AvatarFallback>
                                  {c.name?.charAt(0) ?? "C"}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <h3
                                  className="font-medium truncate"
                                  style={{ color: "#111827" }}
                                >
                                  {c.name}
                                </h3>
                                {c.specialty && (
                                  <p className="text-xs text-gray-500 truncate">
                                    {c.specialty}
                                  </p>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    <Button
                      onClick={() => setBookingStep(2)}
                      disabled={!selectedCounselorId}
                      className={`${GRADIENT_CLASS} text-white w-full mt-2`}
                    >
                      Continue
                    </Button>
                  </div>
                )}

                {bookingStep === 2 && (
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                      <Button
                        variant="ghost"
                        className="-ml-1 px-2"
                        onClick={() => setBookingStep(1)}
                      >
                        ← Back to therapists
                      </Button>

                      {selectedCounselor && (
                        <div
                          className="flex items-center border rounded-full pl-2 pr-3 py-1"
                          style={{ borderColor: PRIMARY }}
                        >
                          <Avatar className="h-8 w-8 mr-2">
                            <AvatarImage
                              src={selectedCounselor.avatar}
                              alt={selectedCounselor.name}
                            />
                            <AvatarFallback>
                              {selectedCounselor.name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <span
                            className="text-sm font-medium"
                            style={{ color: "#111827" }}
                          >
                            {selectedCounselor.name}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label className="text-base">Select a Date</Label>
                      <div className="border rounded-md p-2">
                        <Calendar
                          mode="single"
                          selected={selectedDate}
                          onSelect={setSelectedDate}
                          disabled={(date) =>
                            date < new Date() || date > addDays(new Date(), 30)
                          }
                          className={cn("w-full")}
                        />
                      </div>
                    </div>

                    {selectedDate && (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label className="text-base">
                            Available Time Slots
                          </Label>

                          {availableSlots.length > 0 ? (
                            <>
                              {/* mobile: chips in horizontal scroll */}
                              <div className="sm:hidden flex gap-2 overflow-x-auto pb-2">
                                {availableSlots.map((slot, index) => (
                                  <button
                                    key={index}
                                    className={cn(
                                      "min-w-max border rounded-full py-2 px-3 text-sm transition-colors",
                                      selectedTime === slot
                                        ? `${GRADIENT_CLASS} text-white border-transparent`
                                        : "hover:border-[rgba(30,58,138,0.12)]"
                                    )}
                                    onClick={() => setSelectedTime(slot)}
                                    style={
                                      selectedTime === slot
                                        ? {
                                            backgroundImage: `linear-gradient(135deg, ${PRIMARY} 0%, ${SECONDARY} 100%)`,
                                          }
                                        : undefined
                                    }
                                  >
                                    {slot}
                                  </button>
                                ))}
                              </div>

                              <div className="hidden sm:grid grid-cols-3 md:grid-cols-5 gap-2">
                                {availableSlots.map((slot, index) => (
                                  <button
                                    key={index}
                                    className={cn(
                                      "border rounded-md py-2 px-3 text-sm transition-colors w-full",
                                      selectedTime === slot
                                        ? `${GRADIENT_CLASS} text-white border-transparent`
                                        : "hover:border-[rgba(30,58,138,0.12)]"
                                    )}
                                    onClick={() => setSelectedTime(slot)}
                                    style={
                                      selectedTime === slot
                                        ? {
                                            backgroundImage: `linear-gradient(135deg, ${PRIMARY} 0%, ${SECONDARY} 100%)`,
                                          }
                                        : undefined
                                    }
                                  >
                                    {slot}
                                  </button>
                                ))}
                              </div>
                            </>
                          ) : (
                            <div className="border rounded-md p-6 text-center text-gray-500">
                              No available slots for this date. Please select
                              another date.
                            </div>
                          )}
                        </div>

                        {selectedTime && (
                          <div className="space-y-3">
                            <div className="space-y-2">
                              <Label htmlFor="studentId">
                                Student ID / Code
                              </Label>
                              <Input
                                id="studentId"
                                placeholder="Enter your Student ID"
                                value={studentId}
                                onChange={(e) => setStudentId(e.target.value)}
                                onBlur={() => lookupStudentById(studentId)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    lookupStudentById(studentId);
                                  }
                                }}
                              />
                              <p className="text-xs text-gray-500">
                                Enter your Student ID and move focus away to
                                auto-fill name, email and year.
                              </p>
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="fullName">Full Name</Label>
                              <Input
                                id="fullName"
                                placeholder="Full name (auto-filled)"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                              />
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="email">Email ID</Label>
                              <Input
                                id="email"
                                type="email"
                                placeholder="Enter your university email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                              />
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="year">UG/PG Year</Label>
                              <Input
                                id="year"
                                placeholder="Auto-filled from Student ID"
                                value={year}
                                onChange={(e) => setYear(e.target.value)}
                              />
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="notes">
                                Additional Notes (optional)
                              </Label>
                              <Textarea
                                id="notes"
                                placeholder="Please share any specific concerns or topics you'd like to discuss"
                                value={bookingNotes}
                                onChange={(e) =>
                                  setBookingNotes(e.target.value)
                                }
                              />
                            </div>

                            <Button
                              className={`${GRADIENT_CLASS} text-white w-full`}
                              disabled={
                                !selectedDate || !selectedTime || isBooking
                              }
                              onClick={handleBookAppointment}
                            >
                              {isBooking ? (
                                <>
                                  <Loader2
                                    className="mr-2 h-4 w-4 animate-spin"
                                    style={{ color: "#fff" }}
                                  />
                                  Booking...
                                </>
                              ) : (
                                "Confirm Booking"
                              )}
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Appointments;
