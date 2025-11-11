// src/services/sessionNotes.ts
import * as repo from "../repositories/sessionNotes";
import { SessionNote } from "../models/sessionNotes";

export const createSessionNote = async (payload: {
  student_id: number;
  counselor_id: number;
  session_datetime: string;
  notes: string;
}): Promise<SessionNote> => {
  // future business rules (e.g. sanitize notes, validate session_datetime range) can be added here
  return await repo.create(payload);
};

export const getNotesByCounselor = async (
  counselor_id: number
): Promise<SessionNote[]> => {
  return await repo.findByCounselor(counselor_id);
};

/**
 * Expose student check so controller can reuse repository logic
 */
export const lookupStudentById = async (student_id: number) => {
  return await repo.getStudentById(student_id);
};
