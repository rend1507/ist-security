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

export { nowLocalSql, todayWibDate, isValidDateYmd } from "@/lib/dates";
