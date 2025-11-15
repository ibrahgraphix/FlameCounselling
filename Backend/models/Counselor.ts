export interface Counselor {
  counselor_id: number;
  name: string;
  email: string;
  password_hash?: string | null;
  role?: "counselor" | "chief" | string | null;
  specialty?: string | null;

  // google fields (may exist in DB)
  google_connected?: boolean | null;
  google_access_token?: string | null;
  google_refresh_token?: string | null;
  google_calendar_id?: string | null;
  google_outh_state?: string | null;
  google_token_expiry?: number | null;
  timezone?: string | null;
  work_start_time?: string | null;
  work_end_time?: string | null;
}
