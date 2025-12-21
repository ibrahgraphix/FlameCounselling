// src/services/games.service.ts
import * as repo from "../repositories/gamesRepository";
import { MoodEntry, GameParticipation } from "../models/mood";
import { format, subDays } from "date-fns";

/**
 * Save mood entry business logic (validation)
 *
 * This is intentionally tolerant:
 * - if date is missing we default to today (yyyy-MM-dd)
 * - if mood is a string that can be coerced to number, we coerce it
 */
export const saveMoodEntry = async (payload: MoodEntry): Promise<MoodEntry> => {
  // default date to today if missing
  if (!payload.date) {
    payload.date = format(new Date(), "yyyy-MM-dd");
  }

  // coerce mood if possible
  if (typeof payload.mood !== "number") {
    const maybeNum =
      payload.mood !== undefined && payload.mood !== null
        ? Number(payload.mood as any)
        : NaN;
    if (!Number.isNaN(maybeNum)) {
      payload.mood = maybeNum;
    }
  }

  if (typeof payload.mood !== "number" || Number.isNaN(payload.mood)) {
    throw new Error("mood is required and must be a number 1..5");
  }

  // ensure mood range
  if (payload.mood < 1 || payload.mood > 5) {
    throw new Error("mood must be between 1 and 5");
  }

  // optional: validate anxiety/sleep if present (coerce strings to numbers)
  if (payload.anxiety !== undefined && payload.anxiety !== null) {
    const aNum = Number(payload.anxiety as any);
    payload.anxiety = Number.isNaN(aNum) ? null : aNum;
  }
  if (payload.sleep !== undefined && payload.sleep !== null) {
    const sNum = Number(payload.sleep as any);
    payload.sleep = Number.isNaN(sNum) ? null : sNum;
  }

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
