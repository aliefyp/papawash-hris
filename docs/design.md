# Papawash HRIS — Desain

Aplikasi absensi selfie + payroll untuk usaha dengan 2 karyawan (rencana multi-cabang).

## Keputusan utama

- **Stack:** Next.js (App Router) + Supabase (Postgres, Storage, Auth) di-deploy ke Vercel.
- **Absensi:** PWA di HP toko. Pilih nama → selfie → selesai. **Tanpa PIN di versi 1** (ditunda; kolom & alur bisa ditambah nanti).
- **Gaji:** bulanan tetap. Tidak ada potongan otomatis untuk absen/telat (owner menambah potongan manual bila perlu).
- **Lembur:** otomatis. Lembur per hari = max(0, jam pulang − jam masuk − 9 jam) × tarif per jam (tarif tetap per karyawan). Tanpa jadwal shift di sistem.
- **Lupa absen pulang:** hari ditandai `perlu_koreksi`, sesi otomatis tertutup setelah 14 jam, owner mengisi jam pulang manual. Payroll tidak menebak.
- **Multi-cabang:** semua tabel punya `outlet_id` sejak awal.

## Bagian 1 — Alur absensi (HP toko)

1. Owner mendaftarkan HP toko lewat kode pairing sekali pakai (berlaku 15 menit). HP menyimpan token perangkat.
2. Layar utama menampilkan daftar karyawan aktif di cabang itu.
3. Karyawan mengetuk nama → kamera depan → selfie (dikompres di HP) → dikirim ke server.
4. Server mencatat waktu sendiri (waktu HP diabaikan). Jenis absen otomatis: tidak ada sesi terbuka = masuk, ada = pulang.
5. Layar konfirmasi (nama + jam), lalu kembali ke daftar.

Aturan:
- Satu sesi terbuka per karyawan; sesi >14 jam → `perlu_koreksi`.
- Foto privat, dihapus otomatis setelah 90 hari (dapat diubah).
- Tanpa antrean offline di versi 1: bila gagal, tampilkan pesan dan coba lagi.
- Ganti HP: owner membuat kode pairing baru, lalu "Cabut akses" pada HP lama. Satu cabang boleh punya >1 perangkat aktif. Riwayat mencatat perangkat yang dipakai.

## Bagian 2 — Model data & payroll

| Tabel | Isi |
|---|---|
| `outlets` | Cabang |
| `employees` | Nama, cabang, gaji pokok, tarif lembur/jam, status aktif |
| `devices` | HP toko: cabang, token, status (aktif/dicabut) |
| `attendance_sessions` | Karyawan, jam masuk/pulang, foto masuk/pulang, perangkat, status (`ok`, `perlu_koreksi`, `dikoreksi`), jejak koreksi |
| `payroll_periods` | Bulan, cabang, status (`draft`/`final`) |
| `payslips` | Slip per karyawan per periode: total penerimaan, potongan, diterima |
| `payslip_items` | Nama, tipe (penerimaan/potongan), nominal, asal (`otomatis`/`manual`) |
| `loans` | Pinjaman: karyawan, total, cicilan/bulan, sisa |

Generate payroll:
1. Pilih bulan + cabang → Generate.
2. Item otomatis: Gaji Pokok, Bonus Lembur, Cicilan Pinjaman (bila ada).
3. Owner menambah/ubah/hapus item manual (Bonus Penjualan, Bonus Performa, Kesehatan, reimburse, Lain-lain, dll.) pada slip draft.
4. Bila ada hari `perlu_koreksi` di bulan itu → peringatan, koreksi dulu.
5. Finalisasi mengunci slip (snapshot nilai) dan mengurangi sisa pinjaman.
6. Slip final: unduh PDF / bagikan link (token acak, kedaluwarsa, bisa dicabut).

Asumsi: lembur dihitung jam desimal, <15 menit diabaikan; zona waktu WIB; sesi lewat tengah malam masuk ke hari saat karyawan masuk; periode = bulan kalender; draft boleh di-generate ulang tanpa menghapus item manual.

## Bagian 3 — Dashboard owner

Login email + password (Supabase Auth), hanya owner di versi 1.

1. **Beranda:** ringkasan hari ini per cabang, peringatan (perlu koreksi, payroll draft).
2. **Absensi:** tabel harian/bulanan, foto masuk & pulang berdampingan, koreksi & absensi manual (tercatat siapa/kapan).
3. **Karyawan:** tambah/ubah, gaji pokok, tarif lembur, nonaktifkan.
4. **Payroll:** generate, item manual, finalisasi, PDF/link.
5. **Pinjaman:** catat pinjaman, sisa, riwayat potongan.
6. **Perangkat & Cabang:** pairing, cabut akses, tambah cabang.

Tidak masuk versi 1: akun manajer/karyawan, absensi offline, potongan telat/absen otomatis, cuti, PPh 21/BPJS otomatis, PIN karyawan.

## Bagian 4 — Keamanan, pengujian, tahapan

Keamanan: bucket foto privat + link sementara, RLS di database, token perangkat hanya untuk endpoint absensi, waktu dari server, link slip acak & dapat dicabut, retensi foto 90 hari. Karyawan diberi tahu bahwa foto direkam untuk absensi.

Pengujian: unit test rumus payroll (lembur pas 9 jam, <15 menit, lewat tengah malam, perlu koreksi, cicilan, snapshot finalisasi); tes alur absensi; uji manual di HP toko (Android/iOS, PWA); cocokkan hasil dengan slip spreadsheet yang ada.

Tahapan:
1. Fondasi: Next.js, Supabase, skema DB, login owner.
2. Absensi: pairing perangkat, layar HP toko, penyimpanan foto.
3. Dashboard absensi: tabel, foto, koreksi, manajemen karyawan.
4. Payroll: generate, item manual, finalisasi, pinjaman.
5. Slip gaji: PDF + link bagikan.
6. Finishing: job hapus foto, PWA, deploy Vercel, uji di HP toko.
