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
} from "lucide-react";
import { Progress } from "@/components/ui/progress";

const AdminDashboard: React.FC = () => {
  interface AnalyticsData {
    userCount: number;
    activeUsers: number;
    blogPosts: number;
    communityPosts: number;
    bookingsToday?: number;
    moodDistribution: {
      name: string;
      excellent: number;
      good: number;
      neutral: number;
      poor: number;
      bad: number;
    }[];
    appointments: {
      completed: number;
      upcoming: number;
      cancelled: number;
      total: number;
    };
  }

  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const isDark = useDetectDarkMode();

  // Theme constants (visuals remain consistent; charts get lighter variant in dark mode)
  const PRIMARY = "#1e3a8a";
  const SECONDARY = "#3b82f6";
  const GRADIENT = "linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)";

  // Color definitions
  const colors = {
    green: isDark ? "#34d399" : "#10b981",
    blue: isDark ? "#60a5fa" : "#3b82f6",
    violet: isDark ? "#a78bfa" : "#8b5cf6",
    orange: isDark ? "#fbbf24" : "#f59e0b",
  };

  // Lighter variants for dark mode charts
  const MOOD_COLORS = isDark
    ? ["#34d399", "#6ee7b7", "#60a5fa", "#a78bfa", "#fbbf24"]
    : ["#10b981", "#34d399", "#3b82f6", "#8b5cf6", "#f59e0b"];

  const PIE_COLORS = isDark
    ? ["#34d399", "#60a5fa", "#fbbf24"]
    : ["#10b981", "#3b82f6", "#f59e0b"];

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        const data = await getSystemAnalytics();
        setAnalytics(data);
      } catch (error) {
        console.error("Error fetching analytics data:", error);
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

  return (
    <div
      className={`min-h-screen pt-16 pb-4 ${
        isDark ? "bg-gray-900" : "bg-white"
      }`}
    >
      {/* expose CSS vars for nested components
          NOTE: increased container width (max-w-full) and horizontal padding so cards use more horizontal space */}
      <div
        style={
          {
            "--m-theme-primary": PRIMARY,
            "--m-theme-secondary": SECONDARY,
            "--m-theme-grad": GRADIENT,
          } as React.CSSProperties
        }
        className={`mindease-container mx-auto max-w-full px-6 ${
          isDark ? "text-gray-300" : ""
        }`}
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
            Monitor bookings and active sessions for students
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          {/* === Bookings Today (replaces Total Users) === */}
          <Card
            className="rounded-3xl h-full w-full"
            style={{ borderRadius: "1.25rem" }}
          >
            <CardContent className="pt-6">
              <div className="flex justify-between items-start">
                <div>
                  <p
                    className="text-sm font-medium"
                    style={{ color: colors.green }}
                  >
                    Bookings Today
                  </p>
                  <div
                    className="text-2xl font-bold mt-1"
                    style={{ color: colors.green }}
                  >
                    {analytics.bookingsToday ?? 0}
                  </div>
                </div>
                <div
                  className="rounded-md p-2"
                  style={{
                    background: isDark
                      ? "rgba(16, 185, 129, 0.12)"
                      : "rgba(16, 185, 129, 0.08)",
                    color: colors.green,
                  }}
                >
                  <CalendarIcon className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card
            className="rounded-3xl h-full w-full"
            style={{ borderRadius: "1.25rem" }}
          >
            <CardContent className="pt-6">
              <div className="flex justify-between items-start">
                <div>
                  <p
                    className="text-sm font-medium"
                    style={{ color: colors.blue }}
                  >
                    Active Sessions
                  </p>
                  <div
                    className="text-2xl font-bold mt-1"
                    style={{ color: colors.blue }}
                  >
                    {analytics.appointments.upcoming}
                  </div>
                </div>
                <div
                  className="rounded-md p-2"
                  style={{
                    background: isDark
                      ? "rgba(59, 130, 246, 0.12)"
                      : "rgba(59, 130, 246, 0.08)",
                    color: colors.blue,
                  }}
                >
                  <CalendarIcon className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card
            className="rounded-3xl h-full w-full"
            style={{ borderRadius: "1.25rem" }}
          >
            <CardContent className="pt-6">
              <div className="flex justify-between items-start">
                <div>
                  <p
                    className="text-sm font-medium"
                    style={{ color: colors.violet }}
                  >
                    Session Notes
                  </p>
                  <div
                    className="text-2xl font-bold mt-1"
                    style={{ color: colors.violet }}
                  >
                    {analytics.blogPosts}
                  </div>
                </div>
                <div
                  className="rounded-md p-2"
                  style={{
                    background: isDark
                      ? "rgba(139, 92, 246, 0.12)"
                      : "rgba(139, 92, 246, 0.08)",
                    color: colors.violet,
                  }}
                >
                  <BookOpen className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card
            className="rounded-3xl h-full w-full"
            style={{ borderRadius: "1.25rem" }}
          >
            <CardContent className="pt-6">
              <div className="flex justify-between items-start">
                <div>
                  <p
                    className="text-sm font-medium"
                    style={{ color: colors.orange }}
                  >
                    Total Bookings
                  </p>
                  <div
                    className="text-2xl font-bold mt-1"
                    style={{ color: colors.orange }}
                  >
                    {analytics.communityPosts}
                  </div>
                </div>
                <div
                  className="rounded-md p-2"
                  style={{
                    background: isDark
                      ? "rgba(245, 158, 11, 0.12)"
                      : "rgba(245, 158, 11, 0.08)",
                    color: colors.orange,
                  }}
                >
                  <MessageSquare className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Mood Distribution Chart */}
          <Card
            className="rounded-3xl w-full"
            style={{ borderRadius: "1.25rem" }}
          >
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
              {/* reduced height to prevent excessive scrolling */}
              <div className="h-[160px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={analytics.moodDistribution}
                    margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
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
                    {/* disallow decimals and format ticks as whole numbers */}
                    <YAxis
                      stroke={isDark ? "#cbd5e1" : "#374151"}
                      allowDecimals={false}
                      tickFormatter={(v) => `${Math.round(Number(v))}`}
                    />
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
                      fill={MOOD_COLORS[0]}
                      name="Excellent"
                    />
                    <Bar
                      dataKey="good"
                      stackId="a"
                      fill={MOOD_COLORS[1]}
                      name="Good"
                    />
                    <Bar
                      dataKey="neutral"
                      stackId="a"
                      fill={MOOD_COLORS[2]}
                      name="Neutral"
                    />
                    <Bar
                      dataKey="poor"
                      stackId="a"
                      fill={MOOD_COLORS[3]}
                      name="Poor"
                    />
                    <Bar
                      dataKey="bad"
                      stackId="a"
                      fill={MOOD_COLORS[4]}
                      name="Bad"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Appointment Stats */}
          <Card
            className="rounded-3xl w-full"
            style={{ borderRadius: "1.25rem" }}
          >
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
              {/* reduced height for the pie area so the whole card is shorter */}
              <div className="h-[140px] mb-4">
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
                      outerRadius={60}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) =>
                        `${name} ${(percent * 100).toFixed(0)}%`
                      }
                    >
                      {[0, 1, 2].map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={PIE_COLORS[index % PIE_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-2">
                {["completed", "upcoming", "cancelled"].map((key, index) => {
                  const val = analytics.appointments[
                    key as keyof typeof analytics.appointments
                  ] as number;
                  const pct = analytics.appointments.total
                    ? (val / analytics.appointments.total) * 100
                    : 0;
                  const progressColor = PIE_COLORS[index];
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
                        indicatorColor={progressColor}
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
