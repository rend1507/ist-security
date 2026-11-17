"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  PAGE_SIZE_OPTIONS,
  PaginationBar,
  type PageSizeOption,
} from "@/components/PaginationBar";
import { Modal } from "@/components/Modal";
import {
  BACKUP_KIND_LABELS,
  isRestoreQuietHours,
  type BackupKind,
  type BackupRecord,
  type TableSummary,
} from "@/lib/backup-shared";
import { nowLocalSql, todayWibDate } from "@/lib/dates";
import { UI_MSG, uiAlert, uiApiAlert } from "@/lib/public-error";
import {
  alertError,
  alertOk,
  alertWarn,
  btnCancel,
  btnDanger,
  btnPrimary,
  inputBase,
  pillActive,
  pillIdle,
  tableHead,
  tableShell,
  textLabel,
  toolbarGroup,
} from "@/lib/ui";

type Tab = "backup" | "restore" | "history";
type Scope = "full" | "today" | "range";
type RestoreMode = "replace" | "merge";

const TABLE_LABELS: Record<string, string> = {
  users: "Akun petugas",
  keys: "Kunci",
  borrowers: "Peminjam",
  app_settings: "Pengaturan",
  borrow_logs: "Log pinjam",
  borrow_edit_logs: "Ubah jam",
  pin_change_logs: "Ganti PIN",
  session_access_logs: "Log aktivitas",
};

function tableLabel(name: string) {
  return TABLE_LABELS[name] ?? name;
}

function kindLabel(kind: string) {
  return BACKUP_KIND_LABELS[kind as BackupKind] ?? kind;
}

function toLocalInput(sql: string) {
  return sql.slice(0, 16).replace(" ", "T");
}

function downloadUrl(id: number, type: "sql" | "json") {
  return `/api/backup?id=${id}&download=${type}`;
}

