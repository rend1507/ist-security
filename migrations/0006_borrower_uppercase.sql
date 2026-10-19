-- 5.1 Nama & divisi peminjam selalu UPPERCASE
UPDATE borrowers
SET
  name = upper(name),
  display_name = upper(display_name),
  divisi = upper(divisi),
  updated_at = datetime('now')
WHERE deleted_at IS NULL;

UPDATE borrow_logs
SET
  borrower_name = upper(borrower_name),
  borrower_divisi = upper(borrower_divisi),
  updated_at = datetime('now');
