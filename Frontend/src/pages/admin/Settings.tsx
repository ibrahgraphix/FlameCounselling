import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Settings, Loader2 } from "lucide-react";
import { useDarkMode } from "@/contexts/Darkmode";
import { toast } from "@/components/ui/sonner";
import api, {
  getCounselorById,
  getCounselors,
  getCounselorCalendar,
} from "@/services/api";
import { useAuth } from "@/contexts/AuthContext";

const SettingsPage = () => {
  const [emailNotif, setEmailNotif] = useState(true);
  const [smsNotif, setSmsNotif] = useState(false);
  const { darkMode, toggleDarkMode } = useDarkMode();
  const { user } = useAuth();

  const [counselor, setCounselor] = useState<any>(null);
  const [checkingConnect, setCheckingConnect] = useState(false);
  const [workingHours, setWorkingHours] = useState<string>("9:00 AM - 5:00 PM");
  const [availableDays, setAvailableDays] = useState<string>("Mon - Fri");

  // theme colors
  const PRIMARY = "#1e3a8a";
  const GRADIENT = "linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)";

  // Resolve counselor from current user or fallback
  useEffect(() => {
    const fetchCounselor = async () => {
      try {
        if (user && user.role?.toLowerCase() === "counselor") {
          setCounselor(user);
          return;
        }
        const all = await getCounselors();
        if (all && all.length > 0) setCounselor(all[0]);
      } catch (err) {
        console.error("Failed to fetch counselor:", err);
      }
    };
    fetchCounselor();
  }, [user]);

  // Load working hours (placeholder for now; could come from backend or Google)
  const loadWorkingHours = async () => {
    try {
      const data = await getCounselorCalendar();
      // In real case: parse Google Calendar free/busy data or stored preferences
      if (data?.workingHours) setWorkingHours(data.workingHours);
      if (data?.availableDays) setAvailableDays(data.availableDays);
    } catch (err) {
      console.warn("Could not load working hours:", err);
    }
  };

  useEffect(() => {
    loadWorkingHours();
  }, []);

  /** --- GOOGLE CALENDAR CONNECT LOGIC (same as Calendar.tsx) --- */
  const handleConnectGoogle = async () => {
    let counselorId =
      Number(counselor?.counselor_id ?? counselor?.id ?? counselor?.raw?.id) ||
      null;

    if (!counselorId) {
      toast.error(
        "Counselor ID not found. Please reload or select a counselor."
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
        toast.error("No Google authorization URL returned by server.");
        return;
      }

      window.open(String(url), "_blank", "noopener,noreferrer");
      toast.info(
        "Google authorization tab opened. Complete consent and return here."
      );

      // Poll for confirmation
      const attempts = 8;
      for (let i = 0; i < attempts; i++) {
        await new Promise((r) => setTimeout(r, 3000));
        try {
          const refreshed = await getCounselorById(counselorId);
          if (
            refreshed &&
            (refreshed.raw?.google_connected || refreshed.google_connected)
          ) {
            setCounselor(refreshed);
            toast.success("Google Calendar connected successfully!");
            await loadWorkingHours();
            return;
          }
        } catch (e) {}
      }
      toast.warn("No confirmation yet. Try reloading or reconnecting.");
    } catch (err: any) {
      console.error("Google connect failed:", err);
      toast.error(
        "Failed to initiate Google connect: " + (err?.message ?? err)
      );
    } finally {
      setCheckingConnect(false);
    }
  };

  return (
    <div
      className="p-6 space-y-6 min-h-screen"
      style={{ background: darkMode ? "#0f1724" : "white" }}
    >
      {/* Page Title */}
      <div className="flex items-center gap-2">
        <Settings className="h-6 w-6 text-mindease-primary" />
        <h1
          className="text-2xl font-bold tracking-tight"
          style={{ color: darkMode ? "#e6eefc" : undefined }}
        >
          Settings
        </h1>
      </div>

      <Tabs defaultValue="notifications" className="w-full">
        <TabsList>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
        </TabsList>

        {/* --- Notifications Tab --- */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notification Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label style={{ color: darkMode ? "#cbd5e1" : undefined }}>
                  Email Notifications
                </Label>
                <Switch checked={emailNotif} onCheckedChange={setEmailNotif} />
              </div>
              <div className="flex items-center justify-between">
                <Label style={{ color: darkMode ? "#cbd5e1" : undefined }}>
                  SMS/WhatsApp Notifications
                </Label>
                <Switch checked={smsNotif} onCheckedChange={setSmsNotif} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* --- Calendar Tab --- */}
        <TabsContent value="calendar">
          <Card>
            <CardHeader>
              <CardTitle>Calendar & Availability</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label style={{ color: darkMode ? "#cbd5e1" : undefined }}>
                  Working Hours
                </Label>
                <Input
                  type="text"
                  value={workingHours}
                  readOnly
                  style={{ opacity: 0.8 }}
                />
              </div>

              <div>
                <Label style={{ color: darkMode ? "#cbd5e1" : undefined }}>
                  Available Days
                </Label>
                <Input
                  type="text"
                  value={availableDays}
                  readOnly
                  style={{ opacity: 0.8 }}
                />
              </div>

              {/* Sync Button */}
              {!counselor?.google_connected &&
              !counselor?.raw?.google_connected ? (
                <Button
                  onClick={handleConnectGoogle}
                  disabled={checkingConnect}
                  className="text-white font-semibold"
                  style={{
                    background: GRADIENT,
                    boxShadow: "0 6px 18px rgba(30,58,138,0.12)",
                  }}
                >
                  {checkingConnect ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="animate-spin h-4 w-4" /> Connecting…
                    </span>
                  ) : (
                    "Sync with Google Calendar"
                  )}
                </Button>
              ) : (
                <div
                  className="px-3 py-1 rounded-md font-medium text-sm"
                  style={{
                    background: "rgba(59,130,246,0.12)",
                    color: PRIMARY,
                  }}
                >
                  Google Calendar connected
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* --- Preferences Tab --- */}
        <TabsContent value="preferences">
          <Card>
            <CardHeader>
              <CardTitle>System Preferences</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label style={{ color: darkMode ? "#cbd5e1" : undefined }}>
                  Dark Mode
                </Label>
                <Switch checked={darkMode} onCheckedChange={toggleDarkMode} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SettingsPage;
