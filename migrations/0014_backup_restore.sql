-- Cadangan & pulih Super Admin: riwayat + payload JSON + titik pulih
CREATE TABLE IF NOT EXISTS data_backups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kind TEXT NOT NULL,
  mode TEXT,
  filename TEXT NOT NULL,
  from_ts TEXT,
  to_ts TEXT,
  summary_json TEXT NOT NULL,
  payload_json TEXT,
  rows_stored INTEGER NOT NULL DEFAULT 0,
  rows_removed INTEGER NOT NULL DEFAULT 0,
  rows_updated INTEGER NOT NULL DEFAULT 0,
  restore_point_id INTEGER,
  created_by_user_id INTEGER NOT NULL,
  created_by_username TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_data_backups_created
  ON data_backups (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_data_backups_kind_created
  ON data_backups (kind, created_at DESC);
