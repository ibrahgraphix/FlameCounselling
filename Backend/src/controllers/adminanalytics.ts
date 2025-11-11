// src/controllers/adminAnalyticsController.ts
import { Request, Response } from "express";
import * as service from "../services/adminAnalytics";

const ensureAdminOrCounselor = (req: Request) => {
  const u = (req as any).user;
  if (!u) return false;
  const role = String(u.role ?? "").toLowerCase();
  return role === "admin" || role === "counselor";
};

export const getAnalytics = async (req: Request, res: Response) => {
  try {
    if (!ensureAdminOrCounselor(req)) {
      return res.status(403).json({ success: false, error: "Forbidden" });
    }

    const analytics = await service.fetchSystemAnalytics();
    return res.json({ success: true, analytics });
  } catch (err: any) {
    console.error("admin.getAnalytics error:", err);
    return res
      .status(500)
      .json({ success: false, error: err.message ?? "Server error" });
  }
};

export default { getAnalytics };
