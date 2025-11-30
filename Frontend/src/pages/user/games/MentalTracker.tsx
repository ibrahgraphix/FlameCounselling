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
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { getMoodEntries, saveMoodEntry } from "@/services/api";
import api from "@/services/api"; // axios instance
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { CalendarIcon, Loader2 } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import { toast } from "@/components/ui/sonner";
import { Badge } from "@/components/ui/badge";

const PRIMARY = "#1e3a8a";
const SECONDARY = "#3b82f6";
const GRADIENT_CLASS = "bg-[linear-gradient(135deg,#1e3a8a_0%,#3b82f6_100%)]";

const getMoodLabel = (value: number) => {
  const labels = ["Very Poor", "Poor", "Neutral", "Good", "Excellent"];
  return labels[Math.max(0, Math.min(4, (value || 3) - 1))];
};

const getAnxietyLabel = (value: number) => {
  const labels = ["Severe", "High", "Moderate", "Mild", "Minimal"];
  return labels[Math.max(0, Math.min(4, (value || 3) - 1))];
};

const getSleepLabel = (value: number) => {
  const labels = ["Very Poor", "Poor", "Fair", "Good", "Excellent"];
  return labels[Math.max(0, Math.min(4, (value || 3) - 1))];
};

const MentalTracker: React.FC = () => {
  const { user } = useAuth();
  const [date, setDate] = useState<Date>(new Date());
  const [mood, setMood] = useState<number>(3);
  const [anxiety, setAnxiety] = useState<number>(3);
  const [sleep, setSleep] = useState<number>(3);
  const [notes, setNotes] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  interface MoodEntry {
    date: string;
    mood: number;
    anxiety: number;
    sleep: number;
    notes?: string;
    timestamp?: string;
  }

  const [entries, setEntries] = useState<MoodEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"entry" | "insights" | "history">(
    "entry"
  );

  useEffect(() => {
    const fetchEntries = async () => {
      setLoading(true);
      try {
        if (user) {
          const fetchedEntries = await getMoodEntries(user.id);
          const normalized = (fetchedEntries || []).map((e: any) => ({
            date: e.date,
            mood: Number(e.mood),
            anxiety: Number(e.anxiety),
            sleep: Number(e.sleep),
            notes: e.notes ?? "",
            timestamp: e.timestamp ?? null,
          }));
          setEntries(normalized);
        }
      } catch (error) {
        console.error("Error fetching mood entries:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchEntries();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("You must be logged in to save entries");
      return;
    }

    setIsSubmitting(true);

    const entry = {
      date: format(date, "yyyy-MM-dd"),
      mood: Number(mood),
      anxiety: Number(anxiety),
      sleep: Number(sleep),
      notes,
    };

    try {
      // Save locally (existing behavior + fallback)
      await saveMoodEntry(user.id, entry);

      // Attempt to send to backend so the admin weekly aggregation picks it up
      try {
        const payload = {
          user_id: user.id ?? null,
          date: entry.date,
          mood: entry.mood,
          anxiety: entry.anxiety,
          sleep: entry.sleep,
          notes: entry.notes ?? "",
          source: "mental-tracker",
        };
        await api.post("/api/games/mood", payload);
      } catch (err) {
        // log but do not block UI — localStorage remains as fallback
        console.warn("POST /api/games/mood failed:", err);
      }

      // Refresh local entries from whichever source (localStorage)
      const updatedEntries = await getMoodEntries(user.id);
      const normalized = (updatedEntries || []).map((e: any) => ({
        date: e.date,
        mood: Number(e.mood),
        anxiety: Number(e.anxiety),
        sleep: Number(e.sleep),
        notes: e.notes ?? "",
        timestamp: e.timestamp ?? null,
      }));
      setEntries(normalized);
      toast.success("Your mood has been recorded");

      // Reset form
      setDate(new Date());
      setMood(3);
      setAnxiety(3);
      setSleep(3);
      setNotes("");
      setActiveTab("insights");
    } catch (error) {
      console.error("Error saving mood entry:", error);
      toast.error("Failed to save your mood entry");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Process entries for charts (last 14)
  const processedEntries = [...entries]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(-14)
    .map((entry) => ({
      date: format(new Date(entry.date), "MMM dd"),
      mood: entry.mood,
      anxiety: entry.anxiety,
      sleep: entry.sleep,
    }));

  const mockEntries = [
    { date: "Apr 19", mood: 3, anxiety: 4, sleep: 2 },
    { date: "Apr 20", mood: 2, anxiety: 3, sleep: 2 },
    { date: "Apr 21", mood: 2, anxiety: 3, sleep: 3 },
    { date: "Apr 22", mood: 3, anxiety: 4, sleep: 3 },
    { date: "Apr 23", mood: 3, anxiety: 3, sleep: 4 },
    { date: "Apr 24", mood: 4, anxiety: 4, sleep: 4 },
    { date: "Apr 25", mood: 4, anxiety: 5, sleep: 3 },
    { date: "Apr 26", mood: 3, anxiety: 4, sleep: 3 },
    { date: "Apr 27", mood: 3, anxiety: 3, sleep: 3 },
    { date: "Apr 28", mood: 2, anxiety: 2, sleep: 2 },
    { date: "Apr 29", mood: 3, anxiety: 3, sleep: 3 },
    { date: "Apr 30", mood: 4, anxiety: 4, sleep: 4 },
    { date: "May 01", mood: 4, anxiety: 4, sleep: 4 },
    { date: "May 02", mood: 5, anxiety: 5, sleep: 5 },
  ];

  const chartData =
    processedEntries.length > 0 ? processedEntries : mockEntries;

  return (
    <div className="min-h-screen pt-6 pb-16 bg-white">
      <div className="mindease-container">
        <div className="mb-8">
          <h1 className="page-heading" style={{ color: PRIMARY }}>
            Mental Health Tracker
          </h1>
          <p className="text-gray-600">
            Track your daily mood, anxiety, and sleep patterns to gain insights
            into your mental wellbeing.
          </p>
        </div>

        <div className="mb-6 flex space-x-4 border-b">
          <button
            className={cn(
              "pb-2 font-medium",
              activeTab === "entry"
                ? `border-b-2 text-[${PRIMARY}] border-[${PRIMARY}]`
                : "text-gray-500"
            )}
            onClick={() => setActiveTab("entry")}
            style={
              activeTab === "entry"
                ? { color: PRIMARY, borderBottomColor: PRIMARY }
                : undefined
            }
          >
            Log Today
          </button>
          <button
            className={cn(
              "pb-2 font-medium",
              activeTab === "insights"
                ? `border-b-2 text-[${PRIMARY}] border-[${PRIMARY}]`
                : "text-gray-500"
            )}
            onClick={() => setActiveTab("insights")}
            style={
              activeTab === "insights"
                ? { color: PRIMARY, borderBottomColor: PRIMARY }
                : undefined
            }
          >
            Insights
          </button>
          <button
            className={cn(
              "pb-2 font-medium",
              activeTab === "history"
                ? `border-b-2 text-[${PRIMARY}] border-[${PRIMARY}]`
                : "text-gray-500"
            )}
            onClick={() => setActiveTab("history")}
            style={
              activeTab === "history"
                ? { color: PRIMARY, borderBottomColor: PRIMARY }
                : undefined
            }
          >
            History
          </button>
        </div>

        {activeTab === "entry" && (
          <Card>
            <form onSubmit={handleSubmit}>
              <CardHeader>
                <CardTitle style={{ color: PRIMARY }}>Log Your Mood</CardTitle>
                <CardDescription>
                  Record how you're feeling today to track patterns over time.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Date Picker */}
                <div className="space-y-2">
                  <Label htmlFor="date">Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        id="date"
                        variant={"outline"}
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !date && "text-gray-400"
                        )}
                        style={{ borderColor: PRIMARY, color: "#111827" }}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {date ? format(date, "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={date}
                        onSelect={(newDate) => newDate && setDate(newDate)}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Mood Slider */}
                <div className="space-y-4">
                  <Label>
                    Overall Mood:{" "}
                    <span style={{ color: PRIMARY }} className="font-medium">
                      {getMoodLabel(mood)}
                    </span>
                  </Label>
                  <div className="pl-3 pr-3">
                    <Slider
                      value={[mood]}
                      min={1}
                      max={5}
                      step={1}
                      onValueChange={(value) => setMood(value[0])}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Very Poor</span>
                    <span>Poor</span>
                    <span>Neutral</span>
                    <span>Good</span>
                    <span>Excellent</span>
                  </div>
                </div>

                {/* Anxiety Slider */}
                <div className="space-y-4">
                  <Label>
                    Anxiety Level:{" "}
                    <span style={{ color: PRIMARY }} className="font-medium">
                      {getAnxietyLabel(anxiety)}
                    </span>
                  </Label>
                  <div className="pl-3 pr-3">
                    <Slider
                      value={[anxiety]}
                      min={1}
                      max={5}
                      step={1}
                      onValueChange={(value) => setAnxiety(value[0])}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Severe</span>
                    <span>High</span>
                    <span>Moderate</span>
                    <span>Mild</span>
                    <span>Minimal</span>
                  </div>
                </div>

                {/* Sleep Quality Slider */}
                <div className="space-y-4">
                  <Label>
                    Sleep Quality:{" "}
                    <span style={{ color: PRIMARY }} className="font-medium">
                      {getSleepLabel(sleep)}
                    </span>
                  </Label>
                  <div className="pl-3 pr-3">
                    <Slider
                      value={[sleep]}
                      min={1}
                      max={5}
                      step={1}
                      onValueChange={(value) => setSleep(value[0])}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Very Poor</span>
                    <span>Poor</span>
                    <span>Fair</span>
                    <span>Good</span>
                    <span>Excellent</span>
                  </div>
                </div>

                {/* Notes */}
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes (optional)</Label>
                  <Textarea
                    id="notes"
                    placeholder="How are you feeling? What happened today?"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={4}
                  />
                </div>
              </CardContent>
              <CardFooter>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className={`w-full ${GRADIENT_CLASS} text-white`}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Entry"
                  )}
                </Button>
              </CardFooter>
            </form>
          </Card>
        )}

        {activeTab === "insights" && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle style={{ color: PRIMARY }}>Mood Trends</CardTitle>
                <CardDescription>
                  Your mental wellness patterns over the last 14 days.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={chartData}
                      margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="date" />
                      <YAxis domain={[1, 5]} />
                      <Tooltip />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="mood"
                        name="Mood"
                        stroke={SECONDARY}
                        strokeWidth={2}
                        activeDot={{ r: 6 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="anxiety"
                        name="Anxiety"
                        stroke={PRIMARY}
                        strokeWidth={2}
                        activeDot={{ r: 6 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="sleep"
                        name="Sleep Quality"
                        stroke={SECONDARY}
                        strokeWidth={2}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle style={{ color: PRIMARY }}>
                    Trend Analysis
                  </CardTitle>
                  <CardDescription>
                    Summary of your mood patterns and potential insights.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-medium mb-2">Mood Summary</h3>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="bg-gray-50 rounded-lg p-3 text-center">
                          <div
                            className="text-2xl font-bold"
                            style={{ color: PRIMARY }}
                          >
                            {entries.length > 0
                              ? (
                                  entries.reduce(
                                    (sum, entry) => sum + entry.mood,
                                    0
                                  ) / entries.length
                                ).toFixed(1)
                              : "3.8"}
                          </div>
                          <div className="text-xs text-gray-500">Avg. Mood</div>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3 text-center">
                          <div
                            className="text-2xl font-bold"
                            style={{ color: PRIMARY }}
                          >
                            {entries.length > 0
                              ? (
                                  entries.reduce(
                                    (sum, entry) => sum + entry.anxiety,
                                    0
                                  ) / entries.length
                                ).toFixed(1)
                              : "4.1"}
                          </div>
                          <div className="text-xs text-gray-500">
                            Avg. Anxiety
                          </div>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3 text-center">
                          <div
                            className="text-2xl font-bold"
                            style={{ color: PRIMARY }}
                          >
                            {entries.length > 0
                              ? (
                                  entries.reduce(
                                    (sum, entry) => sum + entry.sleep,
                                    0
                                  ) / entries.length
                                ).toFixed(1)
                              : "3.5"}
                          </div>
                          <div className="text-xs text-gray-500">
                            Avg. Sleep
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-medium mb-2">Insights</h3>
                      <ul className="space-y-2">
                        <li className="flex items-start gap-2">
                          <Badge variant="outline" className="mt-1">
                            Trend
                          </Badge>
                          <span>
                            Your mood appears to be{" "}
                            {entries.length > 0
                              ? "stable with some improvement"
                              : "improving"}{" "}
                            over the past week.
                          </span>
                        </li>
                        <li className="flex items-start gap-2">
                          <Badge variant="outline" className="mt-1">
                            Pattern
                          </Badge>
                          <span>
                            There seems to be a correlation between your sleep
                            quality and mood the following day.
                          </span>
                        </li>
                        <li className="flex items-start gap-2">
                          <Badge variant="outline" className="mt-1">
                            Suggestion
                          </Badge>
                          <span>
                            Consider focusing on improving your sleep habits to
                            potentially boost your overall mood.
                          </span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle style={{ color: PRIMARY }}>
                    Weekly Distribution
                  </CardTitle>
                  <CardDescription>
                    How your mood varies throughout the week.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={[
                          { day: "Mon", mood: 3.5 },
                          { day: "Tue", mood: 3.2 },
                          { day: "Wed", mood: 3.8 },
                          { day: "Thu", mood: 4.1 },
                          { day: "Fri", mood: 4.5 },
                          { day: "Sat", mood: 4.2 },
                          { day: "Sun", mood: 3.7 },
                        ]}
                        margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="day" />
                        <YAxis domain={[0, 5]} />
                        <Tooltip />
                        <Bar
                          dataKey="mood"
                          name="Average Mood"
                          fill={PRIMARY}
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {activeTab === "history" && (
          <Card>
            <CardHeader>
              <CardTitle style={{ color: PRIMARY }}>Entry History</CardTitle>
              <CardDescription>
                Your past mood tracking entries.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="py-20 flex justify-center">
                  <Loader2
                    className="h-6 w-6 animate-spin"
                    style={{ color: PRIMARY }}
                  />
                </div>
              ) : entries.length > 0 ? (
                <div className="space-y-4">
                  {[...entries]
                    .sort(
                      (a, b) =>
                        new Date(b.date).getTime() - new Date(a.date).getTime()
                    )
                    .map((entry, index) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex flex-wrap justify-between items-center mb-4">
                          <div className="font-medium text-gray-800">
                            {format(new Date(entry.date), "EEEE, MMMM d, yyyy")}
                          </div>
                          <div className="text-xs text-gray-500">
                            {entry.timestamp
                              ? format(new Date(entry.timestamp), "h:mm a")
                              : ""}
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4 mb-3">
                          <div>
                            <div className="text-xs text-gray-500 mb-1">
                              Mood
                            </div>
                            <div className="flex items-center">
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ background: SECONDARY }}
                              />
                              <span className="text-sm ml-2">
                                {getMoodLabel(entry.mood)}
                              </span>
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500 mb-1">
                              Anxiety
                            </div>
                            <div className="flex items-center">
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ background: PRIMARY }}
                              />
                              <span className="text-sm ml-2">
                                {getAnxietyLabel(entry.anxiety)}
                              </span>
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500 mb-1">
                              Sleep
                            </div>
                            <div className="flex items-center">
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ background: SECONDARY }}
                              />
                              <span className="text-sm ml-2">
                                {getSleepLabel(entry.sleep)}
                              </span>
                            </div>
                          </div>
                        </div>

                        {entry.notes && (
                          <div className="mt-4 bg-gray-50 p-3 rounded text-sm text-gray-800">
                            {entry.notes}
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              ) : (
                <div className="py-20 text-center">
                  <p className="text-gray-500 mb-4">
                    No entries yet. Start tracking your mood to see your
                    history.
                  </p>
                  <Button
                    onClick={() => setActiveTab("entry")}
                    className={`${GRADIENT_CLASS} text-white`}
                  >
                    Log Today's Mood
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default MentalTracker;
