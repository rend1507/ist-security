/** Token acak untuk isi QR / barcode — bukan kode kunci manual (SEC1). */

const TOKEN_RE = /^ISTK[0-9A-F]{24}$/;

export function isScanToken(value: string): boolean {
  return TOKEN_RE.test(value.trim().toUpperCase());
}

/** Generate token unik (huruf besar) untuk dicetak di QR & barcode. */
export function generateScanToken(): string {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
  return `ISTK${hex}`;
}

/**
 * Normalisasi input petugas / hasil scan.
 * Token ISTK… tetap token; selain itu diperlakukan sebagai kode kunci.
 */
export function normalizeScanOrCode(raw: string): string {
  const trimmed = raw.trim().replace(/^\*/, "").replace(/\*$/, "");
  return trimmed.toUpperCase();
}
