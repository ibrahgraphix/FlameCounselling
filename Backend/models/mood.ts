// src/models/mood.ts
export interface MoodEntry {
  id?: number;
  userId?: number | null;
  date: string; // "YYYY-MM-DD"
  mood: number; // 1..5
  anxiety?: number | null;
  sleep?: number | null;
  notes?: string | null;
  createdAt?: string;
}

export interface GameParticipation {
  id?: number;
  userId?: number | null;
  gameName: string;
  score?: number | null;
  meta?: Record<string, any> | null;
  createdAt?: string;
}

export interface MoodCountRow {
  day: Date | string; // returned from pg as Date
  mood: number;
  cnt: number;
}
