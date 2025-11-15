// src/controllers/adminUsersController.ts
import { Request, Response } from "express";
import { studentRepository } from "../repositories/studentRepository";
import counselorRepo from "../repositories/counselorRepository";

const ensureAdmin = (req: Request) => {
  const u = (req as any).user;
  if (!u) return false;
  const role = String(u.role ?? "").toLowerCase();
  return role === "admin";
};

export const updateStatus = async (req: Request, res: Response) => {
  try {
    if (!ensureAdmin(req))
      return res.status(403).json({ success: false, error: "Forbidden" });

    const { role, id } = req.params;
    const { status } = req.body;
    if (!["active", "inactive"].includes(status)) {
      return res.status(400).json({ success: false, error: "Invalid status" });
    }

    if (role === "student") {
      const ok = await studentRepository.setStatus(Number(id), status);
      if (!ok)
        return res
          .status(404)
          .json({ success: false, error: "Student not found" });
      return res.json({ success: true, status });
    } else if (role === "counselor") {
      const ok = await counselorRepo.setStatus(Number(id), status);
      if (!ok)
        return res
          .status(404)
          .json({ success: false, error: "Counselor not found" });
      return res.json({ success: true, status });
    } else {
      return res
        .status(400)
        .json({ success: false, error: "Unsupported role" });
    }
  } catch (err) {
    console.error("admin.updateStatus error:", err);
    return res.status(500).json({ success: false, error: "Server error" });
  }
};

export const removeUser = async (req: Request, res: Response) => {
  try {
    if (!ensureAdmin(req))
      return res.status(403).json({ success: false, error: "Forbidden" });

    const { role, id } = req.params;

    if (role === "student") {
      const ok = await studentRepository.delete(Number(id));
      if (!ok)
        return res
          .status(404)
          .json({ success: false, error: "Student not found" });
      return res.json({ success: true });
    } else if (role === "counselor") {
      const ok = await counselorRepo.delete(Number(id));
      if (!ok)
        return res
          .status(404)
          .json({ success: false, error: "Counselor not found" });
      return res.json({ success: true });
    } else {
      return res
        .status(400)
        .json({ success: false, error: "Unsupported role" });
    }
  } catch (err) {
    console.error("admin.removeUser error:", err);
    return res.status(500).json({ success: false, error: "Server error" });
  }
};

export default { updateStatus, removeUser };
