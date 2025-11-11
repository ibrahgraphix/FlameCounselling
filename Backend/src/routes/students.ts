// src/routes/students.ts
import { Router } from "express";
import {
  getStudentByName,
  searchStudents,
} from "../controllers/studentController";

const router = Router();

router.get("/", getStudentByName);
router.get("/search", searchStudents);

export default router;
