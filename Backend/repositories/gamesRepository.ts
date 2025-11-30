// src/repositories/games.repository.ts
import pool from "../config/db";
import { MoodEntry, GameParticipation, MoodCountRow } from "../models/mood";

/**
 * Save a mood entry
 */
export const saveMoodEntry = async (entry: MoodEntry): Promise<MoodEntry> => {
  const sql = `
    INSERT INTO mood_logs (user_id, date, mood, anxiety, sleep, notes)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING id, user_id as "userId", date::text as "date", mood, anxiety, sleep, notes, created_at as "createdAt"
  `;
  const params = [
    entry.userId ?? null,
    entry.date,
    entry.mood,
    entry.anxiety ?? null,
    entry.sleep ?? null,
    entry.notes ?? null,
  ];
  const { rows } = await pool.query(sql, params);
  return rows[0];
};

/**
 * Get mood entries for a user (ordered by date desc, then created_at desc)
 */
export const getMoodEntriesByUser = async (
  userId: number
): Promise<MoodEntry[]> => {
  const sql = `
    SELECT id, user_id as "userId", date::text as "date", mood, anxiety, sleep, notes, created_at as "createdAt"
    FROM mood_logs
    WHERE user_id = $1
    ORDER BY date DESC, created_at DESC
  `;
  const { rows } = await pool.query(sql, [userId]);
  return rows;
};

/**
 * Save a game participation record (generic).
 */
export const saveGameParticipation = async (
  p: GameParticipation
): Promise<GameParticipation> => {
  const sql = `
    INSERT INTO game_participation (user_id, game_name, score, meta)
    VALUES ($1, $2, $3, $4)
    RETURNING id, user_id as "userId", game_name as "gameName", score, meta, created_at as "createdAt"
  `;
  const params = [
    p.userId ?? null,
    p.gameName,
    p.score ?? null,
    p.meta ? JSON.stringify(p.meta) : null,
  ];
  const { rows } = await pool.query(sql, params);
  return rows[0];
};

/**
 * Get counts grouped by date and mood value for the last nDays (including today)
 * returns rows: { day, mood, cnt }
 */
export const getMoodCountsGroupedByDateAndMood = async (
  nDays = 7
): Promise<MoodCountRow[]> => {
  const sql = `
    SELECT date::date AS day, mood::int AS mood, COUNT(*)::int AS cnt
    FROM mood_logs
    WHERE date >= (current_date - ($1 - 1) * INTERVAL '1 day')
    GROUP BY day, mood
    ORDER BY day ASC;
  `;
  const { rows } = await pool.query(sql, [nDays]);
  return rows;
};

/**
 * Optional helper: get average mood per day for last n days
 */
export const getMoodAggregatesLastNDays = async (nDays = 7) => {
  const sql = `
    SELECT date::date AS day, AVG(mood)::numeric(10,2) AS avg_mood, COUNT(*)::int AS cnt
    FROM mood_logs
    WHERE date >= (current_date - ($1 - 1) * INTERVAL '1 day')
    GROUP BY day
    ORDER BY day;
  `;
  const { rows } = await pool.query(sql, [nDays]);
  return rows;
};
