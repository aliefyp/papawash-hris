import type { VercelConfig } from "@vercel/config/v1";

export const config: VercelConfig = {
  // 20:00 UTC = 03:00 WIB. Deletes selfies older than 90 days (src/lib/photo-retention.ts).
  crons: [{ path: "/api/cron/cleanup-photos", schedule: "0 20 * * *" }],
};
