// routes/userRoutes.ts
import express from "express";
import requireAuth from "../utils/authMiddleware";
import usersController from "../controllers/usersController";

const router = express.Router();

// GET /api/admin/users  (protected - requireAuth will set req.user)
router.get("/users", requireAuth, usersController.getAllUsers);

// POST /api/admin/users  (create a new user) - protected
router.post("/users", requireAuth, usersController.createUser);

export default router;
