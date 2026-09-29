import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export const PHOTO_RETENTION_DAYS = 90;
const BUCKET = "attendance-photos";
const BATCH = 200;

// Sessions that started before this instant no longer keep their selfies.
export const retentionCutoff = (now: Date, days = PHOTO_RETENTION_DAYS) =>
  new Date(now.getTime() - days * 86_400_000).toISOString();

// Deletes selfies past retention from storage, then clears their paths. The attendance rows stay.
// A path is only cleared after its file was removed, so a failed run is retried by the next one.
export async function cleanupOldPhotos(db: SupabaseClient, now = new Date()) {
  const cutoff = retentionCutoff(now);
  let removed = 0;

  for (;;) {
    const { data: rows, error } = await db
      .from("attendance_sessions")
      .select("id, clock_in_photo, clock_out_photo")
      .lt("clock_in_at", cutoff)
      .or("clock_in_photo.not.is.null,clock_out_photo.not.is.null")
      .limit(BATCH);
    if (error) throw error;
    if (!rows?.length) return removed;

    const paths = rows.flatMap((r) => [r.clock_in_photo, r.clock_out_photo]).filter((p): p is string => !!p);
    const { error: rmError } = await db.storage.from(BUCKET).remove(paths);
    if (rmError) throw rmError;

    const { error: upError } = await db
      .from("attendance_sessions")
      .update({ clock_in_photo: null, clock_out_photo: null })
      .in("id", rows.map((r) => r.id));
    if (upError) throw upError;

    removed += paths.length;
  }
}
