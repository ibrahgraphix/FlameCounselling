export interface BookingRow {
  booking_id: number;
  student_id: number;
  counselor_id: number;
  booking_date: string; // YYYY-MM-DD
  booking_time: string; // HH:MM:SS or HH:MM
  year_level?: string | null;
  additional_notes?: string | null;
  status: string;
  created_at?: string;
  updated_at?: string;
}
