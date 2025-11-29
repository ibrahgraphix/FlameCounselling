// src/pages/AdminDashboard.tsx
import React, { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  useDetectDarkMode,
} from "@/components/ui/card";
import { getSystemAnalytics } from "@/services/api";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  Loader2,
  Calendar as CalendarIcon,
  BookOpen,
  MessageSquare,
  MessageCircle,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface MoodBucket {
  name: string;
  excellent: number;
  good: number;
  neutral: number;
  poor: number;
  bad: number;
}

interface AppointmentsSummary {
  completed: number;
  upcoming: number;
  cancelled: number;
  total: number;
}

interface AnalyticsData {
  userCount: number;
  activeUsers: number;
  blogPosts: number;
  communityPosts: number;
  bookingsToday?: number;
  moodDistribution: MoodBucket[];
  appointments: AppointmentsSummary;
}

function parseJwt(token?: string | null) {
  if (!token) return null;
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const payload = parts[1];
    // add padding if needed
    const pad = payload.length % 4;
    const base64 =
      payload.replace(/-/g, "+").replace(/_/g, "/") +
      (pad ? "=".repeat(4 - pad) : "");
    const json = atob(base64);
    return JSON.parse(json);
  } catch (e) {
    // malformed token
    return null;
  }
}

function getStoredUser(): {
  role?: string;
  id?: string | number;
  isAdmin?: boolean;
} | null {
  try {
    const keys = ["currentUser", "user", "profile"];
    for (const k of keys) {
      const raw = localStorage.getItem(k);
      if (raw) {
        try {
          const obj = JSON.parse(raw);
          if (obj) {
            return {
              role:
                (obj.role as string) ||
                (obj.roles && obj.roles[0]) ||
                undefined,
              id: obj.id || obj.userId || obj.counselorId,
              isAdmin: !!(obj.isAdmin || obj.admin),
            };
          }
        } catch {
          // ignore parse error
        }
      }
    }

    // Try parsing JWT from token key
    const token =
      localStorage.getItem("token") || localStorage.getItem("authToken");
    const payload = parseJwt(token);
    if (payload) {
      return {
        role: payload.role || payload.roles || payload.userRole,
        id: payload.id || payload.userId || payload.sub,
        isAdmin:
          payload.role === "admin" ||
          payload.isAdmin === true ||
          payload.admin === true,
      };
    }
  } catch (e) {
    // ignore any localStorage errors
  }
  return null;
}

