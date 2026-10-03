import { describe, expect, it } from "vitest";
import { dueJobs } from "./schedule";

// WIB = UTC+7. 07:05 WIB = 00:05Z.
const at = (iso: string) => new Date(iso);
const kinds = (iso: string) => dueJobs(at(iso)).map((j) => j.kind);

describe("dueJobs", () => {
  it("sends the no-check-in alert from 07:05 WIB, not before", () => {
    expect(kinds("2026-10-01T00:04:00Z")).toEqual([]); // 07:04
    expect(kinds("2026-10-01T00:05:00Z")).toEqual(["no-checkin"]); // 07:05
    expect(dueJobs(at("2026-10-01T00:05:00Z"))[0].key).toBe("alert-0705:2026-10-01");
  });
  it("keeps the job due for 30 minutes after a late tick, then stops", () => {
    expect(kinds("2026-10-01T00:34:00Z")).toEqual(["no-checkin"]); // 07:34
    expect(kinds("2026-10-01T00:35:00Z")).toEqual([]); // 07:35
  });
  it("sends the daily summary at 21:30 WIB", () => {
    expect(kinds("2026-10-01T14:29:00Z")).toEqual([]); // 21:29
    expect(kinds("2026-10-01T14:30:00Z")).toEqual(["daily-summary"]); // 21:30
    expect(kinds("2026-10-01T14:59:00Z")).toEqual(["daily-summary"]);
    expect(kinds("2026-10-01T15:00:00Z")).toEqual([]); // 22:00
  });
  it("uses the WIB date, not the UTC date, for the key", () => {
    // 21:30 WIB on 30 Sep is 14:30Z on 30 Sep; 00:05Z on 1 Oct is already 1 Oct in WIB
    expect(dueJobs(at("2026-09-30T14:30:00Z"))[0].key).toBe("summary:2026-09-30");
    expect(dueJobs(at("2026-10-01T00:05:00Z"))[0].key).toBe("alert-0705:2026-10-01");
  });
  it("sends the payroll reminder only on the last day of the month at 09:00 WIB", () => {
    expect(kinds("2026-09-30T02:00:00Z")).toEqual(["payroll-reminder"]); // 30 Sep 09:00 WIB
    expect(dueJobs(at("2026-09-30T02:00:00Z"))[0].key).toBe("payroll:2026-09");
    expect(kinds("2026-09-29T02:00:00Z")).toEqual([]); // 29 Sep is not the last day
    expect(kinds("2026-09-30T01:59:00Z")).toEqual([]); // 08:59
  });
  it("knows the last day of February, including a leap year", () => {
    expect(kinds("2027-02-28T02:00:00Z")).toEqual(["payroll-reminder"]);
    expect(kinds("2028-02-28T02:00:00Z")).toEqual([]); // 2028 is a leap year
    expect(kinds("2028-02-29T02:00:00Z")).toEqual(["payroll-reminder"]);
  });
  it("handles 31-day months and the year end", () => {
    expect(kinds("2026-10-31T02:00:00Z")).toEqual(["payroll-reminder"]);
    expect(kinds("2026-12-31T02:00:00Z")).toEqual(["payroll-reminder"]);
    expect(kinds("2026-10-30T02:00:00Z")).toEqual([]);
  });
  it("can return several jobs at once only when their windows overlap (they do not here)", () => {
    expect(kinds("2026-10-01T05:00:00Z")).toEqual([]); // 12:00
  });
});
