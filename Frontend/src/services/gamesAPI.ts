// src/services/gamesApi.ts
import { format } from "date-fns";

export interface GameParticipationPayload {
  userId?: number | null;
  gameName: string;
  score?: number | null;
  meta?: Record<string, any> | null;
}

export interface MoodEntryPayload {
  userId?: number | null;
  date: string; // yyyy-MM-dd
  mood: number; // 1..5
  anxiety?: number | null;
  sleep?: number | null;
  notes?: string | null;
}

const API_BASE = "/api/games";

/**
 * Post a game participation record
 */
export const postParticipate = async (payload: GameParticipationPayload) => {
  const res = await fetch(`${API_BASE}/participate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(
      err?.message || `Failed to post participate (${res.status})`
    );
  }
  return res.json();
};

/**
 * Post a mood entry
 * If caller doesn't supply date, we fill today's date.
 */
export const postMoodEntry = async (payload: Partial<MoodEntryPayload>) => {
  const payloadSafe: MoodEntryPayload = {
    userId: payload.userId ?? null,
    date: payload.date ?? format(new Date(), "yyyy-MM-dd"),
    mood: payload.mood ?? 3,
    anxiety: payload.anxiety ?? null,
    sleep: payload.sleep ?? null,
    notes: payload.notes ?? null,
  };
  const res = await fetch(`${API_BASE}/mood`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payloadSafe),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.message || `Failed to post mood (${res.status})`);
  }
  return res.json();
};
