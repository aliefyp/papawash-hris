import "server-only";
import { createHash } from "node:crypto";
import { cookies } from "next/headers";
import { adminClient } from "@/lib/supabase/admin";

export const DEVICE_COOKIE = "papawash_device";
export const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

// The store phone proves itself with a random token in an httpOnly cookie; only its hash is stored.
export async function currentDevice() {
  const token = (await cookies()).get(DEVICE_COOKIE)?.value;
  if (!token) return null;
  const { data } = await adminClient()
    .from("devices")
    .select("id, outlet_id, outlets(name)")
    .eq("token_hash", sha256(token))
    .eq("status", "active")
    .maybeSingle();
  if (!data) return null;
  return { id: data.id, outletId: data.outlet_id, outletName: (data.outlets as unknown as { name: string }).name };
}
