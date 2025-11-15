// src/routes/adminAnalytics.ts
import express from "express";
import requireAuth from "../utils/authMiddleware";
import adminAnalyticsController from "../controllers/adminanalytics";

const router = express.Router();

// Protect everything with requireAuth (it sets req.user)
router.use(requireAuth);

// GET /api/admin/analytics
router.get("/", adminAnalyticsController.getAnalytics);

export default router;
