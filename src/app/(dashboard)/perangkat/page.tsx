import { Smartphone, Store } from "lucide-react";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { ConfirmAction } from "@/components/confirm-action";
import { EmptyState } from "@/components/empty-state";
import { StatusBadge } from "@/components/status-badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createClient } from "@/lib/supabase/server";
import { addOutlet, revokeDevice } from "./actions";
import { PairForm } from "./pair-form";

const STATUS = {
  pending: { label: "Menunggu kode dimasukkan", tone: "warn" },
  active: { label: "Aktif", tone: "ok" },
  revoked: { label: "Dicabut", tone: "neutral" },
} as const;

export default async function PerangkatPage() {
  const supabase = await createClient();
  const [{ data: outlets }, { data: devices }] = await Promise.all([
    supabase.from("outlets").select("id, name").order("name"),
    supabase
      .from("devices")
      .select("id, label, status, created_at, outlets(name)")
      .order("created_at", { ascending: false }),
  ]);

  return (
    <div className="flex flex-col gap-10">
      <h1 className="text-2xl font-semibold tracking-tight">Cabang & HP toko</h1>

      <section>
        <h2 className="text-lg font-semibold">1. Cabang</h2>
        <p className="mb-3 mt-1 text-sm text-muted-foreground">
          Tiap toko atau cabang dicatat sekali. Karyawan dan HP toko dikelompokkan per cabang.
        </p>
        {!outlets?.length && (
          <div className="mb-4">
            <EmptyState icon={Store} title="Belum ada cabang" description="Tambahkan cabang pertama Anda lewat kolom di bawah." />
          </div>
        )}
        {outlets?.length ? (
          <Card className="mb-4 gap-0 overflow-hidden py-0">
            <ul className="divide-y divide-border">
              {outlets.map((o) => (
                <li key={o.id} className="px-4 py-3 font-medium">
                  {o.name}
                </li>
              ))}
            </ul>
          </Card>
        ) : null}
        <ActionForm action={addOutlet} className="flex flex-wrap items-center gap-3">
          <Input name="name" required aria-label="Nama cabang" placeholder="Nama cabang, mis. Papawash Solo" className="w-72 max-w-full" />
          <SubmitButton variant="outline">Tambah cabang</SubmitButton>
        </ActionForm>
      </section>

      <section>
        <h2 className="text-lg font-semibold">2. HP toko</h2>
        <p className="mb-3 mt-1 max-w-prose text-sm text-muted-foreground">
          HP yang dipakai karyawan untuk absen selfie. Buat kode di sini, lalu ketik kode itu di HP toko. Kalau HP hilang atau
          diganti, cabut aksesnya dan daftarkan HP baru.
        </p>
        {outlets?.length ? (
          <PairForm outlets={outlets} />
        ) : (
          <EmptyState
            icon={Smartphone}
            title="Tambahkan cabang dulu"
            description="HP toko didaftarkan per cabang. Buat cabang di bagian 1, lalu kembali ke sini."
          />
        )}

        {devices?.length ? (
          <Card className="mt-5 py-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="px-4">HP</TableHead>
                  <TableHead>Cabang</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {devices.map((d) => {
                  const s = STATUS[d.status as keyof typeof STATUS];
                  const name = d.label ?? "HP toko";
                  return (
                    <TableRow key={d.id}>
                      <TableCell className="px-4 font-medium">{name}</TableCell>
                      <TableCell>{(d.outlets as unknown as { name: string } | null)?.name}</TableCell>
                      <TableCell>
                        <StatusBadge tone={s.tone}>{s.label}</StatusBadge>
                      </TableCell>
                      <TableCell className="pr-4 text-right">
                        {d.status !== "revoked" && (
                          <ConfirmAction
                            action={revokeDevice}
                            fields={{ id: d.id }}
                            trigger="Cabut akses"
                            triggerVariant="ghost"
                            title={`Cabut akses ${name}?`}
                            confirmLabel="Cabut akses"
                            danger
                          >
                            <p>HP ini tidak bisa absen lagi dan akan kembali ke layar pendaftaran.</p>
                            <p>Data absensi yang sudah tercatat tetap aman. Untuk memakainya lagi, buat kode baru.</p>
                          </ConfirmAction>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        ) : !!outlets?.length ? (
          <div className="mt-5">
            <EmptyState
              icon={Smartphone}
              title="Belum ada HP toko"
              description="Buat kode di atas, lalu ketik kode itu di HP yang akan dipakai karyawan untuk absen selfie."
            />
          </div>
        ) : null}
      </section>
    </div>
  );
}
