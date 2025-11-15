// services/usersService.ts
import pool from "../config/db";
import { getAllCounselors } from "../repositories/counselorRepository";
import { Counselor } from "../models/Counselor";

export type UserRow = {
  id: string;
  name: string;
  email: string;
  role: "student" | "counselor" | "admin" | string;
  status: "active" | "inactive" | string;
  lastActive?: string | null; // ISO
  registeredDate?: string | null; // ISO
  avatar?: string | null;
  raw?: any;
};

/**
 * Fetch students from DB and normalize rows.
 */
export const fetchAllStudents = async (): Promise<UserRow[]> => {
  try {
    // select explicit fields to ensure consistent shapes
    const q = `SELECT student_id, name, email, created_at, updated_at, last_active, status FROM students ORDER BY student_id`;
    const res = await pool.query(q);
    const rows = res.rows.map((r: any) => {
      const id = r.student_id ?? r.id ?? r.studentId ?? null;
      const name =
        r.name ??
        (r.first_name || r.last_name
          ? `${r.first_name ?? ""} ${r.last_name ?? ""}`.trim()
          : null) ??
        null;
      const email = r.email ?? r.email_address ?? null;

      // Normalize status: support boolean is_active, status text, etc.
      const status =
        (
          r.status ??
          (typeof r.is_active !== "undefined"
            ? r.is_active
              ? "active"
              : "inactive"
            : undefined) ??
          (r.active ? "active" : undefined) ??
          "active"
        )
          .toString()
          .toLowerCase() || "active";

      // prefer explicit last_active column if present
      const lastActive = r.last_active ?? r.lastActive ?? null;

      // prefer created_at for registration
      const registeredDate =
        r.created_at ?? r.registered_at ?? r.createdAt ?? null;

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

export const fetchAllCounselors = async (): Promise<UserRow[]> => {
  try {
    const counselors: Counselor[] = await getAllCounselors();
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
 * Aggregate both students and counselors into a single array
 */
export const fetchAllUsers = async (): Promise<UserRow[]> => {
  const [students, counselors] = await Promise.all([
    fetchAllStudents(),
    fetchAllCounselors(),
  ]);
  // return students then counselors (you can change ordering if desired)
  return [...students, ...counselors];
};

export const createUser = async (opts: {
  name: string;
  email: string;
  role: "admin" | "counselor" | "student" | string;
}) => {
  const { name, email, role } = opts;
  // Basic server-side validation
  if (!name || !email) {
    throw new Error("name and email required");
  }

  const normalizedRole = (role ?? "student").toString().toLowerCase();

  try {
    if (normalizedRole === "student") {
      const q = `INSERT INTO students (name, email, status, created_at) VALUES ($1, $2, $3, NOW()) RETURNING student_id AS id, name, email, status, created_at`;
      const values = [name, email, "active"];
      const r = await pool.query(q, values);
      return r.rows[0];
    }

    if (normalizedRole === "counselor") {
      const q = `INSERT INTO counselors (name, email, status, created_at) VALUES ($1, $2, $3, NOW()) RETURNING counselor_id AS id, name, email, status, created_at`;
      const values = [name, email, "active"];
      const r = await pool.query(q, values);
      return r.rows[0];
    }
    const q = `INSERT INTO users (name, email, role, status, created_at) VALUES ($1, $2, $3, $4, NOW()) RETURNING id, name, email, role, status, created_at`;
    const values = [name, email, normalizedRole, "active"];
    const r = await pool.query(q, values);
    return r.rows[0];
  } catch (err: any) {
    console.error("createUser service error:", err);
    // Bubble up error message
    throw new Error(err?.message ?? "Failed to create user");
  }
};
