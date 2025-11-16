// src/routes/adminUsers.ts
import express from "express";
import requireAuth from "../utils/authMiddleware";
import adminController from "../controllers/adminusersController";

const router = express.Router();

// Protect everything: require auth middleware (controller will enforce admin)
router.use(requireAuth);

// GET /api/admin/users
router.get("/users", adminController.getUsers);

// POST /api/admin/users
router.post("/users", adminController.createUser);

// PATCH /api/admin/users/:role/:id/status
router.patch("/users/:role/:id/status", adminController.updateStatus);

// DELETE /api/admin/users/:role/:id
router.delete("/users/:role/:id", adminController.removeUser);

export default router;
