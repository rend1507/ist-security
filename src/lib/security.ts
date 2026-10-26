/**
 * Batas keamanan IST Security (server-side).
 *
 * Realita: bundle client Next.js selalu bisa dibaca (manusia/AI).
 * Mitigasi yang efektif = secret & otorisasi hanya di Worker/API,
 * bukan obfuscation frontend.
 */

/** Fallback HANYA untuk `next dev` lokal — dilarang di production/Workers. */
export const DEV_SESSION_FALLBACK = "ist-security-dev-secret-change-me";

export const SESSION_COOKIE = "ist_session";
export const SESSION_MAX_AGE_SEC = 60 * 60 * 12;

/** Login: max gagal per jendela sebelum kunci sementara. */
export const LOGIN_MAX_FAILS = 8;
export const LOGIN_WINDOW_SEC = 15 * 60;
export const LOGIN_LOCK_SEC = 15 * 60;

export function isProductionRuntime(): boolean {
  return process.env.NODE_ENV === "production";
}

/**
 * Ambil SESSION_SECRET dari env Worker.
 * Production tanpa secret yang kuat → gagal keras (jangan pakai fallback).
 */
export function resolveSessionSecret(envSecret: string | undefined): string {
  const secret = (envSecret || "").trim();
  if (secret && secret !== DEV_SESSION_FALLBACK && secret.length >= 24) {
    return secret;
  }
  if (isProductionRuntime()) {
    throw new Error(
      "SESSION_SECRET belum diset (wrangler secret) atau terlalu lemah. Deploy ditolak secara aman."
    );
  }
  return secret || DEV_SESSION_FALLBACK;
}

/** Header keamanan HTTP untuk response Next. */
export const SECURITY_HEADERS: { key: string; value: string }[] = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(self), microphone=(), geolocation=()",
  },
  {
    key: "Cross-Origin-Opener-Policy",
    value: "same-origin",
  },
  // Crawler / indeks / pelatihan AI yang menghormati header (best-effort).
  {
    key: "X-Robots-Tag",
    value: "noindex, nofollow, noarchive, nosnippet, noai, noimageai",
  },
];

