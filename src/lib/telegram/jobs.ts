import "server-only";
import { sendMessage } from "./api";
import { ownerIds } from "./auth";
import {
  activeEmployees,
  appUrl,
  claim,
  countSessionsOn,
  deductedLeaveMinutes,
  flaggedSessions,
  isClaimed,
  leavesOn,
  payrollPeriods,
  sessionsOn,
  unclaim,
} from "./data";
import { daySummaryMessage, noCheckinMessage, payrollReminderMessage } from "./messages";
import { dueJobs, type Job } from "./schedule";

const wibDate = (now: Date) => new Date(now.getTime() + 7 * 3_600_000).toISOString().slice(0, 10);

// The text for a job, or null when there is nothing to send (somebody already checked in, payroll locked...).
async function buildMessage(job: Job, now: Date): Promise<string | null> {
  const today = wibDate(now);
  switch (job.kind) {
    case "no-checkin": {
      if (!(await activeEmployees()).length) return null; // nothing set up yet
      return (await countSessionsOn(today)) > 0 ? null : noCheckinMessage();
    }
    case "daily-summary": {
      const [employees, sessions, leaves, flagged] = await Promise.all([activeEmployees(), sessionsOn(today), leavesOn(today), flaggedSessions()]);
      return daySummaryMessage({ date: today, employees, sessions, leaves, flagged, url: appUrl() });
    }
    case "payroll-reminder": {
      const month = today.slice(0, 7);
      const [periods, flagged, deducted] = await Promise.all([payrollPeriods(month), flaggedSessions(), deductedLeaveMinutes(month)]);
      return payrollReminderMessage({ month, periods, flagged, deductedLeaveMinutes: deducted, url: appUrl() });
    }
  }
}

export type JobResult = { kind: string; key: string; status: string; preview?: string | null };

// Called every minute. Each owner chat has its own dedupe key, so a failed send is retried for that chat only.
// dry = report what would be sent without claiming or sending anything.
export async function runDueJobs(now: Date, dry: boolean): Promise<JobResult[]> {
  const chats = ownerIds();
  const results: JobResult[] = [];
  for (const job of dueJobs(now)) {
    const pending: string[] = [];
    for (const chat of chats) if (!(await isClaimed(`${job.key}:${chat}`))) pending.push(chat);

    if (!pending.length && !dry) {
      results.push({ ...job, status: "sudah terkirim" });
      continue;
    }
    const message = await buildMessage(job, now);
    if (dry) {
      results.push({
        ...job,
        status: !pending.length ? "sudah terkirim" : message ? `akan dikirim ke ${pending.length} chat` : "dilewati (tidak ada yang perlu dikirim)",
        preview: message,
      });
      continue;
    }
    if (!message) {
      results.push({ ...job, status: "dilewati" });
      continue;
    }
    if (!chats.length) throw new Error("TELEGRAM_OWNER_CHAT_ID is not set");

    let sent = 0;
    let failed = 0;
    for (const chat of pending) {
      const key = `${job.key}:${chat}`;
      if (!(await claim(key))) continue; // another tick got there first
      try {
        await sendMessage(chat, message);
        sent++;
      } catch (e) {
        await unclaim(key); // the next tick inside the window retries this chat
        failed++;
        console.error("telegram job failed", key, e);
      }
    }
    results.push({ ...job, status: failed ? `terkirim ${sent}, gagal ${failed} (dicoba lagi)` : `terkirim ke ${sent} chat` });
  }
  return results;
}
