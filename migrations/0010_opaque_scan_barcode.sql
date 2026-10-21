-- Barcode/QR: isi token acak (ISTK…) — kode kunci (SEC1) tetap untuk input manual.
-- D1/SQLite: randomblob menghasilkan token unik per baris.

UPDATE keys
SET barcode = 'ISTK' || upper(hex(randomblob(12))),
    updated_at = datetime('now')
WHERE deleted_at IS NULL
  AND (barcode = code OR barcode NOT LIKE 'ISTK%');
