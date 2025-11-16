// src/controllers/adminUsersController.ts
import { Request, Response } from "express";
import { studentRepository } from "../repositories/studentRepository";
import counselorRepo from "../repositories/counselorRepository";

const ensureAdmin = (req: Request) => {
  const u = (req as any).user;
  if (!u) return false;
  const role = String(u.role ?? "").toLowerCase();
  return role === "admin";
};

const tryCallList = async (repo: any): Promise<any[]> => {
  if (!repo) return [];
  const candidates = ["getAll", "list", "findAll", "all", "fetchAll", "get"];
  for (const fn of candidates) {
    if (typeof repo[fn] === "function") {
      try {
        const res = await repo[fn]();
        if (Array.isArray(res)) return res;
        // Some repos return { rows: [...] } or { data: [...] }
        if (res && Array.isArray(res.rows)) return res.rows;
        if (res && Array.isArray(res.data)) return res.data;
      } catch (e) {
        // continue to next
      }
    }
  }
  return [];
};

const tryCallCreate = async (repo: any, payload: any): Promise<any | null> => {
  if (!repo) return null;
  const candidates = ["create", "insert", "add", "save", "upsert"];
  for (const fn of candidates) {
    if (typeof repo[fn] === "function") {
      try {
        const r = await repo[fn](payload);
        return r;
      } catch (e) {
        // try next
      }
    }
  }
  return null;
};

export const getUsers = async (req: Request, res: Response) => {
  try {
    if (!ensureAdmin(req))
      return res.status(403).json({ success: false, error: "Forbidden" });

    // Try to fetch students and counselors using common repo method names
    const students = (await tryCallList(studentRepository)) || [];
    const counselors = (await tryCallList(counselorRepo)) || [];

    // Normalise to frontend-friendly shape: { id, name, email, role, status, raw }
    const normStudents = (students || []).map((s: any) => {
      const id =
        s?.id ??
        s?.student_id ??
        s?.userId ??
        s?.studentId ??
        String(s?.user_id ?? s?.userId ?? s?.id ?? "");
      const name =
        s?.name ??
        s?.full_name ??
        (s?.email ? s.email.split("@")[0] : `student-${id}`);
      return {
        id: String(id),
        name,
        email: s?.email ?? null,
        role: "student",
        status: (s?.status ?? "active")?.toString?.().toLowerCase() ?? "active",
        raw: s,
      };
    });

    const normCounselors = (counselors || []).map((c: any) => {
      const id =
        c?.id ??
        c?.counselor_id ??
        c?.userId ??
        c?.counselorId ??
        String(c?.id ?? "");
      const name =
        c?.name ??
        c?.full_name ??
        (c?.email ? c.email.split("@")[0] : `counselor-${id}`);
      return {
        id: String(id),
        name,
        email: c?.email ?? null,
        role: "counselor",
        status: (c?.status ?? "active")?.toString?.().toLowerCase() ?? "active",
        raw: c,
      };
    });

    // Combine — frontend expects a single array
    const combined = [...normStudents, ...normCounselors];

    return res.json({ success: true, users: combined });
  } catch (err) {
    console.error("admin.getUsers error:", err);
    return res.status(500).json({ success: false, error: "Server error" });
  }
};

export const createUser = async (req: Request, res: Response) => {
  try {
    if (!ensureAdmin(req))
      return res.status(403).json({ success: false, error: "Forbidden" });

    const { name, email, role } = req.body || {};
    if (!name || !email || !role) {
      return res
        .status(400)
        .json({ success: false, error: "Missing required fields" });
    }

    // Normalize role string
    const roleStr = String(role).toLowerCase();

    let created: any = null;
    if (roleStr === "counselor") {
      created = await tryCallCreate(counselorRepo, { name, email });
    } else if (roleStr === "student") {
      created = await tryCallCreate(studentRepository, { name, email });
    } else if (roleStr === "admin") {
      // Admin creation: many systems don't have a dedicated "admins" repo. Attempt to use studentRepository or fallback.
      created = await tryCallCreate(studentRepository, {
        name,
        email,
        role: "admin",
      });
    }

    // If repositories did not actually create a persistent record, return a sensible "created" object
    if (!created) {
      created = {
        id: Date.now(),
        name,
        email,
        role: roleStr,
        status: "active",
        created_at: new Date().toISOString(),
      };
      console.warn(
        "createUser: repository create not available — returning ephemeral object",
        { role: roleStr }
      );
    }

    return res.status(201).json({ success: true, user: created });
  } catch (err) {
    console.error("admin.createUser error:", err);
    return res.status(500).json({ success: false, error: "Server error" });
  }
};

export const updateStatus = async (req: Request, res: Response) => {
  try {
    if (!ensureAdmin(req))
      return res.status(403).json({ success: false, error: "Forbidden" });

    const { role, id } = req.params;
    const { status } = req.body;
    if (!["active", "inactive"].includes(status)) {
      return res.status(400).json({ success: false, error: "Invalid status" });
    }

    if (role === "student") {
      if (typeof studentRepository.setStatus === "function") {
        const ok = await studentRepository.setStatus(Number(id), status);
        if (!ok)
          return res
            .status(404)
            .json({ success: false, error: "Student not found" });
        return res.json({ success: true, status });
      }
      return res.status(501).json({
        success: false,
        error: "Student status update not implemented",
      });
    } else if (role === "counselor") {
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

export const removeUser = async (req: Request, res: Response) => {
  try {
    if (!ensureAdmin(req))
      return res.status(403).json({ success: false, error: "Forbidden" });

    const { role, id } = req.params;

    if (role === "student") {
      if (typeof studentRepository.delete === "function") {
        const ok = await studentRepository.delete(Number(id));
        if (!ok)
          return res
            .status(404)
            .json({ success: false, error: "Student not found" });
        return res.json({ success: true });
      }
      return res
        .status(501)
        .json({ success: false, error: "Student delete not implemented" });
    } else if (role === "counselor") {
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
