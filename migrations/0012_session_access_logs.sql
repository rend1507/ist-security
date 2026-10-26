-- Log masuk / keluar (audit Super Admin)
CREATE TABLE IF NOT EXISTS session_access_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  username TEXT NOT NULL,
  name TEXT,
  role TEXT NOT NULL,
  event TEXT NOT NULL CHECK (event IN ('login', 'logout')),
  ip TEXT,
  user_agent TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_session_access_created
  ON session_access_logs (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_session_access_user_created
  ON session_access_logs (user_id, created_at DESC);
