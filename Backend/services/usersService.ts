// src/services/usersService.ts
import pool from "../config/db";
import counselorRepo from "../repositories/counselorRepository";
import { Counselor } from "../models/Counselor";

export type UserRow = {
  id: string;
  name: string;
  email: string;
  role: "student" | "counselor" | "admin" | string;
  status: "active" | "inactive" | string;
  lastActive?: string | null;
  registeredDate?: string | null;
  avatar?: string | null;
  raw?: any;
};

/**
 * Fetch students directly (explicit SQL) — kept for listing.
 * This function does not import a studentRepository module.
 */
export const fetchAllStudents = async (): Promise<UserRow[]> => {
  try {
    const q = `SELECT student_id, name, email, created_at, updated_at, last_active, status FROM students ORDER BY student_id`;
    const res = await pool.query(q);
    const rows = res.rows.map((r: any) => {
      const id = r.student_id ?? r.id ?? r.studentId ?? null;
      const name = r.name ?? null;
      const email = r.email ?? r.email_address ?? null;
      const status =
        (
          r.status ??
          (typeof r.is_active !== "undefined"
            ? r.is_active
              ? "active"
              : "inactive"
            : undefined) ??
          "active"
        )
          .toString()
          .toLowerCase() || "active";

      const lastActive = r.last_active ?? r.lastActive ?? null;
      const registeredDate = r.created_at ?? r.registered_at ?? null;

      return {
        id: String(id ?? ""),
        name: name ?? email ?? "Student",
        email: String(email ?? ""),
        role: "student",
        status: status as "active" | "inactive" | string,
        lastActive: lastActive ? new Date(lastActive).toISOString() : null,
        registeredDate: registeredDate
          ? new Date(registeredDate).toISOString()
          : null,
        raw: r,
      } as UserRow;
    });

    return rows;
  } catch (err) {
    console.error("fetchAllStudents error:", err);
    return [];
  }
};

/**
 * Fetch counselors via the counselor repository you already have.
 */
export const fetchAllCounselors = async (): Promise<UserRow[]> => {
  try {
    const counselors: Counselor[] = await counselorRepo.getAllCounselors();
    const list: UserRow[] = (counselors || []).map((c) => {
      const id = c.counselor_id ?? (c as any).id ?? null;
      const name = c.name ?? (c as any).full_name ?? null;
      const email = c.email ?? (c as any).email_address ?? null;
      const role = c.role ?? "counselor";
      const raw = (c as any).raw ?? c;

      const lastActive =
        raw.last_active ?? raw.updated_at ?? raw.updatedAt ?? null;
      const registeredDate =
        raw.registered_at ?? raw.created_at ?? raw.createdAt ?? null;

      return {
        id: String(id ?? ""),
        name: name ?? email ?? "Counselor",
        email: String(email ?? ""),
        role: role as "counselor" | string,
        status: (raw.status ?? "active").toString().toLowerCase(),
        lastActive: lastActive ? new Date(lastActive).toISOString() : null,
        registeredDate: registeredDate
          ? new Date(registeredDate).toISOString()
          : null,
        avatar: (raw.avatar as string) ?? null,
        raw,
      } as UserRow;
    });

    return list;
  } catch (err) {
    console.error("fetchAllCounselors error:", err);
    return [];
  }
};

/**
 * Return combined list (students then counselors).
 */
export const fetchAllUsers = async (): Promise<UserRow[]> => {
  const [students, counselors] = await Promise.all([
    fetchAllStudents(),
    fetchAllCounselors(),
  ]);
  return [...students, ...counselors];
};

