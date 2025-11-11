// src/models/sessionNotes.ts
export interface SessionNote {
  note_id: number;
  student_id: number;
  counselor_id: number;
  session_datetime: string;
  notes: string;
  created_at: string;
  student_name?: string | null;
}
