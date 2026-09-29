---
target: owner dashboard screens
total_score: 19
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 3
target_identity: "file:/Users/aliefyp/Documents/Projects/Papawash/Papawash HRIS/src/app/(dashboard)"
timestamp: 2026-09-29T07-45-05Z
slug: src-app-dashboard
---
Method: dual-agent (A: design review, B: detector). Browser skipped (owner login required); A was source-only.

Score 19/40 (Acceptable, close to Poor). Detector: 0 findings.

Priority issues
- [P1] Finalisasi irreversible, no summary, one click (payroll/[id]). Fix: review step + confirmation; same for Nonaktifkan, Cabut akses. /impeccable clarify + harden
- [P1] Zero feedback after submit; DB errors swallowed; clock_out > clock_in unchecked. Fix: useActionState, pending state, "Tersimpan". /impeccable harden
- [P1] Primary content/actions hidden in bare <details> with no affordance (absensi, karyawan, payroll/[id]). Fix: inline "Isi jam pulang" on flagged rows, slip open by default, explicit "Ubah". /impeccable layout, distill
- [P2] Beranda empty, no setup order (Cabang -> Karyawan -> HP toko), nav item "Perangkat & Cabang" conflates two. /impeccable onboard, shape
- [P2] Labels/forms without context ("Jam pulang (WIB)", "Hitung ulang", "Item", Generate/Finalisasi/Pairing). /impeccable clarify

Personas: Jordan (no starting point, rows look static), Alex (no flagged-only filter, no month view, no bulk bonus), non-technical owner (jargon, silent saves, fear of finalizing).
