# Blueprint modul Key Log — IST Security

Salinan kerja. Sumber diskusi: `Diskusi/ist-security/blueprint.md`.  
Excel lapangan: `Diskusi/ist-security/sumber/DASHBOARD-SECURITY.xlsx`.

## Dashboard (Excel SUMMARY)

- Total kunci · sudah kembali + % · belum kembali + %
- Top 3 user (total key/day) · Top 3 longest · Take out not back

## Logbook

`NO` · `KODE` · `JENIS` · `BARCODE` · `PEMINJAM` · `TAKE OUT` · `GIVE BACK` · `DURASI`

## Admin vs Security

- Admin: master kunci + master peminjam
- Security: pilih kunci/peminjam + take/give; durasi otomatis; PIN tiap transaksi

## Data

D1: `users` · `borrowers` · `keys` · `borrow_logs` · `app_settings` · `sync_queue`  
Seed Excel: SEC1–SEC46.
