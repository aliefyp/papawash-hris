"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { fmtDate, fmtTime } from "@/lib/format";
import { submitAttendance } from "./actions";

export type Employee = { id: string; name: string; since: string | null };
type Kind = "masuk" | "pulang";
type Step =
  | { name: "list" }
  | { name: "camera"; emp: Employee }
  | { name: "preview"; emp: Employee; blob: Blob; url: string }
  | { name: "done"; emp: Employee; kind: Kind; at: string };


export function AbsenClient({ outlet, initial }: { outlet: string; initial: Employee[] }) {
  const [employees, setEmployees] = useState(initial);
  const [step, setStep] = useState<Step>({ name: "list" });
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 10_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (step.name !== "done") return;
    const t = setTimeout(() => setStep({ name: "list" }), 5000);
    return () => clearTimeout(t);
  }, [step]);

  const done = (emp: Employee, kind: Kind, at: string) => {
    setEmployees((list) =>
      list.map((e) => (e.id === emp.id ? { ...e, since: kind === "masuk" ? at : null } : e)),
    );
    setStep({ name: "done", emp, kind, at });
  };

  if (step.name === "camera") {
    return (
      <Camera
        emp={step.emp}
        onCancel={() => setStep({ name: "list" })}
        onShot={(blob) => setStep({ name: "preview", emp: step.emp, blob, url: URL.createObjectURL(blob) })}
      />
    );
  }
  if (step.name === "preview") {
    return (
      <Preview
        step={step}
        onRetake={() => setStep({ name: "camera", emp: step.emp })}
        onDone={done}
      />
    );
  }
  if (step.name === "done") {
    const masuk = step.kind === "masuk";
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-ok-soft px-6 text-center">
        <span className="grid size-28 place-items-center rounded-full bg-ok text-white">
          <CheckIcon className="size-14" />
        </span>
        <div>
          <p className="text-3xl font-semibold">{masuk ? `Selamat bekerja, ${step.emp.name}` : `Sampai jumpa, ${step.emp.name}`}</p>
          <p className="mt-2 text-xl text-muted-foreground">
            Absen {step.kind} pukul <b className="text-foreground">{fmtTime(step.at)}</b>
          </p>
        </div>
        <Button size="lg" onClick={() => setStep({ name: "list" })} className="h-14 rounded-2xl px-10 text-lg">
          Selesai
        </Button>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-5 pb-6 pt-8">
      <header>
        <p className="text-base font-medium text-muted-foreground">{outlet}</p>
        <p suppressHydrationWarning className="mt-1 text-6xl font-semibold tracking-tight">
          {fmtTime(now)}
        </p>
        <p suppressHydrationWarning className="mt-1 text-base text-muted-foreground">
          {fmtDate(now)}
        </p>
      </header>

      <h1 className="mb-3 mt-10 text-xl font-semibold">Siapa yang absen?</h1>
      {employees.length === 0 && (
        <p className="text-lg text-muted-foreground">Belum ada karyawan di cabang ini. Minta owner menambahkannya.</p>
      )}
      <ul className="flex flex-col gap-3">
        {employees.map((e) => {
          const inside = e.since !== null;
          return (
            <li key={e.id}>
              <button
                onClick={() => setStep({ name: "camera", emp: e })}
                className="flex min-h-24 w-full items-center gap-4 rounded-2xl border border-border bg-card p-4 text-left transition active:scale-[0.99] active:bg-accent"
              >
                <span className="grid size-14 shrink-0 place-items-center rounded-full bg-accent text-2xl font-semibold text-accent-foreground">
                  {e.name[0]}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xl font-semibold">{e.name}</span>
                  <span className={`block text-base ${inside ? "text-ok" : "text-muted-foreground"}`}>
                    {inside ? `Di toko sejak ${fmtTime(e.since!)}` : "Belum masuk"}
                  </span>
                </span>
                <span
                  className={`rounded-full px-5 py-3 text-base font-semibold ${
                    inside ? "bg-foreground text-white" : "bg-primary text-white"
                  }`}
                >
                  {inside ? "Pulang" : "Masuk"}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <p className="mt-auto pt-10 text-center text-sm text-muted-foreground">
        Foto selfie direkam sebagai bukti absensi.
      </p>
    </main>
  );
}

function Camera({ emp, onCancel, onShot }: { emp: Employee; onCancel: () => void; onShot: (b: Blob) => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let stream: MediaStream | undefined;
    navigator.mediaDevices
      ?.getUserMedia({ video: { facingMode: "user", width: { ideal: 1280 } }, audio: false })
      .then((s) => {
        stream = s;
        if (video.current) video.current.srcObject = s;
      })
      .catch(() => setError("Kamera tidak bisa dibuka. Izinkan akses kamera di pengaturan browser, lalu coba lagi."));
    return () => stream?.getTracks().forEach((t) => t.stop());
  }, [attempt]);

  const shoot = () => {
    const v = video.current;
    if (!v || !v.videoWidth) return;
    const scale = Math.min(1, 720 / v.videoWidth);
    const c = document.createElement("canvas");
    c.width = v.videoWidth * scale;
    c.height = v.videoHeight * scale;
    c.getContext("2d")!.drawImage(v, 0, 0, c.width, c.height);
    c.toBlob((b) => b && onShot(b), "image/jpeg", 0.75);
  };

  return (
    <main className="fixed inset-0 flex flex-col bg-black text-white">
      <div className="flex items-center justify-between px-5 pb-3 pt-5">
        <Button variant="ghost" onClick={onCancel} className="h-12 px-3 text-lg text-white hover:bg-white/10 hover:text-white">
          Batal
        </Button>
        <p className="text-lg font-semibold">{emp.name}</p>
        <span className="min-w-12" />
      </div>

      <div className="relative min-h-0 flex-1">
        {error ? (
          <div className="grid h-full place-items-center px-8 text-center">
            <div>
              <p className="text-lg">{error}</p>
              <Button
                variant="secondary"
                size="lg"
                onClick={() => {
                  setError(null);
                  setAttempt((n) => n + 1);
                }}
                className="mt-6 h-14 rounded-2xl px-8 text-lg"
              >
                Coba lagi
              </Button>
            </div>
          </div>
        ) : (
          <>
            <video
              ref={video}
              autoPlay
              playsInline
              muted
              className="size-full -scale-x-100 object-cover"
            />
            <p className="absolute inset-x-0 top-3 text-center text-base text-white/85">
              Pastikan wajah terlihat jelas
            </p>
          </>
        )}
      </div>

      <div className="grid place-items-center pb-10 pt-6">
        <button
          onClick={shoot}
          disabled={!!error}
          aria-label="Ambil foto"
          className="grid size-24 place-items-center rounded-full border-4 border-white disabled:opacity-30"
        >
          <span className="size-[4.75rem] rounded-full bg-white active:scale-90" />
        </button>
      </div>
    </main>
  );
}

function Preview({
  step,
  onRetake,
  onDone,
}: {
  step: Extract<Step, { name: "preview" }>;
  onRetake: () => void;
  onDone: (emp: Employee, kind: Kind, at: string) => void;
}) {
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const kind: Kind = step.emp.since ? "pulang" : "masuk";

  useEffect(() => () => URL.revokeObjectURL(step.url), [step.url]);

  const send = async () => {
    setSending(true);
    setError(null);
    const fd = new FormData();
    fd.set("photo", step.blob, "selfie.jpg");
    try {
      const r = await submitAttendance(step.emp.id, fd);
      if (r.ok) onDone(step.emp, r.kind, r.at);
      else setError(r.error);
    } catch {
      setError("Tidak ada koneksi. Periksa internet toko, lalu coba lagi.");
    }
    setSending(false);
  };

  return (
    <main className="fixed inset-0 flex flex-col bg-black text-white">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={step.url} alt={`Foto ${step.emp.name}`} className="min-h-0 flex-1 -scale-x-100 object-cover" />
      <div className="flex flex-col gap-3 bg-background px-5 pb-8 pt-5 text-foreground">
        {error && <p className="rounded-xl bg-danger-soft px-4 py-3 text-base text-destructive">{error}</p>}
        <Button size="lg" onClick={send} disabled={sending} className="h-16 rounded-2xl text-xl">
          {sending ? "Mengirim…" : `Kirim absen ${kind}`}
        </Button>
        <Button variant="outline" size="lg" onClick={onRetake} disabled={sending} className="h-14 rounded-2xl text-lg">
          Foto ulang
        </Button>
      </div>
    </main>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}
