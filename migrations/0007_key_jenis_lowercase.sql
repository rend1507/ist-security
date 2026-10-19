-- 6. Nama/jenis kunci disimpan lowercase
UPDATE keys
SET jenis = lower(jenis), updated_at = datetime('now')
WHERE deleted_at IS NULL;
