// src/controllers/adminanalytics.ts
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

    const user = (req as any).user || {};
    const role = String(user.role ?? "").toLowerCase();

    // If counselor, scope to their id. If admin, no scoping (system-wide).
    if (role === "counselor") {
      const counselorId = user.id ?? user.counselor_id ?? user.userId;
      if (!counselorId) {
        return res
          .status(400)
          .json({ success: false, error: "Counselor id not found in token" });
      }
      const analytics = await service.fetchSystemAnalytics({ counselorId });
      return res.json({ success: true, analytics });
    } else {
      // Admin: return full analytics
      const analytics = await service.fetchSystemAnalytics();
      return res.json({ success: true, analytics });
    }
  } catch (err: any) {
    console.error("admin.getAnalytics error:", err);
    return res
      .status(500)
      .json({ success: false, error: err.message ?? "Server error" });
  }
};

export default { getAnalytics };
