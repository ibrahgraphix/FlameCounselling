// src/controllers/studentsController.ts
import { Request, Response } from "express";
import { studentRepository } from "../repositories/studentRepository";

/**
 * GET /api/students?name=Full%20Name
 * Returns first student row that matches the provided name (case-insensitive, partial).
 */
export const getStudentByName = async (req: Request, res: Response) => {
  try {
    const name = String(req.query.name ?? "").trim();
    if (!name) {
      return res.status(400).json({ message: "name query param is required" });
    }

    const student = await studentRepository.findByName(name);
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    return res.json(student);
  } catch (err) {
    console.error("getStudentByName error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

/**
 * Optional: GET /api/students/search?q=term
 * Returns up to 50 matching students for autocomplete.
 */
export const searchStudents = async (req: Request, res: Response) => {
  try {
    const q = String(req.query.q ?? "").trim();
    if (!q) return res.json([]);
    const rows = await studentRepository.findByNamePartial(q);
    return res.json(rows);
  } catch (err) {
    console.error("searchStudents error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
