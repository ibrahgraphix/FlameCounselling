// src/services/games.service.ts
import * as repo from "../repositories/gamesRepository";
import { MoodEntry, GameParticipation } from "../models/mood";
import { format, subDays } from "date-fns";

/**
 * Save mood entry business logic (validation)
 */
export const saveMoodEntry = async (payload: MoodEntry): Promise<MoodEntry> => {
  if (!payload.date) {
    throw new Error("date is required (YYYY-MM-DD)");
  }
  if (typeof payload.mood !== "number") {
    throw new Error("mood is required and must be a number 1..5");
  }
  if (payload.mood < 1 || payload.mood > 5) {
    throw new Error("mood must be between 1 and 5");
  }
  // optional: validate anxiety/sleep if present
  return repo.saveMoodEntry(payload);
};

/**
 * Fetch user mood entries (simple pass-through)
 */
export const getMoodEntriesByUser = async (userId: number) => {
  if (!userId) throw new Error("userId is required");
  return repo.getMoodEntriesByUser(userId);
};

/**
 * Save generic game participation
 */
export const saveGameParticipation = async (payload: GameParticipation) => {
  if (!payload.gameName) throw new Error("gameName is required");
  return repo.saveGameParticipation(payload);
};

/**
 * Build mood distribution array used by admin dashboard.
 *
 * returns array of 7 (or days) objects:
 * [{ name: "Mon", excellent: number, good: number, neutral: number, poor: number, bad: number }, ...]
 */
export const getWeeklyMoodDistribution = async (days = 7) => {
  const raw = await repo.getMoodCountsGroupedByDateAndMood(days);
  const map = new Map<string, Record<number, number>>();
  raw.forEach((r: any) => {
    // r.day may be Date object
    const dayStr =
      r.day instanceof Date
        ? format(new Date(r.day), "yyyy-MM-dd")
        : String(r.day);
    const mood = Number(r.mood);
    const cnt = Number(r.cnt);
    if (!map.has(dayStr)) map.set(dayStr, {});
    map.get(dayStr)![mood] = cnt;
  });

  const res: Array<{
    name: string;
    excellent: number;
    good: number;
    neutral: number;
    poor: number;
    bad: number;
  }> = [];

  for (let i = days - 1; i >= 0; i--) {
    const d = subDays(new Date(), i);
    const dateStr = format(d, "yyyy-MM-dd");
    const dayName = format(d, "EEE"); // Mon/Tue...
    const row = map.get(dateStr) ?? {};
    res.push({
      name: dayName,
      excellent: row[5] ?? 0,
      good: row[4] ?? 0,
      neutral: row[3] ?? 0,
      poor: row[2] ?? 0,
      bad: row[1] ?? 0,
    });
  }

  return res;
};
