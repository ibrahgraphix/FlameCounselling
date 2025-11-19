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
 * Creates user. Behavior:
 * - student => delegate to usersService.createUser (unchanged)
 * - counselor => create in counselors table via counselorRepo.createCounselor
 * - admin => create in counselors table (role='admin') via counselorRepo.createCounselor
 *
 * This avoids attempting to write to a missing `users` table.
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

    const normalizedRole = (role ?? "student").toString().toLowerCase();

    try {
      let created: any = null;

      if (normalizedRole === "student") {
        // Keep previous student creation path (usersService)
        created = await createUserService({
          name: String(name),
          email: String(email),
          role: "student",
        });
      } else {
        // For both counselor and admin create a record in counselors table.
        // This avoids creating into a non-existent 'users' table.
        // counselorRepo.createCounselor handles schema differences and unique violations.
        created = await counselorRepo.createCounselor(
          String(name),
          String(email),
          normalizedRole === "admin" ? "admin" : "counselor",
          null
        );
      }

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
 * - for admin -> use counselorRepo.setStatus (admins stored in counselors table)
 * - student role -> use previous path (not implemented here) -> return 400
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

    const roleLower = (role ?? "").toString().toLowerCase();

    if (roleLower === "counselor" || roleLower === "admin") {
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
    } else if (roleLower === "student") {
      // Students handled elsewhere in your users service — keep behavior unchanged (unsupported here)
      return res
        .status(400)
        .json({ success: false, error: "Unsupported role (student)" });
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
 * - admin -> counselorRepo.delete (admins stored in counselors table)
 * - student -> unsupported here (return 400)
 */
export const removeUser = async (req: Request, res: Response) => {
  try {
    if (!ensureAdmin(req))
      return res.status(403).json({ success: false, error: "Forbidden" });

    const { role, id } = req.params;
    const roleLower = (role ?? "").toString().toLowerCase();

    if (roleLower === "counselor" || roleLower === "admin") {
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
    } else if (roleLower === "student") {
      return res
        .status(400)
        .json({ success: false, error: "Unsupported role (student)" });
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
