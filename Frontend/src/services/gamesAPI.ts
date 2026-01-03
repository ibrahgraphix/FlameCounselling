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

const API_BASE =
  import.meta.env.VITE_API_URL || "https://flamestudentcouncil.in:4000";

async function fetchWithErrorHandling(url: string, opts: RequestInit) {
  const res = await fetch(url, opts);
  let body: any = null;
  try {
    body = await res.json();
  } catch (e) {
    // no json
  }
  if (!res.ok) {
    const serverMsg = body?.message ?? body?.error ?? body ?? null;
    throw new Error(
      serverMsg
        ? `Failed to post mood (${res.status}): ${serverMsg}`
        : `Failed to post mood (${res.status})`
    );
  }
  return body;
}

/**
 * Post a game participation record
 */
export const postParticipate = async (payload: GameParticipationPayload) => {
  const url = `${API_BASE}/api/games/participate`;
  return fetchWithErrorHandling(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
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
  const url = `${API_BASE}/api/games/mood`;
  return fetchWithErrorHandling(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payloadSafe),
  });
};
