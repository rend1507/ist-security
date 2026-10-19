-- PIN 6 digit, email user, riwayat ubah jam (maks 4), log ganti PIN / email simulasi

ALTER TABLE users ADD COLUMN email TEXT;
ALTER TABLE borrow_logs ADD COLUMN edit_count INTEGER NOT NULL DEFAULT 0;

UPDATE users SET pin_hash = '$2b$10$cmXGFlpr4n2ZoqE8oYPGSO7uImH5xGIAXyquh2xATk8eSh34lvDNK';
UPDATE users SET email = username || '@ist-security.local' WHERE email IS NULL OR email = '';

CREATE TABLE IF NOT EXISTS borrow_edit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  borrow_log_id INTEGER NOT NULL,
  edited_by_user_id INTEGER NOT NULL,
  field_name TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (borrow_log_id) REFERENCES borrow_logs(id),
  FOREIGN KEY (edited_by_user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS pin_change_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  changed_by_user_id INTEGER NOT NULL,
  notify_email TEXT,
  email_status TEXT NOT NULL DEFAULT 'simulated',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (changed_by_user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_borrow_edit_log ON borrow_edit_logs(borrow_log_id);
CREATE INDEX IF NOT EXISTS idx_pin_change_user ON pin_change_logs(user_id);
