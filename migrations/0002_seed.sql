-- Seed demo IST Security
-- PIN semua user: 1234
-- hash bcrypt: $2b$10$oWYZHeEVhk96f3l8G0rl9Oipp0yY6gp6oORZa/KA.6pkUvnAHuYLy

INSERT OR IGNORE INTO app_settings (key, value) VALUES
('default_overdue_minutes', '5'),
('app_name', 'IST Security');

INSERT OR IGNORE INTO users (id, username, name, pin_hash, role, encryption_code, created_at, updated_at) VALUES
(1, 'superadmin', 'Super Admin IST', '$2b$10$oWYZHeEVhk96f3l8G0rl9Oipp0yY6gp6oORZa/KA.6pkUvnAHuYLy', 'superadmin', 'ENC-SA-001', datetime('now'), datetime('now')),
(2, 'kepala', 'Kepala Security', '$2b$10$oWYZHeEVhk96f3l8G0rl9Oipp0yY6gp6oORZa/KA.6pkUvnAHuYLy', 'kepala_security', 'ENC-KS-001', datetime('now'), datetime('now')),
(3, 'admin', 'Admin Master', '$2b$10$oWYZHeEVhk96f3l8G0rl9Oipp0yY6gp6oORZa/KA.6pkUvnAHuYLy', 'admin', 'ENC-AD-001', datetime('now'), datetime('now')),
(4, 'sec01', 'Petugas Security 01', '$2b$10$oWYZHeEVhk96f3l8G0rl9Oipp0yY6gp6oORZa/KA.6pkUvnAHuYLy', 'security', 'ENC-SC-001', datetime('now'), datetime('now'));

INSERT OR IGNORE INTO keys (id, code, jenis, barcode, overdue_minutes, status, created_at, updated_at) VALUES
(1, 'SEC1', 'Kunci Kontainer', 'QR-SEC1-IST', NULL, 'out', datetime('now'), datetime('now')),
(2, 'SEC2', 'Kunci Panel Utama', 'QR-SEC2-IST', 10, 'available', datetime('now'), datetime('now'));

-- SEC1 masih dipinjam (demo Still Out / bisa overdue tergantung waktu)
INSERT OR IGNORE INTO borrow_logs (
  id, key_id, borrower_name, borrower_divisi, take_out_at, give_back_at,
  taken_by_user_id, client_uuid, synced_at, created_at, updated_at
) VALUES (
  1, 1, 'Budi Produksi', 'Produksi',
  datetime('now', '-12 minutes'),
  NULL,
  4, 'seed-borrow-sec1-001', datetime('now'), datetime('now'), datetime('now')
);
