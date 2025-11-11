// src/controllers/counselorController.ts
import { Request, Response } from "express";
import {
  getAllCounselors,
  getCounselorById,
} from "../repositories/counselorRepository";

export const CounselorController = {
  async getAll(req: Request, res: Response) {
    try {
      const counselors = await getAllCounselors();
      // Return a consistent shape: { success: true, counselors: [...] }
      return res.json({ success: true, counselors });
    } catch (err: any) {
      console.error("CounselorController.getAll error:", err);
      return res.status(500).json({ success: false, error: "Server error" });
    }
  },

  async getById(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      if (!id)
        return res.status(400).json({ success: false, error: "Invalid id" });
      const c = await getCounselorById(id);
      if (!c)
        return res.status(404).json({ success: false, error: "Not found" });
      return res.json({ success: true, counselor: c });
    } catch (err: any) {
      console.error("CounselorController.getById error:", err);
      return res.status(500).json({ success: false, error: "Server error" });
    }
  },
};
