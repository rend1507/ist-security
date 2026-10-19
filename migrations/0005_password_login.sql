-- Password untuk login; PIN 6 digit tetap untuk verifikasi transaksi
-- Password demo semua user: ist2026

ALTER TABLE users ADD COLUMN password_hash TEXT;

UPDATE users
SET password_hash = '$2b$10$afZ5JBKG/KpVkwHhS34OseWjuo1Gd4cAVlSfYugA6MoEC3cwP.iGi'
WHERE deleted_at IS NULL;
