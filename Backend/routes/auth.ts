// src/routes/auth.ts
import { Router } from "express";
import {
  loginHandler,
  googleLoginHandler,
} from "../controllers/authController";

const router = Router();

router.post("/login", loginHandler);

router.post("/google", googleLoginHandler);

export default router;
