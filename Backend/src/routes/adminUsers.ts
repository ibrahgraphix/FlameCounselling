// src/routes/adminUsers.ts
import express from "express";
import requireAuth from "../utils/authMiddleware";
import adminController from "../controllers/adminusersController";

const router = express.Router();

// Protect everything: admin-only inside controller will be validated
router.use(requireAuth);

// PATCH /api/admin/users/:role/:id/status
router.patch("/users/:role/:id/status", adminController.updateStatus);

// DELETE /api/admin/users/:role/:id
router.delete("/users/:role/:id", adminController.removeUser);

export default router;
