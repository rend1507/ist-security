/** Simpan nama / divisi peminjam selalu UPPERCASE (antrian 5.1). */
export function toStoredUpper(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLocaleUpperCase("id-ID");
}

/** Jenis / nama kunci selalu lowercase (antrian 6). */
export function toStoredLower(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase("id-ID");
}
