// src/routes/counselor.ts
import express from "express";
import { CounselorController } from "../controllers/counselorController";

const router = express.Router();

// GET /api/counselors
router.get("/", CounselorController.getAll);

// GET /api/counselors/:id
router.get("/:id", CounselorController.getById);

export default router;
