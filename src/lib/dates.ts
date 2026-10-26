/** Format jam perangkat → string D1 `YYYY-MM-DD HH:mm:ss` (WIB) */
export function nowLocalSql(d = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")} ${get("hour")}:${get("minute")}:${get("second")}`;
}

/** Tanggal WIB `YYYY-MM-DD` */
export function todayWibDate(d = new Date()): string {
  return nowLocalSql(d).slice(0, 10);
}

export function isValidDateYmd(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

/**
 * Tanggal kalender WIB N hari sebelum hari ini (`YYYY-MM-DD`).
 * Contoh: days=6 → awal rentang “7 hari terakhir” (hari ini + 6 hari sebelumnya).
 */
export function wibDateDaysAgo(days: number, d = new Date()): string {
  const today = todayWibDate(d);
  const [y, m, day] = today.split("-").map(Number);
  const utc = Date.UTC(y, m - 1, day, 12, 0, 0);
  const then = new Date(utc - Math.max(0, days) * 86_400_000);
  const yy = then.getUTCFullYear();
  const mm = String(then.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(then.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}
