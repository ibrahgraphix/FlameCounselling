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

async function fetchWithOptionalOrigin(url: string, opts: RequestInit) {
  // Try the url as given
  let res = await fetch(url, opts);
  // If 404 and running in browser, attempt with absolute origin
  if (res.status === 404 && typeof window !== "undefined") {
    try {
      const alt = `${window.location.origin}${url}`;
      if (alt !== url) {
        res = await fetch(alt, opts);
      }
    } catch (e) {
      // ignore and return original res
    }
  }
  return res;
}

/**
 * Post a game participation record
 */
export const postParticipate = async (payload: GameParticipationPayload) => {
  const url = `${API_BASE}/participate`;
  const res = await fetchWithOptionalOrigin(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  // Try to parse server-provided JSON error/message
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
        ? `Failed to post participate (${res.status}): ${serverMsg}`
        : `Failed to post participate (${res.status})`
    );
  }
  return body;
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

  const url = `${API_BASE}/mood`;
  const res = await fetchWithOptionalOrigin(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payloadSafe),
  });

  let body: any = null;
  try {
    body = await res.json();
  } catch (e) {}

  if (!res.ok) {
    const serverMsg = body?.message ?? body ?? null;
    throw new Error(
      serverMsg
        ? `Failed to post mood (${res.status}): ${serverMsg}`
        : `Failed to post mood (${res.status})`
    );
  }
  return body;
};
