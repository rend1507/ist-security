/**
 * Pesan untuk pengunjung/UI = singkat.
 * Detail teknis → console saja (browser DevTools / log Worker).
 */

const TECH_LEAK =
  /SESSION_SECRET|wrangler|D1 |binding|migrate|OpenNext|stack|at |\/Users\/|\.ts\b|\.js\b|node_modules|Cloudflare|Worker secret|getenv|ECONN|SQL/i;

/** Pesan bisnis singkat yang aman ditampilkan di UI. */
const SAFE_EXACT = new Set([
  "ID atau password salah.",
  "Silakan masuk dulu.",
  "Belum masuk.",
  "PIN salah. Coba lagi.",
  "PIN akun harus 6 angka.",
  "PIN harus 6 angka",
  "Password terlalu pendek.",
  "Tidak bisa terhubung.",
  "Tidak bisa terhubung. Cek jaringan.",
  "Tidak bisa terhubung. Coba lagi.",
  "Terlalu banyak percobaan. Coba lagi nanti.",
  "Sistem sibuk. Coba lagi.",
  "Gagal masuk.",
  "Gagal memuat data.",
  "Gagal menyimpan.",
  "QR tidak dikenali.",
  "Kunci tidak ditemukan.",
  "Isi ID petugas / username.",
  "Isi password.",
  "Nama peminjam wajib diisi.",
  "Nama peminjam sudah ada.",
  "Nama peminjam sudah dipakai.",
]);

export const UI_MSG = {
  loginFail: "ID atau password salah.",
  loginBusy: "Sistem sibuk. Coba lagi.",
  loginLock: "Terlalu banyak percobaan. Coba lagi nanti.",
  network: "Tidak bisa terhubung.",
  generic: "Gagal. Coba lagi.",
  load: "Gagal memuat data.",
  save: "Gagal menyimpan.",
} as const;

export function isSafeUiMessage(msg: string | undefined | null): boolean {
  if (!msg) return false;
  const t = msg.trim();
  if (!t || t.length > 100) return false;
  if (SAFE_EXACT.has(t)) return true;
  if (TECH_LEAK.test(t)) return false;
  // Pesan validasi singkat Bahasa Indonesia tanpa jargon teknis
  return !/[A-Z_]{4,}/.test(t) || /PIN|QR|ID /.test(t);
}

/** Server: log detail, kirim pesan publik ke client. */
export function jsonPublicErr(
  detail: unknown,
  status = 500,
  publicMsg?: string
): Response {
  const raw =
    detail instanceof Error
      ? detail.message
      : typeof detail === "string"
        ? detail
        : "error";
  console.error(`[IST api ${status}]`, raw, detail);

  let msg = publicMsg;
  if (!msg) {
    if (status === 401) msg = UI_MSG.loginFail;
    else if (status === 429) msg = UI_MSG.loginLock;
    else if (status >= 500) msg = UI_MSG.loginBusy;
    else if (isSafeUiMessage(raw)) msg = raw;
    else msg = UI_MSG.generic;
  }

  return Response.json({ ok: false, error: msg }, { status });
}

/**
 * Client: tampilkan basic di UI, detail ke console.
 * `serverError` dari API hanya dipakai jika lolos filter aman.
 */
export function uiAlert(
  setError: (msg: string | null) => void,
  basic: string,
  detail?: unknown
): void {
  if (detail !== undefined && detail !== null && detail !== "") {
    console.error("[IST UI]", basic, detail);
  }
  if (typeof detail === "string" && isSafeUiMessage(detail)) {
    setError(detail);
    return;
  }
  setError(basic);
}

/** Client: dari respons API JSON. */
export function uiApiAlert(
  setError: (msg: string | null) => void,
  basic: string,
  res: { status: number },
  json: { error?: string }
): void {
  console.error("[IST UI]", basic, {
    status: res.status,
    error: json.error || `HTTP ${res.status}`,
  });

  if (res.status === 429) {
    setError(UI_MSG.loginLock);
    return;
  }
  if (res.status >= 500) {
    setError(UI_MSG.loginBusy);
    return;
  }
  if (res.status === 401 && isSafeUiMessage(json.error)) {
    setError(json.error!);
    return;
  }
  if (isSafeUiMessage(json.error)) {
    setError(json.error!);
    return;
  }
  setError(basic);
}
