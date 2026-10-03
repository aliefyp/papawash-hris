export type JobKind = "no-checkin" | "daily-summary" | "payroll-reminder";
export type Job = { kind: JobKind; key: string };

const GRACE_MINUTES = 30; // a job missed by a late tick is still sent within this window, then skipped
const WIB_MS = 7 * 3_600_000;

const isLastDayOfMonth = (w: Date) => new Date(Date.UTC(w.getUTCFullYear(), w.getUTCMonth(), w.getUTCDate() + 1)).getUTCDate() === 1;

// Which scheduled messages are due at this instant (WIB wall clock). The key is unique per message, so the
// same job found by several ticks inside its window is only sent once.
export function dueJobs(now: Date): Job[] {
  const w = new Date(now.getTime() + WIB_MS); // UTC fields now read as WIB
  const date = w.toISOString().slice(0, 10);
  const minute = w.getUTCHours() * 60 + w.getUTCMinutes();
  const within = (hour: number, min: number) => {
    const start = hour * 60 + min;
    return minute >= start && minute < start + GRACE_MINUTES;
  };

  const jobs: Job[] = [];
  if (within(7, 5)) jobs.push({ kind: "no-checkin", key: `alert-0705:${date}` });
  if (within(21, 30)) jobs.push({ kind: "daily-summary", key: `summary:${date}` });
  if (isLastDayOfMonth(w) && within(9, 0)) jobs.push({ kind: "payroll-reminder", key: `payroll:${date.slice(0, 7)}` });
  return jobs;
}