export const createUser = async (opts: {
  name: string;
  email: string;
  role: "admin" | "counselor" | "student" | string;
}) => {
  const { name, email, role } = opts;
  if (!name || !email) {
    throw new Error("name and email required");
  }
  const normalizedRole = (role ?? "student").toString().toLowerCase();

  try {
    // -------- counselor --------
    if (normalizedRole === "counselor") {
      // use existing counselor repository which returns normalized row (createCounselor)
      const created = await counselorRepo.createCounselor(
        name,
        email,
        "counselor",
        null
      );
      return {
        id: created?.counselor_id ?? created?.id ?? null,
        name: created?.name ?? name,
        email: created?.email ?? email,
        role: "counselor",
        status: created?.status ?? "active",
        created_at:
          created?.created_at ?? created?.createdAt ?? new Date().toISOString(),
        raw: created,
      };
    }

    // -------- admin (users table) --------
    if (normalizedRole === "admin") {
      try {
        const q = `INSERT INTO users (name, email, role, status, created_at) VALUES ($1, $2, $3, $4, NOW()) RETURNING id, name, email, role, status, created_at`;
        const vals = [name, email, "admin", "active"];
        const r = await pool.query(q, vals);
        if (r && r.rows && r.rows.length > 0) {
          const u = r.rows[0];
          return {
            id: u.id ?? null,
            name: u.name ?? name,
            email: u.email ?? email,
            role: u.role ?? "admin",
            status: u.status ?? "active",
            created_at: u.created_at ?? new Date().toISOString(),
            raw: u,
          };
        }
        // fallback ephemeral object (should not normally happen)
        return {
          id: Date.now(),
          name,
          email,
          role: "admin",
          status: "active",
          created_at: new Date().toISOString(),
        };
      } catch (err: any) {
        console.error("createUser admin insert error:", err);
        if (err && (err.code === "23505" || err.pgCode === "23505")) {
          const e: any = new Error("Email already exists");
          (e as any).pgCode = "23505";
          throw e;
        }
        throw err;
      }
    }

    if (normalizedRole === "student") {
      try {
        const q = `INSERT INTO students (name, email, status, created_at) VALUES ($1, $2, $3, NOW()) RETURNING student_id AS id, name, email, status, created_at`;
        const values = [name, email, "active"];
        const r = await pool.query(q, values);
        if (r && r.rows && r.rows.length > 0) {
          const s = r.rows[0];
          return {
            id: s.id ?? s.student_id ?? null,
            name: s.name ?? name,
            email: s.email ?? email,
            role: "student",
            status: s.status ?? "active",
            created_at: s.created_at ?? new Date().toISOString(),
            raw: s,
          };
        }
        // fallback ephemeral
        return {
          id: Date.now(),
          name,
          email,
          role: "student",
          status: "active",
          created_at: new Date().toISOString(),
        };
      } catch (err: any) {
        console.error("createUser student insert error:", err);
        if (err && (err.code === "23505" || err.pgCode === "23505")) {
          const e: any = new Error("Email already exists");
          (e as any).pgCode = "23505";
          throw e;
        }
        throw err;
      }
    }

    // Fallback: unknown role -> try users table with given role
    try {
      const q = `INSERT INTO users (name, email, role, status, created_at) VALUES ($1, $2, $3, $4, NOW()) RETURNING id, name, email, role, status, created_at`;
      const vals = [name, email, normalizedRole, "active"];
      const r = await pool.query(q, vals);
      if (r && r.rows && r.rows.length > 0) {
        const u = r.rows[0];
        return {
          id: u.id ?? null,
          name: u.name ?? name,
          email: u.email ?? email,
          role: u.role ?? normalizedRole,
          status: u.status ?? "active",
          created_at: u.created_at ?? new Date().toISOString(),
          raw: u,
        };
      }
      return {
        id: Date.now(),
        name,
        email,
        role: normalizedRole,
        status: "active",
        created_at: new Date().toISOString(),
      };
    } catch (err: any) {
      console.error("createUser fallback error:", err);
      if (err && (err.code === "23505" || err.pgCode === "23505")) {
        const e: any = new Error("Email already exists");
        (e as any).pgCode = "23505";
        throw e;
      }
      throw err;
    }
  } catch (err: any) {
    // normalize unique-violation
    if (err && (err.code === "23505" || err.pgCode === "23505")) {
      const e: any = new Error("Email already exists");
      (e as any).pgCode = "23505";
      throw e;
    }
    console.error("createUser service error:", err);
    throw err;
  }
};
