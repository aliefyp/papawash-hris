import { cleanupOldPhotos } from "@/lib/photo-retention";
import { adminClient } from "@/lib/supabase/admin";

// Called daily by Vercel Cron (see vercel.ts), which sends `Authorization: Bearer $CRON_SECRET`.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const removed = await cleanupOldPhotos(adminClient());
    return Response.json({ removed });
  } catch (e) {
    console.error("cleanup-photos failed", e);
    return new Response("Cleanup failed", { status: 500 });
  }
}
