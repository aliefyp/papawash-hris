export const WORK_HOURS = 9;
const MIN_OVERTIME_MINUTES = 15; // under this is ignored

// Overtime for one day = (clock out - clock in - 9h), decimal hours, ignored under 15 minutes.
export function overtimeHours(clockIn: string | Date, clockOut: string | Date): number {
  const worked = (new Date(clockOut).getTime() - new Date(clockIn).getTime()) / 60_000;
  const over = worked - WORK_HOURS * 60;
  return over < MIN_OVERTIME_MINUTES ? 0 : Math.round((over / 60) * 100) / 100;
}
