import { getDb } from "@/lib/db";
import { normalizeScanOrCode } from "@/lib/scan-token";

export type KeyLookupRow = {
  id: number;
  code: string;
  status: string;
  barcode: string;
};

/** Cari kunci lewat kode manual (SEC1) atau token QR/barcode (ISTK…). */
export async function findKeyByScanOrCode(
  raw: string
): Promise<KeyLookupRow | null> {
  const value = normalizeScanOrCode(raw);
  if (!value) return null;
  const db = await getDb();
  return (
    (await db
      .prepare(
        `SELECT id, code, status, barcode FROM keys
         WHERE deleted_at IS NULL AND (code = ? OR barcode = ?)
         LIMIT 1`
      )
      .bind(value, value)
      .first<KeyLookupRow>()) ?? null
  );
}
