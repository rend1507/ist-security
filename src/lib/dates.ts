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
