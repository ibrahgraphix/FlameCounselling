// src/controllers/adminUsersController.ts
import { Request, Response } from "express";
import counselorRepo from "../repositories/counselorRepository";
import pool from "../config/db";
import {
  fetchAllUsers,
  createUser as createUserService,
} from "../services/usersService";

const ensureAdmin = (req: Request) => {
  const u = (req as any).user;
  if (!u) return false;
  const role = String(u.role ?? "").toLowerCase();
  return role === "admin";
};

/**
 * GET /api/admin/users
 * Delegates to fetchAllUsers which returns students + counselors combined.
 */
export const getUsers = async (req: Request, res: Response) => {
  try {
    if (!ensureAdmin(req))
      return res.status(403).json({ success: false, error: "Forbidden" });

    const users = await fetchAllUsers();
    return res.json({ success: true, users });
  } catch (err) {
    console.error("admin.getUsers error:", err);
    return res.status(500).json({ success: false, error: "Server error" });
  }
};

/**
 * POST /api/admin/users
 * Creates user using usersService.createUser.
 */
export const createUser = async (req: Request, res: Response) => {
  try {
    if (!ensureAdmin(req))
      return res.status(403).json({ success: false, error: "Forbidden" });

    const { name, email, role } = req.body ?? {};
    if (!name || !email) {
      return res
        .status(400)
        .json({ success: false, error: "name and email are required" });
    }

    try {
      const created = await createUserService({
        name: String(name),
        email: String(email),
        role: (role ?? "student") as "admin" | "counselor" | "student",
      });
      return res.status(201).json({ success: true, user: created });
    } catch (err: any) {
      // map unique-violation to 409
      if (
        err &&
        (err.code === "23505" ||
          err.pgCode === "23505" ||
          (err.message && err.message.includes("exists")))
      ) {
        return res
          .status(409)
          .json({ success: false, error: "Email already exists" });
      }
      console.error("admin.createUser service error:", err);
      return res
        .status(500)
        .json({ success: false, error: err?.message ?? "Server error" });
    }
  } catch (err) {
    console.error("admin.createUser error:", err);
    return res.status(500).json({ success: false, error: "Server error" });
  }
};

/**
 * PATCH /api/admin/users/:role/:id/status
 * - for counselor -> use counselorRepo.setStatus
 * - for admin -> update users table directly
 * - student role is not handled here (per your request) — return 400
 */
export const updateStatus = async (req: Request, res: Response) => {
  try {
    if (!ensureAdmin(req))
      return res.status(403).json({ success: false, error: "Forbidden" });

    const { role, id } = req.params;
    const { status } = req.body;
    if (!["active", "inactive"].includes(status)) {
      return res.status(400).json({ success: false, error: "Invalid status" });
    }

    if (role === "counselor") {
      if (typeof counselorRepo.setStatus === "function") {
        const ok = await counselorRepo.setStatus(Number(id), status);
        if (!ok)
          return res
            .status(404)
            .json({ success: false, error: "Counselor not found" });
        return res.json({ success: true, status });
      }
      return res.status(501).json({
        success: false,
        error: "Counselor status update not implemented",
      });
    } else if (role === "admin") {
      // update users table
      try {
        const q = `UPDATE users SET status = $1 WHERE id = $2`;
        const r = await pool.query(q, [status, id]);
        if (r.rowCount === 0)
          return res
            .status(404)
            .json({ success: false, error: "Admin not found" });
        return res.json({ success: true, status });
      } catch (err) {
        console.error("updateStatus admin error:", err);
        return res.status(500).json({ success: false, error: "Server error" });
      }
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

/**
 * DELETE /api/admin/users/:role/:id
 * - counselor -> counselorRepo.delete
 * - admin -> delete from users table
 * - student -> unsupported by this controller (return 400)
 */
export const removeUser = async (req: Request, res: Response) => {
  try {
    if (!ensureAdmin(req))
      return res.status(403).json({ success: false, error: "Forbidden" });

    const { role, id } = req.params;

    if (role === "counselor") {
      if (typeof counselorRepo.delete === "function") {
        const ok = await counselorRepo.delete(Number(id));
        if (!ok)
          return res
            .status(404)
            .json({ success: false, error: "Counselor not found" });
        return res.json({ success: true });
      }
      return res
        .status(501)
        .json({ success: false, error: "Counselor delete not implemented" });
    } else if (role === "admin") {
      try {
        const q = `DELETE FROM users WHERE id = $1`;
        const r = await pool.query(q, [id]);
        if (r.rowCount === 0)
          return res
            .status(404)
            .json({ success: false, error: "Admin not found" });
        return res.json({ success: true });
      } catch (err) {
        console.error("removeUser admin error:", err);
        return res.status(500).json({ success: false, error: "Server error" });
      }
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

export default { getUsers, createUser, updateStatus, removeUser };
