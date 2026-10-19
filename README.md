# IST Security

Platform operasional **divisi Security** — PT. Indonesia Smelting Technology (**IST**).

| | |
| --- | --- |
| GitHub | https://github.com/rend1507/ist-security |
| Klien folder | `ikn` (rumah kode saja) |
| Cloudflare | **umrplku** |
| Worker | https://ist-security.umrplku.workers.dev |
| D1 | `ist-security` (`a4c49041-ace2-4b5b-8ae5-29726a6893a4`) |
| Diskusi | `Diskusi/ist-security/` |
| Skill | `.cursor/skills/ist-security/` |

Bukan Unigama/SISKA, bukan CloQout. Chat Diskusi IST = khusus proyek ini.

## Stack

- Next.js 15 + OpenNext Cloudflare Worker
- D1 + sync offline → `/api/sync`
- PWA + Tailwind

## Halaman

| Route | Fungsi |
| --- | --- |
| `/login` | Masuk (password) |
| `/dashboard` | Ringkasan harian |
| `/keys` | Buku kunci · pinjam/kembali · scan · ubah jam |
| `/admin/master` | Data Master kunci + peminjam (form popup) |
| Sidebar | Ganti PIN / Pengaturan Super Admin (popup) |

## Dev / deploy

```bash
npm run env:sync
npm run db:migrate:local   # atau :remote
npm run preview            # OpenNext + D1 lokal
npm run deploy             # umrplku saja
```

## Demo

| ID | Peran | Password | PIN |
| --- | --- | --- | --- |
| `sec01` | Petugas | `ist2026` | `123456` |
| `kepala` | Kepala Security | `ist2026` | `123456` |
| `superadmin` | Super Admin | `ist2026` | `123456` |
| `admin` | Admin Data | `ist2026` | `123456` |

Seed kunci: **SEC1–SEC46** (dari Excel).

## Jangan

- Akun **DiTi**
- Deploy / edit proyek lain dari konteks IST tanpa izin
- Commit `.env` / `.dev.vars` / secret
