import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/session";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

// Owner dashboard only. /absen (store phone, device token) and /slip (employee link, share token)
// authenticate themselves; the (?:/|$) keeps /absensi (dashboard) inside the guard.
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|absen(?:/|$)|slip/|api/device|api/cron|api/telegram|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
