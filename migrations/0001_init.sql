-- IST Security — schema Key Log + sync offline→D1 (MVP)

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  pin_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'security',
  encryption_code TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS keys (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  jenis TEXT NOT NULL,
  barcode TEXT NOT NULL UNIQUE,
  overdue_minutes INTEGER,
  status TEXT NOT NULL DEFAULT 'available',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS borrow_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key_id INTEGER NOT NULL,
  borrower_name TEXT NOT NULL,
  borrower_divisi TEXT NOT NULL DEFAULT '',
  take_out_at TEXT NOT NULL,
  give_back_at TEXT,
  taken_by_user_id INTEGER,
  returned_by_user_id INTEGER,
  client_uuid TEXT UNIQUE,
  synced_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT,
  FOREIGN KEY (key_id) REFERENCES keys(id),
  FOREIGN KEY (taken_by_user_id) REFERENCES users(id),
  FOREIGN KEY (returned_by_user_id) REFERENCES users(id)
);

-- Antrian offline (PWA) → diterapkan ke D1 saat online
CREATE TABLE IF NOT EXISTS sync_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id TEXT NOT NULL,
  entity TEXT NOT NULL,
  op TEXT NOT NULL DEFAULT 'upsert',
  payload TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  error TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  applied_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_keys_status ON keys(status);
CREATE INDEX IF NOT EXISTS idx_keys_barcode ON keys(barcode);
CREATE INDEX IF NOT EXISTS idx_borrow_key ON borrow_logs(key_id);
CREATE INDEX IF NOT EXISTS idx_borrow_open ON borrow_logs(give_back_at);
CREATE INDEX IF NOT EXISTS idx_sync_status ON sync_queue(status);
