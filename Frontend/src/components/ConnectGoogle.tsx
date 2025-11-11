// src/components/ConnectGoogle.tsx
import React, { useState } from "react";
import api from "@/services/api"; // your axios wrapper that has auth header
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";

const ConnectGoogle: React.FC = () => {
  const [loading, setLoading] = useState(false);

  const handleConnect = async () => {
    try {
      setLoading(true);
      const resp = await api.get("/api/counselors/google/connect");
      const data = resp?.data ?? resp;
      const url = data?.url ?? data;
      if (!url) {
        toast.error("Could not get Google connect URL");
        return;
      }
      // open the Google consent page in a new window/tab
      window.open(url, "_blank", "noopener,noreferrer");
      toast.success(
        "Google consent page opened. Complete connection in the new tab."
      );
    } catch (err: any) {
      console.error("Failed to get google connect url:", err);
      toast.error("Could not generate Google connect URL. Check console.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-2 text-sm text-muted-foreground">
        Connect your Google Calendar so bookings sync automatically.
      </div>
      <Button onClick={handleConnect} disabled={loading}>
        {loading ? "Opening..." : "Connect Google Calendar"}
      </Button>
    </div>
  );
};

export default ConnectGoogle;
