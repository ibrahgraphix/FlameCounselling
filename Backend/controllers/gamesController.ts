// src/controllers/games.controller.ts
import { Request, Response } from "express";
import * as service from "../services/gamesService";
import { MoodEntry, GameParticipation } from "../models/mood";

/**
 * POST /api/games/mood
 */
export const postMood = async (req: Request, res: Response) => {
  try {
    // Log incoming request path and a short body preview for debugging
    console.info(`[gamesController] POST ${req.path} payload:`, {
      userId: req.body?.userId ?? null,
      mood: req.body?.mood ?? null,
      date: req.body?.date ?? null,
    });

    const payload: MoodEntry = req.body;
    // If user is not logged-in, frontend may send userId: null
    const saved = await service.saveMoodEntry(payload);
    return res.status(201).json({ success: true, data: saved });
  } catch (err: any) {
    console.error("postMood error:", err);
    // Return 400 for validation errors (service throws) but include message
    return res
      .status(400)
      .json({ success: false, message: err.message || "Bad request" });
  }
};

/**
 * GET /api/games/mood-entries?userId=123
 */
export const getMoodEntries = async (req: Request, res: Response) => {
  try {
    const userIdQ = req.query.userId;
    if (!userIdQ) {
      return res
        .status(400)
        .json({ success: false, message: "userId query param required" });
    }
    const userId = Number(userIdQ);
    if (Number.isNaN(userId)) {
      return res
        .status(400)
        .json({ success: false, message: "userId must be a number" });
    }
    const entries = await service.getMoodEntriesByUser(userId);
    return res.json({ success: true, data: entries });
  } catch (err: any) {
    console.error("getMoodEntries error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * POST /api/games/participate
 * Body: { userId?, gameName, score?, meta? }
 */
export const postParticipate = async (req: Request, res: Response) => {
  try {
    const payload: GameParticipation = req.body;
    const saved = await service.saveGameParticipation(payload);
    return res.status(201).json({ success: true, data: saved });
  } catch (err: any) {
    console.error("postParticipate error:", err);
    return res
      .status(400)
      .json({ success: false, message: err.message || "Bad request" });
  }
};

/**
 * GET /api/games/admin-weekly-mood?days=7
 */
export const getAdminWeeklyMood = async (req: Request, res: Response) => {
  try {
    const days = req.query.days ? Number(req.query.days) : 7;
    const daysSafe =
      Number.isInteger(days) && days > 0 && days <= 30 ? days : 7;
    const data = await service.getWeeklyMoodDistribution(daysSafe);
    return res.json({ success: true, data });
  } catch (err: any) {
    console.error("getAdminWeeklyMood error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
