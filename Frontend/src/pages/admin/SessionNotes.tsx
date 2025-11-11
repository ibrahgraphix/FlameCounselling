// src/pages/admin/Session.tsx
import React, { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";

import * as XLSX from "xlsx"; // sheetjs
import { format } from "date-fns";

// Backend API base URL from .env
const API_BASE = import.meta.env.VITE_API_URL || "";

type BookingProp = {
  student_id?: number;
  student_name?: string;
  session_datetime?: string;
  created_at?: string;
};

type SessionNotesProps = {
  booking?: BookingProp;
  counselorName?: string;
};

type Note = {
  note_id: number;
  student_id: number;
  counselor_id: number;
  session_datetime: string;
  notes: string;
  created_at?: string;
  student_name?: string | null;
  student_email?: string | null;
};

/** Detect dark mode only when app explicitly set it:
 * - html has class "dark" OR localStorage.theme === "dark"
 * Does NOT rely on system prefers-color-scheme.
 */
function useDetectDarkMode() {
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      const htmlHasDark = document.documentElement.classList.contains("dark");
      if (htmlHasDark) return true;
      const ls = localStorage.getItem("theme");
      if (ls === "dark") return true;
      return false;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    const update = () => {
      try {
        const htmlHasDark = document.documentElement.classList.contains("dark");
        const ls = localStorage.getItem("theme");
        setIsDark(Boolean(htmlHasDark || ls === "dark"));
      } catch {
        // ignore
      }
    };

    let mo: MutationObserver | null = null;
    try {
      mo = new MutationObserver(() => update());
      mo.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["class"],
      });
    } catch {
      mo = null;
    }

    const onStorage = (ev: StorageEvent) => {
      if (!ev) return;
      if (ev.key === "theme") update();
    };
    window.addEventListener("storage", onStorage);

    update();

    return () => {
      try {
        if (mo) mo.disconnect();
      } catch {}
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  return isDark;
}

// parse to Date with tolerance for a few common server formats
const parseToDate = (s?: string | null): Date | null => {
  if (!s) return null;
  const str = String(s);
  try {
    if (str.includes("T") || str.endsWith("Z")) {
      const d = new Date(str);
      if (!isNaN(d.getTime())) return d;
    }

    const reYMDHMS = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;
    if (reYMDHMS.test(str)) {
      const iso = str.replace(" ", "T") + "Z";
      const d = new Date(iso);
      if (!isNaN(d.getTime())) return d;
    }

    const reYMD = /^\d{4}-\d{2}-\d{2}$/;
    if (reYMD.test(str)) {
      const iso = str + "T00:00:00Z";
      const d = new Date(iso);
      if (!isNaN(d.getTime())) return d;
    }

    const d2 = new Date(str);
    if (!isNaN(d2.getTime())) return d2;
  } catch {}
  return null;
};

