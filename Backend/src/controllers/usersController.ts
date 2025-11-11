// controllers/usersController.ts
import { Request, Response } from "express";
import {
  fetchAllUsers,
  createUser as createUserService,
  UserRow,
} from "../services/usersService";

/**
 * GET /api/admin/users
 * Admin-only endpoint that returns all students + counselors normalized.
 */
export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    // Ensure request is authenticated
    if (!user)
      return res.status(401).json({ success: false, error: "Unauthorized" });

    // Only admin can access user management
    const role = String(user.role ?? "").toLowerCase();
    if (role !== "admin") {
      return res.status(403).json({ success: false, error: "Forbidden" });
    }

    const rows: UserRow[] = await fetchAllUsers();

    // Final normalization for client: ensure avatar and readable fields present
    const normalized = rows.map((r) => ({
      id: r.id ?? "",
      name: r.name ?? r.email ?? "",
      email: r.email ?? "",
      role: r.role ?? "user",
      status: r.status ?? "active",
      lastActive: r.lastActive ?? null,
      registeredDate: r.registeredDate ?? null,
      avatar:
        r.avatar ??
        (r.name
          ? `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(
              r.name
            )}`
          : null),
      // Keep raw for debugging; remove in production if you don't want to expose DB columns
      raw: r.raw ?? null,
    }));

    return res.json({ success: true, users: normalized });
  } catch (err: any) {
    console.error("getAllUsers error:", err);
    return res
      .status(500)
      .json({ success: false, error: err.message || "Server error" });
  }
};

/**
 * POST /api/admin/users
 * Admin-only: create a new user (student / counselor / admin).
 * Accepts: { name, email, role }
 * Returns { success: true, user: { ... } }
 */
export const createUser = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user)
      return res.status(401).json({ success: false, error: "Unauthorized" });

    if ((user.role ?? "").toString().toLowerCase() !== "admin") {
      return res.status(403).json({ success: false, error: "Forbidden" });
    }

    const { name, email, role } = req.body ?? {};

    if (!name || !email) {
      return res
        .status(400)
        .json({ success: false, error: "name and email are required" });
    }

    const allowedRoles = ["admin", "counselor", "student"];
    const normalizedRole = (role ?? "student").toString().toLowerCase();
    if (!allowedRoles.includes(normalizedRole)) {
      return res.status(400).json({ success: false, error: "invalid role" });
    }

    // Call service to create
    const created = await createUserService({
      name: String(name),
      email: String(email),
      role: normalizedRole as "admin" | "counselor" | "student",
    });

    return res.status(201).json({ success: true, user: created });
  } catch (err: any) {
    console.error("createUser error:", err);
    return res
      .status(500)
      .json({ success: false, error: err.message ?? "Server error" });
  }
};

export default { getAllUsers, createUser };
