"use client";

import { useActionState } from "react";
import { toast } from "sonner";
import { SubmitButton, useActionToast } from "@/components/action-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { createShareLink, revokeShareLink } from "../actions";

export function ShareSlip({
  payslipId,
  employeeName,
  monthLabel,
  activeUntil,
}: {
  payslipId: string;
  employeeName: string;
  monthLabel: string;
  activeUntil: string | null;
}) {
  const [share, createAction] = useActionState(createShareLink, undefined);
  const [revoke, revokeAction] = useActionState(revokeShareLink, undefined);
  useActionToast(revoke);

  const url = share?.url;
  const wa = url
    ? `https://wa.me/?text=${encodeURIComponent(`Halo ${employeeName}, ini slip gaji ${monthLabel} Anda: ${url}`)}`
    : "";

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">Bagikan</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Bagikan slip {employeeName}</DialogTitle>
          <DialogDescription>
            {url
              ? "Link siap dikirim. Link ini hanya tampil sekarang, jadi salin atau kirim sebelum menutup."
              : "Buat link pribadi supaya karyawan bisa melihat dan mengunduh slipnya di HP, tanpa login. Berlaku 30 hari."}
          </DialogDescription>
        </DialogHeader>

        {url ? (
          <div className="flex flex-col gap-3">
            <Input readOnly value={url} onFocus={(e) => e.currentTarget.select()} aria-label="Link slip" />
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={async () => {
                  await navigator.clipboard.writeText(url);
                  toast.success("Link disalin.");
                }}
              >
                Salin link
              </Button>
              <Button asChild>
                <a href={wa} target="_blank" rel="noreferrer">
                  Kirim lewat WhatsApp
                </a>
              </Button>
            </div>
          </div>
        ) : (
          <form action={createAction} className="flex flex-col gap-4">
            <input type="hidden" name="payslip_id" value={payslipId} />
            {activeUntil && (
              <p className="rounded-lg bg-warn-soft p-3 text-sm text-warn">
                Sudah ada link aktif sampai {activeUntil}. Membuat link baru akan mematikan link yang lama.
              </p>
            )}
            <p className="text-sm text-muted-foreground">
              Siapa pun yang memegang link bisa melihat slip ini. Kirim hanya ke {employeeName}.
            </p>
            {share?.error && <p className="text-sm text-destructive">{share.error}</p>}
            <DialogFooter>
              <SubmitButton pendingLabel="Membuat link…">{activeUntil ? "Buat link baru" : "Buat link"}</SubmitButton>
            </DialogFooter>
          </form>
        )}

        {activeUntil && !url && (
          <form action={revokeAction} className="border-t pt-4">
            <input type="hidden" name="payslip_id" value={payslipId} />
            <SubmitButton variant="ghost" pendingLabel="Mencabut…" className="text-destructive hover:bg-destructive/10 hover:text-destructive">
              Cabut link yang aktif
            </SubmitButton>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
