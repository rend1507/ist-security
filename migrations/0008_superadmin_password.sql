-- Password Super Admin diganti (bukan password demo umum).
-- Akun superadmin tetap di DB; tidak ditampilkan di daftar akun uji Login.

UPDATE users
SET password_hash = '$2b$10$URlDcaaBDcCKPTFC1e1mC.J6WIPOhsjfozwZ6RLzofmZqpm5R6QDu',
    updated_at = datetime('now')
WHERE username = 'superadmin' AND role = 'superadmin';
