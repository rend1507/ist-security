-- Rate limit login (defensif anti-bruteforce / otomasi)
CREATE TABLE IF NOT EXISTS login_rate_limit (
  bucket_key TEXT PRIMARY KEY,
  fail_count INTEGER NOT NULL DEFAULT 0,
  window_started_at TEXT NOT NULL,
  locked_until TEXT
);

CREATE INDEX IF NOT EXISTS idx_login_rate_locked
  ON login_rate_limit (locked_until);
