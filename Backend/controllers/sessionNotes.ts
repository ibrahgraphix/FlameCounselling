// src/controllers/sessionNotes.ts
import { Request, Response } from "express";
import * as service from "../services/sessionNotes";

/**
 * Helper: extract counselor id from token payload (req.user).
 * Accepts several token shapes: { id }, { userId }, { user_id }.
 */
const extractCounselorId = (req: Request): number | null => {
  const u = (req as any).user;
  if (!u) return null;
  const id = u.id ?? u.userId ?? u.user_id;
  if (typeof id === "number") return id;
  if (typeof id === "string" && /^\d+$/.test(id)) return Number(id);
  return null;
};

export const createNote = async (req: Request, res: Response) => {
  try {
    const counselorId = extractCounselorId(req);
    if (!counselorId) return res.status(401).json({ message: "Unauthorized" });

    let { student_id, session_datetime, notes } = req.body ?? {};

    // Basic presence validation
    if (!student_id || !notes) {
      return res.status(400).json({
        message: "student_id and notes are required",
      });
    }

    // numeric student_id conversion and simple validation
    student_id = Number(student_id);
    if (!Number.isInteger(student_id) || student_id <= 0) {
      return res.status(400).json({ message: "Invalid student_id" });
    }

    // If session_datetime not provided, use current server time (ISO)
    if (!session_datetime) {
      session_datetime = new Date().toISOString();
    } else {
      session_datetime = String(session_datetime);
    }

    // Ensure student exists in DB (so we don't insert orphaned FK)
    const student = await service.lookupStudentById(student_id);
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    const payload = {
      student_id,
      counselor_id: counselorId,
      session_datetime,
      notes: String(notes),
    };

    const created = await service.createSessionNote(payload);

    // Return created row (includes created_at)
    return res.status(201).json(created);
  } catch (err) {
    console.error("createNote error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

export const listNotesForCounselor = async (req: Request, res: Response) => {
  try {
    const counselorId = extractCounselorId(req);
    if (!counselorId) return res.status(401).json({ message: "Unauthorized" });

    const notes = await service.getNotesByCounselor(counselorId);
    return res.json(notes);
  } catch (err) {
    console.error("listNotesForCounselor error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
