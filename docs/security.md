# Keamanan IST Security (defensif)

Status: **diterapkan di kode** · 2026-10-26  
Acuan riset: `Diskusi/riset/website/keamanan-anti-re-ai-2026-10-26.md`

## Realita anti–reverse engineering & crawl

| Target | Bisa “anti 100%”? | Yang dilakukan IST |
| --- | --- | --- |
| Bundle JS/CSS di browser | **Tidak** | Minify + **tanpa** source map browser |
| Logic login / PIN / sync | Dilindungi jika di **server** | Verifikasi di API Worker + D1 |
| Hash password/PIN | Jangan dikirim ke client | bcrypt hanya di server |
| Crawl / indeks / AI scraper web | **Tidak absolut** | `robots.txt` + `X-Robots-Tag` + blok UA crawler AI |
| “Hanya Cursor yang bisa baca” | **Tidak** | Cursor = kode **lokal**; web crawl ≠ akses repo |

**Kesimpulan:** Data di balik login sudah relatif aman dari crawler. Halaman publik (`/login`) + JS publik tetap bisa di-fetch oleh siapa pun yang **mengabaikan** robots / memakai UA browser palsu. Obfuscation tidak mengganti auth.

### Crawl disable ≠ “hanya Cursor”

| Jalur | Efek blok crawl |
| --- | --- |
| Cursor di laptop Anda | **Tidak terpengaruh** — baca file workspace lokal |
| GPTBot / ClaudeBot / Google-Extended / dll. | Ditolak (403) + `Disallow: /` |
| Manusia / AI dengan browser biasa | Masih bisa buka `/login` (tanpa data transaksi) |
| Paste URL ke ChatGPT browsing | Bisa gagal jika bot; bisa berhasil jika fetch seperti browser |

## Kontrol di kode (sudah)

1. **Cookie sesi HttpOnly** (`ist_session`) + HMAC — bukan `localStorage` untuk token auth.  
2. **`SESSION_SECRET` wajib kuat di production** — fallback dev ditolak di `NODE_ENV=production`.  
3. **`POST /api/sync` wajib login** (+ peran transaksi) — tidak menerima sync anonim.  
4. **Rate limit login** (D1 `login_rate_limit`) — kunci sementara setelah gagal berulang.  
5. **Header HTTP:** frame deny, nosniff, referrer, Permissions-Policy, **X-Robots-Tag noindex/noai**.  
6. **`productionBrowserSourceMaps: false`** · `poweredByHeader: false`.  
7. **`.cursorignore`** — kurangi bocor secret ke Agent.  
8. Password/PIN: bcrypt server-side; response user **tanpa** hash.  
9. **`/robots.txt`** — `Disallow: /` untuk `*` + UA AI umum.  
10. **`middleware`** — 403 untuk User-Agent crawler AI dikenal (GPTBot, ClaudeBot, Bytespider, …).  
11. **Metadata `robots: noindex`** di layout.  
12. **Alert UI basic** — detail teknis ke `console` / log Worker; pengunjung hanya lihat pesan singkat (`public-error.ts`).

## Ops yang wajib (bukan kode)

```bash
npx wrangler secret put SESSION_SECRET   # ≥24 karakter acak
npm run db:migrate:remote
npm run deploy
```

Opsional Cloudflare (dashboard umrplku): Bot Fight Mode / WAF rule blok UA AI — lapis tambahan di edge.

- Privacy Mode Cursor ON.  
- Jangan commit `.env` / `.dev.vars`.  
- Jangan taruh password/PIN di `NEXT_PUBLIC_*` atau `public/`.

## Yang sengaja tidak dilakukan

- Obfuscator JS berat (ROI rendah).  
- Klaim “AI lain sama sekali tidak bisa membaca situs ini”.