export function BackupRestorePanel() {
  const [tab, setTab] = useState<Tab>("backup");
  const [scope, setScope] = useState<Scope>("today");
  const [fromLocal, setFromLocal] = useState(
    () => `${todayWibDate()}T00:00`
  );
  const [toLocal, setToLocal] = useState(() => toLocalInput(nowLocalSql()));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [lastBackup, setLastBackup] = useState<BackupRecord | null>(null);

  const [rows, setRows] = useState<BackupRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSizeOption>(20);
  const [sort, setSort] = useState<"desc" | "asc">("desc");
  const [detail, setDetail] = useState<BackupRecord | null>(null);

  const [restoreId, setRestoreId] = useState<number | "">("");
  const [restoreMode, setRestoreMode] = useState<RestoreMode>("merge");
  const [confirmRestore, setConfirmRestore] = useState(false);
  const [confirmOffHours, setConfirmOffHours] = useState(false);
  const [uploadName, setUploadName] = useState<string | null>(null);
  const [uploadPayload, setUploadPayload] = useState<unknown>(null);
  const [askRestore, setAskRestore] = useState(false);

  const quietNow = isRestoreQuietHours();
  const restorable = useMemo(
    () => rows.filter((r) => r.kind === "backup" || r.kind === "restore_point"),
    [rows]
  );
  const selectedRestore = restorable.find((r) => r.id === restoreId) ?? null;

  const loadHistory = useCallback(
    async (pageN: number, size: PageSizeOption, sortDir: "asc" | "desc") => {
      setError(null);
      try {
        const q = new URLSearchParams({
          page: String(pageN),
          pageSize: String(size),
          sort: sortDir,
        });
        const res = await fetch(`/api/backup?${q}`, { cache: "no-store" });
        const json = (await res.json()) as {
          ok: boolean;
          data?: { rows: BackupRecord[]; total: number; page: number };
          error?: string;
        };
        if (!json.ok || !json.data) {
          uiApiAlert(setError, UI_MSG.load, res, json);
          setRows([]);
          setTotal(0);
          return;
        }
        setRows(json.data.rows);
        setTotal(json.data.total);
        if (json.data.page !== pageN) setPage(json.data.page);
      } catch (err) {
        uiAlert(setError, UI_MSG.network, err);
        setRows([]);
        setTotal(0);
      }
    },
    []
  );

  useEffect(() => {
    void loadHistory(page, pageSize, sort);
  }, [loadHistory, page, pageSize, sort]);

  async function runBackup() {
    setBusy(true);
    setError(null);
    setOk(null);
    try {
      const res = await fetch("/api/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scope,
          fromTs: fromLocal,
          toTs: toLocal,
        }),
      });
      const json = (await res.json()) as {
        ok: boolean;
        data?: BackupRecord;
        error?: string;
      };
      if (!json.ok || !json.data) {
        uiApiAlert(setError, UI_MSG.save, res, json);
        return;
      }
      setLastBackup(json.data);
      setOk(
        `Cadangan #${json.data.id} siap (${json.data.rows_stored} baris). Unduh SQL atau JSON di bawah.`
      );
      setTab("history");
      setPage(1);
      await loadHistory(1, pageSize, sort);
    } catch (err) {
      uiAlert(setError, UI_MSG.network, err);
    } finally {
      setBusy(false);
    }
  }

  function onPickFile(file: File | null) {
    setUploadName(null);
    setUploadPayload(null);
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        setUploadPayload(parsed);
        setUploadName(file.name);
        setRestoreId("");
      } catch {
        setError("File JSON tidak bisa dibaca.");
      }
    };
    reader.readAsText(file);
  }

  async function runRestore() {
    setBusy(true);
    setError(null);
    setOk(null);
    try {
      const res = await fetch("/api/backup/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          backupId: restoreId || undefined,
          payload: uploadPayload || undefined,
          mode: restoreMode,
          confirm: true,
          confirmOffHours: quietNow ? undefined : confirmOffHours,
        }),
      });
      const json = (await res.json()) as {
        ok: boolean;
        data?: BackupRecord;
        error?: string;
      };
      if (!json.ok || !json.data) {
        uiApiAlert(setError, "Gagal memulihkan.", res, json);
        return;
      }
      setAskRestore(false);
      setConfirmRestore(false);
      setOk(
        `Pulih selesai. Titik pulih #${json.data.restore_point_id}. Simpan ${json.data.rows_stored}, ubah ${json.data.rows_updated}, hapus ${json.data.rows_removed}.`
      );
      setTab("history");
      setPage(1);
      await loadHistory(1, pageSize, sort);
    } catch (err) {
      uiAlert(setError, UI_MSG.network, err);
    } finally {
      setBusy(false);
    }
  }

  function SummaryTable({ items }: { items: TableSummary[] }) {
    if (items.length === 0) {
      return <p className="text-base text-slate-600">Tidak ada ringkasan.</p>;
    }
    return (
      <div className={tableShell}>
        <table className="min-w-full text-left text-base">
          <thead className={tableHead}>
            <tr>
              <th className="px-3 py-2.5">Data</th>
              <th className="px-3 py-2.5">Baris</th>
            </tr>
          </thead>
          <tbody>
            {items.map((t) => (
              <tr key={t.table} className="border-t border-slate-200">
                <td className="px-3 py-2.5">{tableLabel(t.table)}</td>
                <td className="px-3 py-2.5 font-mono tabular-nums">{t.rows}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className={`${toolbarGroup} items-stretch sm:items-center`}>
        {(
          [
            ["backup", "Cadangan"],
            ["restore", "Pulihkan"],
            ["history", "Riwayat"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={tab === key ? pillActive : pillIdle}
          >
            {label}
          </button>
        ))}
      </div>

      {error && <p className={alertError}>{error}</p>}
      {ok && <p className={alertOk}>{ok}</p>}

      {tab === "backup" && (
        <div className="space-y-4">
          <p className="text-base text-slate-800">
            Akun, kunci, peminjam, dan pengaturan selalu ikut. Log pinjam / ubah
            jam / PIN / aktivitas bisa dibatasi tanggal. File disimpan di R2
            (bukan D1) lalu bisa diunduh ulang dari Riwayat: SQL untuk arsip,
            JSON untuk pulihkan menurut ID.
          </p>
          <fieldset className="space-y-2">
            <legend className={textLabel}>Isi cadangan</legend>
            <label className="flex min-h-12 items-center gap-2 text-base">
              <input
                type="radio"
                name="scope"
                checked={scope === "today"}
                onChange={() => setScope("today")}
              />
              Hari ini (00.00 sampai sekarang)
            </label>
            <label className="flex min-h-12 items-center gap-2 text-base">
              <input
                type="radio"
                name="scope"
                checked={scope === "full"}
                onChange={() => setScope("full")}
              />
              Semua data
            </label>
            <label className="flex min-h-12 items-center gap-2 text-base">
              <input
                type="radio"
                name="scope"
                checked={scope === "range"}
                onChange={() => setScope("range")}
              />
              Rentang tanggal dan jam
            </label>
          </fieldset>
          {scope === "range" && (
            <div className={`${toolbarGroup} items-end`}>
              <label className={textLabel}>
                Dari
                <input
                  type="datetime-local"
                  value={fromLocal}
                  onChange={(e) => setFromLocal(e.target.value)}
                  className={`${inputBase} font-mono`}
                />
              </label>
              <label className={textLabel}>
                Sampai
                <input
                  type="datetime-local"
                  value={toLocal}
                  onChange={(e) => setToLocal(e.target.value)}
                  className={`${inputBase} font-mono`}
                />
              </label>
            </div>
          )}
          <button
            type="button"
            disabled={busy}
            onClick={() => void runBackup()}
            className={btnPrimary}
          >
            {busy ? "Menyimpan…" : "Buat cadangan"}
          </button>
          {lastBackup && (
            <div className="space-y-3">
              <p className="text-base font-semibold text-slate-900">
                Ringkasan cadangan #{lastBackup.id}
              </p>
              <SummaryTable items={lastBackup.summary} />
              <div className="flex flex-wrap gap-2">
                <a
                  className={btnPrimary}
                  href={downloadUrl(lastBackup.id, "sql")}
                >
                  Unduh SQL
                </a>
                <a
                  className={btnCancel}
                  href={downloadUrl(lastBackup.id, "json")}
                >
                  Unduh JSON
                </a>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "restore" && (
        <div className="space-y-4">
          {!quietNow && (
            <p className={alertWarn}>
              Sekarang di luar jam sepi (21.00–03.00). Pulihkan malam hari jika
              petugas masih memakai aplikasi.
            </p>
          )}
          <p className="text-base text-slate-800">
            Setiap pulih menyimpan titik pulih otomatis (cadangan penuh sebelum
            data diubah). Pilih dari Riwayat atau unggah JSON.
          </p>
          <label className={textLabel}>
            Cadangan
            <select
              value={restoreId}
              onChange={(e) => {
                setRestoreId(e.target.value ? Number(e.target.value) : "");
                setUploadPayload(null);
                setUploadName(null);
              }}
              className={`${inputBase} font-mono`}
            >
              <option value="">Pilih dari riwayat</option>
              {restorable.map((r) => (
                <option key={r.id} value={r.id}>
                  #{r.id} · {r.created_at} · {kindLabel(r.kind)} ·{" "}
                  {r.rows_stored} baris
                </option>
              ))}
            </select>
          </label>
          <label className={textLabel}>
            Atau unggah JSON
            <input
              type="file"
              accept="application/json,.json"
              className={inputBase}
              onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
            />
            {uploadName && (
              <span className="mt-1 block font-mono text-base">{uploadName}</span>
            )}
          </label>
          <fieldset className="space-y-2">
            <legend className={textLabel}>Cara pulih</legend>
            <label className="flex min-h-12 items-center gap-2 text-base">
              <input
                type="radio"
                name="restore-mode"
                checked={restoreMode === "merge"}
                onChange={() => setRestoreMode("merge")}
              />
              Ubah menurut ID (baris yang ada diganti, yang belum ada ditambah)
            </label>
            <label className="flex min-h-12 items-center gap-2 text-base">
              <input
                type="radio"
                name="restore-mode"
                checked={restoreMode === "replace"}
                onChange={() => setRestoreMode("replace")}
              />
              Ganti semua data tabel yang ada di cadangan
            </label>
          </fieldset>
          {selectedRestore && (
            <SummaryTable items={selectedRestore.summary} />
          )}
          <button
            type="button"
            disabled={busy || (!restoreId && !uploadPayload)}
            onClick={() => setAskRestore(true)}
            className={btnDanger}
          >
            Pulihkan…
          </button>
        </div>
      )}

      {tab === "history" && (
        <div className="space-y-4">
          <div className={`${toolbarGroup} items-end`}>
            <label className={textLabel}>
              Urut tanggal
              <select
                value={sort}
                onChange={(e) => {
                  setSort(e.target.value === "asc" ? "asc" : "desc");
                  setPage(1);
                }}
                className={`${inputBase} font-mono`}
              >
                <option value="desc">Terbaru dulu</option>
                <option value="asc">Terlama dulu</option>
              </select>
            </label>
          </div>
          <div className={tableShell}>
            <table className="min-w-full text-left text-base">
              <thead className={tableHead}>
                <tr>
                  <th className="px-3 py-2.5">Waktu</th>
                  <th className="px-3 py-2.5">Aksi</th>
                  <th className="px-3 py-2.5">Simpan</th>
                  <th className="px-3 py-2.5">Ubah</th>
                  <th className="px-3 py-2.5">Hapus</th>
                  <th className="px-3 py-2.5">Petugas</th>
                  <th className="px-3 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-3 py-8 text-center text-slate-500"
                    >
                      Belum ada riwayat cadangan.
                    </td>
                  </tr>
                ) : (
                  rows.map((r) => (
                    <tr key={r.id} className="border-t border-slate-200">
                      <td className="whitespace-nowrap px-3 py-2.5 font-mono">
                        {r.created_at}
                      </td>
                      <td className="px-3 py-2.5">{kindLabel(r.kind)}</td>
                      <td className="px-3 py-2.5 font-mono tabular-nums">
                        {r.rows_stored}
                      </td>
                      <td className="px-3 py-2.5 font-mono tabular-nums">
                        {r.rows_updated}
                      </td>
                      <td className="px-3 py-2.5 font-mono tabular-nums">
                        {r.rows_removed}
                      </td>
                      <td className="px-3 py-2.5 font-mono">{r.created_by_username}</td>
                      <td className="px-3 py-2.5">
                        <button
                          type="button"
                          className={btnCancel}
                          onClick={() => setDetail(r)}
                        >
                          Detail
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <PaginationBar
            page={page}
            pageSize={pageSize}
            total={total}
            disabled={busy}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              if (!(PAGE_SIZE_OPTIONS as readonly number[]).includes(size)) {
                return;
              }
              setPageSize(size);
              setPage(1);
            }}
          />
        </div>
      )}

      {detail && (
        <Modal
          title={`Riwayat #${detail.id}`}
          wide
          onClose={() => setDetail(null)}
        >
          <p className="font-mono text-base">{detail.created_at}</p>
          <p>
            {kindLabel(detail.kind)}
            {detail.mode ? ` · ${detail.mode}` : ""} · {detail.created_by_username}
          </p>
          <p>
            Simpan {detail.rows_stored} · ubah {detail.rows_updated} · hapus{" "}
            {detail.rows_removed}
            {detail.restore_point_id
              ? ` · titik pulih #${detail.restore_point_id}`
              : ""}
          </p>
          {detail.from_ts || detail.to_ts ? (
            <p className="font-mono">
              {detail.from_ts ?? "—"} s.d. {detail.to_ts ?? "—"}
            </p>
          ) : (
            <p>Semua data</p>
          )}
          <SummaryTable items={detail.summary} />
          {detail.kind !== "restore" && (
            <div className="flex flex-wrap gap-2">
              <a className={btnPrimary} href={downloadUrl(detail.id, "sql")}>
                Unduh SQL
              </a>
              <a className={btnCancel} href={downloadUrl(detail.id, "json")}>
                Unduh JSON
              </a>
            </div>
          )}
        </Modal>
      )}

      {askRestore && (
        <Modal title="Pulihkan data?" onClose={() => setAskRestore(false)}>
          <p>
            {restoreMode === "replace"
              ? "Data tabel di cadangan akan dihapus dulu, lalu diisi ulang."
              : "Baris dengan ID yang sama akan ditimpa. Baris lain tetap."}
          </p>
          {!quietNow && (
            <p className={alertWarn}>
              Bukan jam sepi (21.00–03.00). Petugas bisa sedang pinjam/kembali
              kunci.
            </p>
          )}
          <label className="flex min-h-12 items-start gap-2 text-base">
            <input
              type="checkbox"
              className="mt-1.5 h-5 w-5"
              checked={confirmRestore}
              onChange={(e) => setConfirmRestore(e.target.checked)}
            />
            Saya paham data bisa berubah dan titik pulih akan disimpan.
          </label>
          {!quietNow && (
            <label className="flex min-h-12 items-start gap-2 text-base">
              <input
                type="checkbox"
                className="mt-1.5 h-5 w-5"
                checked={confirmOffHours}
                onChange={(e) => setConfirmOffHours(e.target.checked)}
              />
              Saya tetap pulihkan di jam operasional.
            </label>
          )}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={btnCancel}
              onClick={() => setAskRestore(false)}
            >
              Batal
            </button>
            <button
              type="button"
              className={btnDanger}
              disabled={
                busy ||
                !confirmRestore ||
                (!quietNow && !confirmOffHours)
              }
              onClick={() => void runRestore()}
            >
              {busy ? "Memulihkan…" : "Ya, pulihkan"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
