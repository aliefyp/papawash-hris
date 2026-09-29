import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { retentionCutoff } from "./photo-retention";

describe("retentionCutoff", () => {
  it("is exactly 90 days before now by default", () => {
    expect(retentionCutoff(new Date("2026-12-28T00:00:00Z"))).toBe("2026-09-29T00:00:00.000Z");
  });
  it("accepts another number of days", () => {
    expect(retentionCutoff(new Date("2026-10-10T00:00:00Z"), 10)).toBe("2026-09-30T00:00:00.000Z");
  });
});