const AdminDashboard: React.FC = () => {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const isDark = useDetectDarkMode();

  // Theme constants
  const PRIMARY = "#1e3a8a";
  const SECONDARY = "#3b82f6";
  const GRADIENT = "linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)";

  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true);

      // Determine user role & id from localStorage / token
      const stored = getStoredUser();
      const isAdmin =
        stored?.isAdmin ||
        (typeof stored?.role === "string" &&
          ["admin", "administrator", "superadmin"].includes(
            String(stored.role).toLowerCase()
          ));

      // If not admin and we have an id, treat user as counselor and request counselor-specific data
      const counselorId =
        !isAdmin && stored?.id !== undefined && stored?.id !== null
          ? String(stored!.id)
          : undefined;

      try {
        const params = counselorId ? { counselorId } : undefined;
        const data = await (getSystemAnalytics as any)(params);
        setAnalytics(data);
      } catch (error) {
        console.error("Error fetching analytics data:", error);
        setAnalytics(null);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  if (loading)
    return (
      <div
        className={`min-h-screen flex items-center justify-center ${
          isDark ? "bg-gray-900" : "bg-white"
        }`}
      >
        <div className="flex items-center gap-2">
          <Loader2
            className="h-8 w-8 animate-spin"
            style={{ color: PRIMARY }}
          />
          <span
            className={`text-lg font-medium ${
              isDark ? "text-gray-300" : "text-gray-700"
            }`}
          >
            Loading dashboard data...
          </span>
        </div>
      </div>
    );

  if (!analytics)
    return (
      <div
        className={`min-h-screen flex items-center justify-center ${
          isDark ? "bg-gray-900" : "bg-white"
        }`}
      >
        <div className="text-center">
          <p
            className={`text-xl mb-2 ${
              isDark ? "text-red-400" : "text-red-500"
            }`}
          >
            Error loading analytics data
          </p>
          <p
            className={`text-muted-foreground ${
              isDark ? "text-gray-400" : "text-gray-600"
            }`}
          >
            Please try refreshing the page
          </p>
        </div>
      </div>
    );

  const CHART_COLORS = isDark
    ? ["#93c5fd", "#60a5fa", "#3b82f6", "#60a5fa", "#93c5fd"]
    : [PRIMARY, SECONDARY, "#60a5fa", "#93cfd", "#c7e0ff"];

  return (
    <div
      className={`min-h-screen pt-6 pb-16 ${
        isDark ? "bg-gray-900" : "bg-white"
      }`}
    >
      <div
        style={
          {
            "--m-theme-primary": PRIMARY,
            "--m-theme-secondary": SECONDARY,
            "--m-theme-grad": GRADIENT,
          } as React.CSSProperties
        }
        className={`mindease-container ${isDark ? "text-gray-300" : ""}`}
      >
        <div className="mb-8">
          <h1
            className="page-heading"
            style={{ color: isDark ? "#e6eefc" : undefined }}
          >
            Dashboard
          </h1>
          <p
            className="text-muted-foreground"
            style={{ color: isDark ? "#cbd5e1" : undefined }}
          >
            Monitor system performance, user activity, and manage platform
            content.
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Bookings Today */}
          <Card
            className="rounded-3xl h-full"
            style={{ borderRadius: "1.25rem" }}
          >
            <CardContent className="pt-6">
              <div className="flex justify-between items-start">
                <div>
                  <p
                    className="text-sm font-medium text-muted-foreground"
                    style={{ color: isDark ? "#cbd5e1" : undefined }}
                  >
                    Bookings Today
                  </p>
                  <div
                    className="text-2xl font-bold mt-1"
                    style={{ color: isDark ? "#e6eefc" : undefined }}
                  >
                    {analytics.bookingsToday ?? 0}
                  </div>
                </div>
                <div
                  className="rounded-md p-2"
                  style={{
                    background: isDark
                      ? "rgba(30,58,138,0.12)"
                      : "rgba(30,58,138,0.08)",
                    color: PRIMARY,
                  }}
                >
                  <CalendarIcon className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Active Sessions */}
          <Card
            className="rounded-3xl h-full"
            style={{ borderRadius: "1.25rem" }}
          >
            <CardContent className="pt-6">
              <div className="flex justify-between items-start">
                <div>
                  <p
                    className="text-sm font-medium text-muted-foreground"
                    style={{ color: isDark ? "#cbd5e1" : undefined }}
                  >
                    Active Sessions
                  </p>
                  <div
                    className="text-2xl font-bold mt-1"
                    style={{ color: isDark ? "#e6eefc" : undefined }}
                  >
                    {analytics.appointments.upcoming}
                  </div>
                </div>
                <div
                  className="rounded-md p-2"
                  style={{
                    background: isDark
                      ? "rgba(59,130,246,0.12)"
                      : "rgba(59,130,246,0.08)",
                    color: SECONDARY,
                  }}
                >
                  <CalendarIcon className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Session Notes */}
          <Card
            className="rounded-3xl h-full"
            style={{ borderRadius: "1.25rem" }}
          >
            <CardContent className="pt-6">
              <div className="flex justify-between items-start">
                <div>
                  <p
                    className="text-sm font-medium text-muted-foreground"
                    style={{ color: isDark ? "#cbd5e1" : undefined }}
                  >
                    Session Notes
                  </p>
                  <div
                    className="text-2xl font-bold mt-1"
                    style={{ color: isDark ? "#e6eefc" : undefined }}
                  >
                    {analytics.blogPosts}
                  </div>
                </div>
                <div
                  className="rounded-md p-2"
                  style={{
                    background: isDark
                      ? "linear-gradient(135deg, rgba(30,58,138,0.12), rgba(59,130,246,0.06))"
                      : "linear-gradient(135deg, rgba(30,58,138,0.06), rgba(59,130,246,0.04))",
                    color: PRIMARY,
                  }}
                >
                  <BookOpen className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Total Bookings */}
          <Card
            className="rounded-3xl h-full"
            style={{ borderRadius: "1.25rem" }}
          >
            <CardContent className="pt-6">
              <div className="flex justify-between items-start">
                <div>
                  <p
                    className="text-sm font-medium text-muted-foreground"
                    style={{ color: isDark ? "#cbd5e1" : undefined }}
                  >
                    Total Bookings
                  </p>
                  <div
                    className="text-2xl font-bold mt-1"
                    style={{ color: isDark ? "#e6eefc" : undefined }}
                  >
                    {analytics.communityPosts}
                  </div>
                </div>
                <div
                  className="rounded-md p-2"
                  style={{
                    background: isDark
                      ? "rgba(59,130,246,0.08)"
                      : "rgba(59,130,246,0.06)",
                    color: SECONDARY,
                  }}
                >
                  <MessageSquare className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Mood Distribution Chart */}
          <Card className="rounded-3xl" style={{ borderRadius: "1.25rem" }}>
            <CardHeader>
              <CardTitle style={{ color: isDark ? "#e6eefc" : undefined }}>
                Weekly Mood Distribution
              </CardTitle>
              <CardDescription
                style={{ color: isDark ? "#cbd5e1" : undefined }}
              >
                Aggregate user mood data by day
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[340px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={analytics.moodDistribution}
                    margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke={isDark ? "#0b1426" : "#e6eefc"}
                    />
                    <XAxis
                      dataKey="name"
                      stroke={isDark ? "#cbd5e1" : "#374151"}
                    />
                    <YAxis stroke={isDark ? "#cbd5e1" : "#374151"} />
                    <Tooltip
                      wrapperStyle={{
                        borderRadius: 8,
                        boxShadow: "0 6px 18px rgba(30,58,138,0.08)",
                      }}
                    />
                    <Legend />
                    <Bar
                      dataKey="excellent"
                      stackId="a"
                      fill={CHART_COLORS[0]}
                      name="Excellent"
                    />
                    <Bar
                      dataKey="good"
                      stackId="a"
                      fill={CHART_COLORS[1]}
                      name="Good"
                    />
                    <Bar
                      dataKey="neutral"
                      stackId="a"
                      fill={CHART_COLORS[2]}
                      name="Neutral"
                    />
                    <Bar
                      dataKey="poor"
                      stackId="a"
                      fill={CHART_COLORS[3]}
                      name="Poor"
                    />
                    <Bar
                      dataKey="bad"
                      stackId="a"
                      fill={CHART_COLORS[4]}
                      name="Bad"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Appointment Stats */}
          <Card className="rounded-3xl" style={{ borderRadius: "1.25rem" }}>
            <CardHeader>
              <CardTitle style={{ color: isDark ? "#e6eefc" : undefined }}>
                Appointment Statistics
              </CardTitle>
              <CardDescription
                style={{ color: isDark ? "#cbd5e1" : undefined }}
              >
                Overview of therapy sessions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] mb-6">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        {
                          name: "Completed",
                          value: analytics.appointments.completed,
                        },
                        {
                          name: "Upcoming",
                          value: analytics.appointments.upcoming,
                        },
                        {
                          name: "Cancelled",
                          value: analytics.appointments.cancelled,
                        },
                      ]}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) =>
                        `${name} ${(percent * 100).toFixed(0)}%`
                      }
                    >
                      {[0, 1, 2].map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={CHART_COLORS[index % CHART_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-4">
                {["completed", "upcoming", "cancelled"].map((key) => {
                  const val = analytics.appointments[
                    key as keyof AppointmentsSummary
                  ] as number;
                  const pct = analytics.appointments.total
                    ? (val / analytics.appointments.total) * 100
                    : 0;
                  return (
                    <div key={key} className="space-y-1">
                      <div
                        className="flex justify-between text-sm"
                        style={{ color: isDark ? "#cbd5e1" : undefined }}
                      >
                        <span>
                          {key.charAt(0).toUpperCase() + key.slice(1)}
                        </span>
                        <span className="font-medium">{val}</span>
                      </div>
                      <Progress
                        value={pct}
                        className="h-2 rounded-full"
                        style={{
                          backgroundColor: isDark
                            ? "rgba(255,255,255,0.04)"
                            : "rgba(30,58,138,0.12)",
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
