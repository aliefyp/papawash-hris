# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Karyawan laundry** (saat ini 2 orang, bertambah dengan cabang): absen masuk dan pulang di HP toko yang dipegang sendiri untuk selfie. Situasi: di toko, sering buru-buru, tangan bisa basah atau berbau deterjen. Tugasnya hanya satu: absen dengan cepat tanpa salah orang. Bahasa Indonesia.
- **Owner** (satu orang, memakai laptop atau HP): memeriksa absensi, mengoreksi hari yang lupa absen pulang, membuat payroll bulanan, menambah bonus, reimburse, dan potongan manual, lalu membagikan slip gaji.

## Product Purpose

Menggantikan absensi manual dan slip gaji di Google Sheets untuk usaha laundry di Solo. Absensi lewat selfie di HP toko, dan payroll dihitung otomatis dari absensi (gaji bulanan tetap, lembur per jam di atas 9 jam kerja), dengan item manual dari owner. Sukses berarti owner tidak lagi menghitung lembur atau menyusun slip secara manual, dan karyawan bisa absen dalam hitungan detik.

## Positioning

Alat kecil untuk satu pemilik usaha, bukan HRIS korporat. Tanpa PIN, tanpa jadwal shift, dan tanpa aplikasi yang harus dipasang karyawan. Cukup satu HP toko yang didaftarkan owner.

## Operating Context

- HP toko adalah perangkat bersama, terpasang sebagai PWA. Karyawan memilih nama lalu selfie dengan kamera depan.
- Waktu absensi dicatat server. Tidak ada mode offline di versi 1.
- Owner memakai dashboard untuk absensi, karyawan, payroll, pinjaman, dan perangkat/cabang.
- Slip gaji sekarang berupa Google Sheets dengan pos: Gaji Pokok, Bonus Lembur, Bonus Penjualan, Bonus Satuan, Bonus Performa, Kesehatan, Lain-lain, Pinjaman. Format slip baru meniru pos ini.
- Zona waktu WIB, mata uang rupiah (Rp1.750.000).

## Capabilities and Constraints

- Stack: Next.js 16 (App Router), Tailwind 4, Supabase (Postgres, Storage, Auth), Vercel. Lihat `docs/design.md`.
- Tanpa PIN di versi 1, dengan konsekuensi orang bisa mengetuk nama rekan. Selfie disimpan sebagai bukti.
- Foto privat dan dihapus setelah 90 hari. Karyawan perlu tahu fotonya direkam.
- Multi-cabang sejak awal (`outlet_id`).
- Belum ada logo atau identitas merek. Arah visual bebas dirancang (keputusan pengguna, 2026-09-29).

## Brand Commitments

Nama produk: Papawash. Tidak ada logo, warna, atau suara merek yang sudah ditetapkan.

Preferensi visual yang dipilih pengguna (2026-09-29): **standar kategori, dieksekusi rapi**, yaitu dashboard admin bersih tanpa metafora dekoratif. Patokan kualitas: Linear / Notion untuk dashboard owner, dan GoPay / Gojek / Tokopedia Seller untuk layar absensi HP toko (tombol besar, warna aksi tegas, akrab bagi pengguna Indonesia).

## Evidence on Hand

Satu contoh slip gaji (tangkapan Google Sheets, September 2026). Tidak ada aset merek, testimoni, atau data lain, dan jangan mengarang.

## Product Principles

1. **Cepat di lantai, teliti di meja.** Layar absensi harus selesai dalam beberapa ketukan. Dashboard owner boleh lebih padat, tapi angka uang harus jelas dan bisa diperiksa.
2. **Foto adalah bukti, bukan hukuman.** Sistem menampilkan fakta (jam, foto), dan owner yang memutuskan koreksi.
3. **Sistem tidak menebak.** Hari yang ambigu (lupa absen pulang) ditandai untuk dikoreksi owner, dan payroll tidak mengisinya sendiri.
4. **Angka gaji harus bisa ditelusuri.** Setiap nominal di slip punya asal yang jelas (otomatis dari absensi atau manual dari owner).
5. **Sesederhana yang dibutuhkan satu pemilik usaha.** Tolak fitur korporat sebelum benar-benar dibutuhkan.

## Accessibility & Inclusion

Layar absensi dipakai satu tangan dan mungkin dengan jari basah: target sentuh besar, teks terbaca di cahaya toko yang terang, dan kesalahan (kamera ditolak, jaringan putus) dijelaskan dengan kalimat sederhana dalam bahasa Indonesia.
