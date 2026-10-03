import { safeEqual } from "@/lib/telegram/auth";
import { runDueJobs } from "@/lib/telegram/jobs";

// Called every minute by Supabase pg_cron (see docs/telegram-setup.md) with `Authorization: Bearer $TICK_SECRET`.
// ?dry=1 shows what would be sent without sending; ?now=<ISO> (dry only) pretends it is another moment.
async function handle(req: Request) {
  const secret = process.env.TICK_SECRET;
  if (!secret || !safeEqual(req.headers.get("authorization"), `Bearer ${secret}`)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const url = new URL(req.url);
  const dry = url.searchParams.get("dry") === "1";
  const fake = dry ? url.searchParams.get("now") : null;
  const now = fake && !Number.isNaN(new Date(fake).getTime()) ? new Date(fake) : new Date();

  try {
    return Response.json({ now: now.toISOString(), dry, jobs: await runDueJobs(now, dry) });
  } catch (e) {
    console.error("telegram tick failed", e);
    return new Response("Tick failed", { status: 500 });
  }
}

export const GET = handle;
export const POST = handle;
export const dynamic = "force-dynamic";
