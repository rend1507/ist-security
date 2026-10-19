import bcrypt from "bcryptjs";

const PIN_RE = /^\d{6}$/;

export function isValidPinFormat(pin: string): boolean {
  return PIN_RE.test(pin);
}

export async function hashPin(pin: string): Promise<string> {
  if (!isValidPinFormat(pin)) {
    throw new Error("PIN harus 6 angka");
  }
  return bcrypt.hash(pin, 10);
}

export async function verifyPin(pin: string, pinHash: string): Promise<boolean> {
  if (!isValidPinFormat(pin)) return false;
  return bcrypt.compare(pin, pinHash);
}

/** Format jam perangkat → string D1 `YYYY-MM-DD HH:mm:ss` (WIB display via +07 parse) */
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
