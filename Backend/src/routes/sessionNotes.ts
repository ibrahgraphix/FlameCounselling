// src/routes/sessionNotes.ts
import { Router } from "express";
import requireAuth from "../utils/authMiddleware";
import { createNote, listNotesForCounselor } from "../controllers/sessionNotes";

const router = Router();
router.use(requireAuth);

router.get("/", listNotesForCounselor);
router.post("/", createNote);

export default router;
