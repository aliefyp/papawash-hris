"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { pairDevice } from "./actions";

export function PairForm() {
  const [state, action, pending] = useActionState(pairDevice, undefined);

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-5">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Daftarkan HP ini</h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Minta owner membuat kode di dashboard (menu Cabang & HP toko), lalu masukkan di sini.
        </p>
      </div>
      <form action={action} className="flex flex-col gap-3">
        <Input
          name="code"
          required
          autoFocus
          autoComplete="off"
          autoCapitalize="characters"
          placeholder="ABCD-EFGH"
          className="h-16 rounded-2xl px-4 text-center font-mono text-3xl uppercase tracking-widest md:text-3xl"
        />
        {state?.error && <p className="rounded-xl bg-danger-soft px-4 py-3 text-base text-destructive">{state.error}</p>}
        <Button size="lg" disabled={pending} className="h-16 rounded-2xl text-xl">
          {pending ? "Mendaftarkan…" : "Daftarkan"}
        </Button>
      </form>
    </main>
  );
}
