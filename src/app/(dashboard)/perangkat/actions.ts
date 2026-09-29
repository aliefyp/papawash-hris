"use server";

import { createHash, randomInt } from "node:crypto";
import { revalidatePath } from "next/cache";
import type { ActionState } from "@/lib/action-state";
import { createClient } from "@/lib/supabase/server";

const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no 0/O/1/I/L
const PAIRING_MINUTES = 15;

export async function addOutlet(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Isi nama cabang." };
  const supabase = await createClient();
  const { error } = await supabase.from("outlets").insert({ name });
  if (error) return { error: "Gagal menambah cabang. Coba lagi." };
  revalidatePath("/", "layout");
  return { ok: `${name} ditambahkan.` };
}

export type Pairing = { code?: string; error?: string };

export async function createPairing(_prev: Pairing, formData: FormData): Promise<Pairing> {
  const raw = Array.from({ length: 8 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
  const supabase = await createClient();
  const { error } = await supabase.from("devices").insert({
    outlet_id: String(formData.get("outlet_id")),
    label: String(formData.get("label") ?? "").trim() || null,
    pairing_code_hash: createHash("sha256").update(raw).digest("hex"),
    pairing_expires_at: new Date(Date.now() + PAIRING_MINUTES * 60_000).toISOString(),
  });
  if (error) return { error: "Gagal membuat kode. Coba lagi." };
  revalidatePath("/perangkat");
  return { code: `${raw.slice(0, 4)}-${raw.slice(4)}` };
}

export async function revokeDevice(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("devices")
    .update({ status: "revoked", revoked_at: new Date().toISOString(), token_hash: null })
    .eq("id", String(formData.get("id")));
  if (error) return { error: "Gagal mencabut akses. Coba lagi." };
  revalidatePath("/", "layout");
  return { ok: "Akses dicabut." };
}
