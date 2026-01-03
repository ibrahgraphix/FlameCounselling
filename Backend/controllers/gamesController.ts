// src/controllers/gamesController.ts
import { Request, Response } from "express";
import * as service from "../services/gamesService";
import { MoodEntry } from "../models/mood";

export const postMood = async (
  req: Request<{}, {}, MoodEntry>,
  res: Response
) => {
  try {
    const payload = req.body;
    const result = await service.saveMoodEntry(payload);
    res.status(201).json(result);
  } catch (error: any) {
    console.error("Error in postMood:", error);
    res
      .status(400)
      .json({ message: error.message || "Failed to save mood entry" });
  }
};

export const postParticipate = async (req: Request, res: Response) => {
  try {
    const payload = req.body;
    const result = await service.saveGameParticipation(payload);
    res.status(201).json(result);
  } catch (error: any) {
    console.error("Error in postParticipate:", error);
    res
      .status(400)
      .json({ message: error.message || "Failed to save game participation" });
  }
};

export const getMoodEntries = async (req: Request, res: Response) => {
  try {
    const { userId } = req.query;
    if (!userId || isNaN(Number(userId))) {
      return res
        .status(400)
        .json({ message: "userId is required and must be a number" });
    }
    const entries = await service.getMoodEntriesByUser(Number(userId));
    res.json(entries);
  } catch (error: any) {
    console.error("Error in getMoodEntries:", error);
    res
      .status(500)
      .json({ message: error.message || "Failed to fetch mood entries" });
  }
};

export const getAdminWeeklyMood = async (req: Request, res: Response) => {
  try {
    const { days } = req.query;
    const numDays = days && !isNaN(Number(days)) ? Number(days) : 7;
    if (numDays < 1 || numDays > 365) {
      return res
        .status(400)
        .json({ message: "days must be between 1 and 365" });
    }
    const data = await service.getWeeklyMoodDistribution(numDays);
    res.json(data);
  } catch (error: any) {
    console.error("Error in getAdminWeeklyMood:", error);
    res
      .status(500)
      .json({ message: error.message || "Failed to fetch weekly mood data" });
  }
};
