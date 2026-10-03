import "server-only";
import { MAX_OPEN_MS } from "@/lib/attendance-rules";
import { monthDateRange, wibDayRange, wibMonthRange } from "@/lib/format";
import { adminClient } from "@/lib/supabase/admin";
import type { Flagged, Sess } from "./messages";

const db = () => adminClient();
export const appUrl = () => (process.env.APP_URL || "https://papawash-hris.vercel.app").replace(/\/$/, "");
export const monthOf = (date: string) => date.slice(0, 7);

export async function activeEmployees() {
  const { data } = await db().from("employees").select("id, name, outlet_id").eq("active", true).order("name");
  return data ?? [];
}

const SESSION_COLUMNS = "employee_id, clock_in_at, clock_out_at, status";

export async function sessionsOn(date: string): Promise<Sess[]> {
  const { from, to } = wibDayRange(date);
  const { data } = await db().from("attendance_sessions").select(SESSION_COLUMNS).gte("clock_in_at", from).lt("clock_in_at", to).order("clock_in_at");
  return data ?? [];
}

// Today's sessions plus sessions still open within the open-session limit (a night shift started yesterday).
export async function sessionsForStatus(date: string, now: Date): Promise<Sess[]> {
  const today = await sessionsOn(date);
  const { data: open } = await db()
    .from("attendance_sessions")
    .select(SESSION_COLUMNS)
    .is("clock_out_at", null)
    .gte("clock_in_at", new Date(now.getTime() - MAX_OPEN_MS).toISOString());
  const seen = new Set(today.map((s) => `${s.employee_id}|${s.clock_in_at}`));
  return [...today, ...(open ?? []).filter((s) => !seen.has(`${s.employee_id}|${s.clock_in_at}`))];
}

export async function flaggedSessions(): Promise<Flagged[]> {
  const { data } = await db()
    .from("attendance_sessions")
    .select("clock_in_at, employees(name)")
    .eq("status", "perlu_koreksi")
    .order("clock_in_at");
  return (data ?? []).map((r) => ({ name: (r.employees as unknown as { name: string } | null)?.name ?? "?", clock_in_at: r.clock_in_at }));
}

// Leave rows are optional: if the leaves table is missing the bot just reports none.
export async function leavesOn(date: string) {
  const { data, error } = await db().from("leaves").select("employee_id, minutes, deducted").eq("leave_date", date);
  return error ? [] : (data ?? []);
}

export async function deductedLeaveMinutes(month: string) {
  const r = monthDateRange(month);
  const { data, error } = await db().from("leaves").select("minutes").eq("deducted", true).gte("leave_date", r.from).lt("leave_date", r.to);
  return error ? 0 : (data ?? []).reduce((s, l) => s + l.minutes, 0);
}

export async function payrollPeriods(month: string) {
  const { data } = await db().from("payroll_periods").select("status").eq("month", `${month}-01`);
  return data ?? [];
}

export async function isMonthLocked(outletId: string, date: string) {
  const { count } = await db()
    .from("payroll_periods")
    .select("id", { count: "exact", head: true })
    .eq("outlet_id", outletId)
    .eq("month", `${monthOf(date)}-01`)
    .eq("status", "final");
  return !!count;
}

export async function countSessionsOn(date: string) {
  const { from, to } = wibDayRange(date);
  const { count } = await db().from("attendance_sessions").select("id", { count: "exact", head: true }).gte("clock_in_at", from).lt("clock_in_at", to);
  return count ?? 0;
}

export { wibMonthRange };

// ---- dedupe log: insert first, send second, delete the key again if sending failed ----
export async function isClaimed(key: string) {
  const { count } = await db().from("notification_log").select("key", { count: "exact", head: true }).eq("key", key);
  return !!count;
}
export async function claim(key: string): Promise<boolean> {
  const { error } = await db().from("notification_log").insert({ key });
  if (!error) return true;
  if (error.code === "23505") return false; // already there
  throw error;
}
export async function unclaim(key: string) {
  await db().from("notification_log").delete().eq("key", key);
}
