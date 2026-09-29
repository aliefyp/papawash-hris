# Papawash HRIS

Absensi selfie (PWA di HP toko) + payroll. Desain lengkap: [docs/design.md](docs/design.md).

## Setup (tahap 1)

1. Buat project di [supabase.com](https://supabase.com). Di **Authentication → Providers → Email**, matikan **Allow new users to sign up**.
2. Jalankan isi `supabase/migrations/20260929000000_init.sql` di **SQL Editor** (atau `pnpm exec supabase link` lalu `pnpm exec supabase db push`).
3. Di **Authentication → Users**, buat user owner (email + password).
4. Jadikan user itu owner, di SQL Editor:
   ```sql
   insert into admins (user_id) select id from auth.users where email = 'EMAIL_OWNER';
   ```
5. `cp .env.example .env.local`, isi URL dan key dari **Project Settings → API**.
6. `pnpm dev`, buka http://localhost:3000 dan login.

## Perintah

- `pnpm dev` / `pnpm build` / `pnpm lint`
- `pnpm test` (Vitest, mulai dipakai untuk rumus payroll di tahap 4)

## Deploy ke Vercel

1. Hubungkan project: `pnpm dlx vercel@latest link` (buat project baru, mis. `papawash-hris`).
2. Isi environment variables (Project → Settings → Environment Variables, atau `vercel env add`), untuk Production:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (tandai **Sensitive**, jangan diawali `NEXT_PUBLIC_`)
   - `CRON_SECRET` (string acak panjang; Vercel Cron mengirimnya ke endpoint pembersihan foto)
3. Deploy: `vercel --prod`.
4. Jalankan migration di Supabase bila belum (`supabase/migrations/`).

Foto absensi dihapus otomatis setelah 90 hari oleh cron harian (`vercel.ts` → `/api/cron/cleanup-photos`, pukul 03:00 WIB). Data absensinya tetap ada.

## Memasang di HP toko (PWA)

1. Buka `https://<alamat-aplikasi>/absen` di Chrome (Android) atau Safari (iPhone).
2. Daftarkan HP dengan kode dari dashboard (menu Cabang & HP toko).
3. Android: menu ⋮ → **Instal aplikasi** / **Tambahkan ke layar utama**. iPhone: tombol Bagikan → **Tambah ke Layar Utama**.
4. Buka dari ikon di layar utama, lalu izinkan kamera saat diminta.

Perlu HTTPS (Vercel otomatis). Token HP tersimpan di browser, jadi hapus data situs atau ganti HP berarti perlu didaftarkan ulang.
