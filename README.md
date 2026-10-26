# IST Security

Platform operasional **divisi Security** — PT. Indonesia Smelting Technology (**IST**).

| | |
| --- | --- |
| GitHub | https://github.com/rend1507/ist-security |
| Cloudflare | **umrplku** |
| Worker | https://ist-security.umrplku.workers.dev |
| D1 | `ist-security` (`a4c49041-ace2-4b5b-8ae5-29726a6893a4`) |

## Stack

- Next.js 15 + OpenNext Cloudflare Worker
- D1 + sync offline → `/api/sync`
- PWA + Tailwind

## Halaman

| Route | Fungsi |
| --- | --- |
| `/login` | Masuk (password) |
| `/dashboard` | Ringkasan harian |
| `/dashboard` | Dashboard (status + belum kembali realtime) |
| `/keys` | Buku kunci · pinjam/kembali · scan QR · ubah jam · lihat QR |
| `/log-kunci` | Riwayat pinjam/kembali per tanggal (bisa sortir) |
| `/daftar-kunci` | Registrasi kunci + QR (bukan Petugas) |
| `/admin/master` | Data peminjam |
| Sidebar | Ganti PIN / Pengaturan (batas terlambat; Super Admin + akun) |

## Dev / deploy

```bash
npm run env:sync
npm run db:migrate:local   # atau :remote
npm run preview            # OpenNext + D1 lokal
npm run deploy             # Worker umrplku
```

## Demo

| ID | Peran | Password | PIN |
| --- | --- | --- | --- |
| `sec01` | Petugas | `ist2026` | `123456` |
| `kepala` | Kepala Security | `ist2026` | `123456` |
| `admin` | Admin Data | `ist2026` | `123456` |

Super Admin tetap di database (login manual); tidak ditampilkan di daftar akun uji.

Seed kunci: **SEC1–SEC46** (dari Excel).

## Keamanan

Lihat **[docs/security.md](docs/security.md)** — hardening defensif (sesi, sync auth, rate-limit login, header, no source map).

```bash
npx wrangler secret put SESSION_SECRET   # ≥24 karakter acak
npm run db:migrate:remote                # termasuk login_rate_limit
```

Anti-RE 100% pada bundle browser **tidak realistis**; secret & otorisasi hanya di server.

## Catatan

- Pakai akun Cloudflare yang sudah diverifikasi untuk proyek ini (**umrplku**).
- Jangan commit `.env` / `.dev.vars` / secret.
