-- Log aktivitas Super Admin: event bebas + keterangan (bukan hanya masuk/keluar)
CREATE TABLE session_access_logs_v2 (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  username TEXT NOT NULL,
  name TEXT,
  role TEXT NOT NULL,
  event TEXT NOT NULL,
  detail TEXT,
  ip TEXT,
  user_agent TEXT,
  created_at TEXT NOT NULL
);

INSERT INTO session_access_logs_v2
  (id, user_id, username, name, role, event, detail, ip, user_agent, created_at)
SELECT id, user_id, username, name, role, event, NULL, ip, user_agent, created_at
FROM session_access_logs;

DROP TABLE session_access_logs;
ALTER TABLE session_access_logs_v2 RENAME TO session_access_logs;

CREATE INDEX IF NOT EXISTS idx_session_access_created
  ON session_access_logs (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_session_access_user_created
  ON session_access_logs (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_session_access_event_created
  ON session_access_logs (event, created_at DESC);
