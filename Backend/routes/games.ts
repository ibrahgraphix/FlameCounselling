// src/routes/games.routes.ts
import express from "express";
import * as controller from "../controllers/gamesController";

const router = express.Router();

// Public endpoints used by frontend games
router.post("/mood", controller.postMood); // POST /api/games/mood
router.post("/log", controller.postMood); // alias: POST /api/games/log
router.get("/mood-entries", controller.getMoodEntries); // GET /api/games/mood-entries?userId=123
router.post("/participate", controller.postParticipate); // POST /api/games/participate

// Admin analytics helper
router.get("/admin-weekly-mood", controller.getAdminWeeklyMood); // GET /api/games/admin-weekly-mood?days=7

export default router;