export default function SessionNotes({
  booking,
  counselorName,
}: SessionNotesProps) {
  const isDark = useDetectDarkMode();

  const getCurrentDateTime = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day} ${hours}:${minutes}`;
  };

  const [notesList, setNotesList] = useState<Note[]>([]);
  const [loading, setLoading] = useState(false);

  // map student_id -> student name (client-side cache)
  const [studentNames, setStudentNames] = useState<Record<number, string>>({});

  const getToken = () => localStorage.getItem("token");

  const buildHeaders = (token?: string | null) => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    return headers;
  };

  const fetchStudentNameById = async (id: number): Promise<string | null> => {
    if (!id || id <= 0) return null;
    const token = getToken();
    const attempts = [
      `${API_BASE}/api/students/${id}`,
      `${API_BASE}/api/students?student_id=${id}`,
      `${API_BASE}/api/students?id=${id}`,
      `${API_BASE}/api/students/search?q=${id}`,
    ];
    for (const url of attempts) {
      try {
        const res = await fetch(url, { headers: buildHeaders(token) });
        if (!res.ok) continue;
        const data = await res.json();
        const row = Array.isArray(data) ? data[0] : data;
        if (!row) continue;
        const name =
          row.student_name ??
          row.name ??
          row.full_name ??
          row.studentName ??
          null;
        if (name) return String(name);
      } catch (e) {
        continue;
      }
    }
    return null;
  };

  useEffect(() => {
    async function fetchNotes() {
      setLoading(true);
      try {
        const token = getToken();
        const res = await fetch(`${API_BASE}/api/session-notes`, {
          headers: buildHeaders(token),
        });

        if (!res.ok) {
          if (res.status === 401 || res.status === 403) {
            console.warn("Not authorized to fetch session notes");
            setNotesList([]);
            setStudentNames({});
            setLoading(false);
            return;
          }
          throw new Error("Failed to fetch notes");
        }

        const data: Note[] = await res.json();
        setNotesList(data);

        const namesMap: Record<number, string> = {};
        for (const n of data) {
          if (n.student_name) namesMap[n.student_id] = n.student_name;
        }
        if (Object.keys(namesMap).length > 0) {
          setStudentNames((s) => ({ ...s, ...namesMap }));
        }

        const ids = Array.from(
          new Set(data.map((n) => n.student_id).filter(Boolean))
        );
        const toFetch = ids.filter((i) => !namesMap[i] && !studentNames[i]);
        if (toFetch.length > 0) {
          const fetched: Record<number, string> = {};
          await Promise.all(
            toFetch.map(async (id) => {
              const nm = await fetchStudentNameById(id);
              if (nm) fetched[id] = nm;
            })
          );
          if (Object.keys(fetched).length > 0)
            setStudentNames((s) => ({ ...s, ...fetched }));
        }
      } catch (err) {
        console.error("fetchNotes error", err);
        alert("Could not fetch session notes. Check console for details.");
      } finally {
        setLoading(false);
      }
    }

    fetchNotes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const exportNotesToXLSX = (notes: Note[]) => {
    if (!notes || notes.length === 0) {
      alert("No notes to export.");
      return;
    }

    const data = notes.map((n) => {
      // prefer created_at (DB), fall back to session_datetime
      const dateSource = n.created_at ?? n.session_datetime;
      let prettyDate = String(dateSource);
      try {
        const d = parseToDate(dateSource);
        if (d) prettyDate = format(d, "MMM d, yyyy, h:mm a");
      } catch {
        // leave as-is
      }

      return {
        Student:
          n.student_name ?? studentNames[n.student_id] ?? String(n.student_id),
        "Created At": prettyDate,
        Notes: n.notes,
      };
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Session Notes");

    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([wbout], { type: "application/octet-stream" });
    const filename = `session_notes_${new Date()
      .toISOString()
      .slice(0, 19)
      .replace(/[:T]/g, "-")}.xlsx`;

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  // theme colors used inside page (keeps same blue gradient palette)
  const LABEL_COLOR = isDark ? "#cbd5e1" : undefined;
  const HEADING_COLOR = isDark ? "#e6eefc" : undefined;
  const BG = isDark ? "#0f1724" : "white";
  const mutedText = isDark ? "#94a3b8" : undefined;

  return (
    <div className="p-6 space-y-6" style={{ background: BG }}>
      <div>
        <h2
          className="text-2xl font-semibold mb-4"
          style={{ color: HEADING_COLOR }}
        >
          Session Notes
        </h2>

        <div className="mb-4">
          <Button
            onClick={() => {
              if (notesList.length === 0) {
                alert("No session notes to export.");
                return;
              }
              exportNotesToXLSX(notesList);
            }}
          >
            Export as Excel
          </Button>
        </div>

        <Card className="p-4">
          {loading ? (
            <div style={{ color: mutedText }}>Loading...</div>
          ) : notesList.length === 0 ? (
            <div style={{ color: mutedText }}>No session notes yet.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {notesList.map((note) => (
                  <TableRow key={note.note_id}>
                    <TableCell
                      style={{ color: isDark ? "#e6eefc" : undefined }}
                    >
                      {note.student_name ??
                        studentNames[note.student_id] ??
                        String(note.student_id)}
                    </TableCell>
                    <TableCell
                      style={{ color: isDark ? "#cbd5e1" : undefined }}
                    >
                      {(() => {
                        try {
                          const source =
                            note.created_at ?? note.session_datetime;
                          const d = parseToDate(source);
                          if (d) return format(d, "MMM d, yyyy, h:mm a");
                          return String(source);
                        } catch {
                          return String(
                            note.session_datetime ?? note.created_at ?? ""
                          );
                        }
                      })()}
                    </TableCell>
                    <TableCell
                      style={{
                        whiteSpace: "pre-wrap",
                        color: isDark ? "#cbd5e1" : undefined,
                      }}
                    >
                      {note.notes}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>
    </div>
  );
}
