-- Index filter Log Kunci per tanggal pinjam
CREATE INDEX IF NOT EXISTS idx_borrow_take_out ON borrow_logs(take_out_at);
