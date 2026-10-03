import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { buildRecap } from "@/lib/attendance-recap";
import { todayWib, wibMonthRange } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const parseMonth = (v: string | undefined) => (/^\d{4}-(0[1-9]|1[0-2])$/.test(v ?? "") ? v! : todayWib().slice(0, 7));

export const shiftMonth = (month: string, delta: number) => {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
};

// One query for the month's sessions (by WIB month of clock-in) plus all employees, as the owner (RLS applies), or with the given client (the Telegram bot passes the service client).
export async function loadMonthRecap(month: string, client?: SupabaseClient) {
  const supabase = client ?? (await createClient());
  const { from, to } = wibMonthRange(month);
  const [{ data: employees }, { data: sessions }] = await Promise.all([
    supabase.from("employees").select("id, name, active"),
    supabase
      .from("attendance_sessions")
      .select("employee_id, clock_in_at, clock_out_at, status, correction_note")
      .gte("clock_in_at", from)
      .lt("clock_in_at", to)
      .order("clock_in_at"),
  ]);
  return buildRecap(employees ?? [], sessions ?? []);
}
