export const FULL_DAY_MINUTES = 9 * 60; // "Seharian" = one normal working day
export const MONTHLY_WORK_HOURS = 26 * 9; // hourly deduction rate = base salary / 234 hours

// Deduction for unpaid leave: base salary spread over 234 hours, times the hours taken, whole rupiah.
export function leaveDeduction(baseSalary: number, deductedMinutes: number): number {
  return Math.round((baseSalary / MONTHLY_WORK_HOURS) * (deductedMinutes / 60));
}

// 150 -> "2 jam 30 menit", 45 -> "45 menit", 540 -> "9 jam"
export function fmtLeave(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return [h ? `${h} jam` : "", m ? `${m} menit` : ""].filter(Boolean).join(" ");
}
