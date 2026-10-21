"use client";

import { useMemo, useState } from "react";
import { LiveDuration } from "@/components/LiveDuration";
import { EditTimeModal } from "@/components/EditTimeModal";
import { IconGive, IconPencil } from "@/components/Icons";
import {
  KeyCodesModal,
  type KeyCodesInfo,
} from "@/components/KeyCodesModal";
import {
  MAX_EDITS,
  durationMs,
  parseAppDateTime,
  type KeyLogView,
} from "@/lib/domain";

type SortKey =
  | "no"
  | "code"
  | "jenis"
  | "barcode"
  | "peminjam"
  | "take_out"
  | "give_back"
  | "status"
  | "lama";

const COLUMNS: {
  key: SortKey;
  label: string;
  hideMobile?: boolean;
  sortable?: boolean;
  center?: boolean;
}[] = [
  { key: "no", label: "No" },
  { key: "code", label: "Kode" },
  { key: "jenis", label: "Jenis", hideMobile: true },
  { key: "barcode", label: "QR", hideMobile: true, sortable: false },
  { key: "peminjam", label: "Peminjam" },
  { key: "take_out", label: "Diambil", hideMobile: true },
  { key: "give_back", label: "Kembali", hideMobile: true },
  { key: "status", label: "Status", center: true },
  { key: "lama", label: "Lama" },
];

function statusLabel(status: KeyLogView["status"]) {
  switch (status) {
    case "returned":
      return "Sudah kembali";
    case "available":
      return "Siap";
    case "out":
      return "Masih dibawa";
    case "overdue":
      return "Terlambat";
    default:
      return status;
  }
}

function statusBadgeClass(status: KeyLogView["status"]) {
  switch (status) {
    case "returned":
    case "available":
      return "bg-emerald-700 text-white";
    case "out":
      return "bg-amber-600 text-white";
    case "overdue":
      return "bg-rose-700 text-white";
    default:
      return "bg-slate-600 text-white";
  }
}

function fmtTime(iso: string | null) {
  if (!iso) return "—";
  const t = parseAppDateTime(iso);
  if (Number.isNaN(t)) return iso;
  return new Date(t).toLocaleString("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function cmp(a: string | number | null, b: string | number | null) {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b), "id", { numeric: true });
}

function shouldShowDivisi(name: string, divisi: string) {
  if (!divisi?.trim()) return false;
  const n = name.toLocaleUpperCase("id-ID");
  const d = divisi.trim().toLocaleUpperCase("id-ID");
  if (n.includes(`(${d})`)) return false;
  if (n.includes(d)) return false;
  return true;
}

function cellHide(hideMobile?: boolean) {
  return hideMobile ? "hidden md:table-cell" : "";
}

export function KeyLogTable({
  rows,
  canTransact,
  onReturnKey,
}: {
  rows: KeyLogView[];
  canTransact: boolean;
  onReturnKey?: (code: string) => void;
}) {
  const [editRow, setEditRow] = useState<KeyLogView | null>(null);
  const [codesInfo, setCodesInfo] = useState<KeyCodesInfo | null>(null);

  function openCodes(r: KeyLogView) {
    setCodesInfo({
      code: r.code,
      jenis: r.jenis,
      barcode: r.barcode,
    });
  }
  const [sortKey, setSortKey] = useState<SortKey>("no");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [lamaAnchorMs, setLamaAnchorMs] = useState(() => Date.now());

  function toggleSort(key: SortKey) {
    if (key === "lama") setLamaAnchorMs(Date.now());
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "lama" ? "desc" : "asc");
    }
  }

  const sorted = useMemo(() => {
    const copy = [...rows];
    const dir = sortDir === "asc" ? 1 : -1;
    copy.sort((a, b) => {
      let r = 0;
      switch (sortKey) {
        case "no":
          r = a.no - b.no;
          break;
        case "code":
          r = cmp(a.code, b.code);
          break;
        case "jenis":
          r = cmp(a.jenis, b.jenis);
          break;
        case "barcode":
          r = cmp(a.barcode, b.barcode);
          break;
        case "peminjam":
          r = cmp(a.peminjam, b.peminjam);
          break;
        case "take_out":
          r = cmp(
            a.take_out ? parseAppDateTime(a.take_out) : null,
            b.take_out ? parseAppDateTime(b.take_out) : null
          );
          break;
        case "give_back":
          r = cmp(
            a.give_back ? parseAppDateTime(a.give_back) : null,
            b.give_back ? parseAppDateTime(b.give_back) : null
          );
          break;
        case "status":
          r = cmp(a.status, b.status);
          break;
        case "lama": {
          const da = a.take_out
            ? durationMs(a.take_out, a.give_back, lamaAnchorMs)
            : -1;
          const db = b.take_out
            ? durationMs(b.take_out, b.give_back, lamaAnchorMs)
            : -1;
          r = da - db;
          break;
        }
        default:
          r = 0;
      }
      return r * dir;
    });
    return copy;
  }, [rows, sortKey, sortDir, lamaAnchorMs]);

  return (
    <>
      <div className="-mx-1 overflow-x-auto rounded-lg border-2 border-slate-300 bg-white sm:mx-0">
        <table className="min-w-full text-left text-sm sm:text-base">
          <thead className="bg-slate-200 text-xs font-bold uppercase tracking-wide text-slate-800 sm:text-sm">
            <tr>
              {COLUMNS.map((col) => {
                const active = sortKey === col.key;
                const sortable = col.sortable !== false;
                return (
                  <th
                    key={col.key}
                    className={`whitespace-nowrap px-2 py-2.5 sm:px-3 sm:py-3 ${cellHide(col.hideMobile)} ${col.center ? "text-center" : ""}`}
                  >
                    {sortable ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(col.key)}
                        className={`inline-flex min-h-10 cursor-pointer items-center gap-1 hover:text-slate-950 ${col.center ? "justify-center" : ""}`}
                      >
                        {col.label}
                        <span className="text-[10px] opacity-80">
                          {active ? (sortDir === "asc" ? "▲" : "▼") : "⇅"}
                        </span>
                      </button>
                    ) : (
                      <span>{col.label}</span>
                    )}
                  </th>
                );
              })}
              <th className="w-12 px-1 py-2.5 sm:px-2" aria-label="Aksi" />
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td
                  colSpan={COLUMNS.length + 1}
                  className="px-3 py-10 text-center text-slate-500"
                >
                  Belum ada data kunci.
                </td>
              </tr>
            ) : (
              sorted.map((r) => {
                const borrowed = r.status === "out" || r.status === "overdue";
                const showReturn = canTransact && borrowed;
                const showEdit =
                  canTransact &&
                  !borrowed &&
                  r.status === "returned" &&
                  r.log_id != null &&
                  Boolean(r.take_out) &&
                  r.edit_count < MAX_EDITS;

                const overdue = r.status === "overdue";
                const out = r.status === "out";
                /** Sudah kembali tapi lama pinjam lewat batas → kolom Lama merah */
                const returnedOverLimit =
                  r.status === "returned" &&
                  Boolean(r.take_out) &&
                  durationMs(r.take_out!, r.give_back) >=
                    r.overdue_minutes * 60_000;
                const baseCell = overdue
                  ? "bg-rose-200"
                  : out
                    ? "bg-amber-200"
                    : "bg-white";
                const lamaCell = overdue
                  ? "bg-amber-300"
                  : out
                    ? "bg-amber-200"
                    : returnedOverLimit
                      ? "bg-rose-300"
                      : "bg-white";

                return (
                  <tr key={r.key_id} className="border-t border-slate-300/80">
                    <td
                      className={`px-2 py-2.5 font-mono text-slate-700 sm:px-3 ${baseCell}`}
                    >
                      {r.no}
                    </td>
                    <td
                      className={`px-2 py-2.5 font-mono font-bold sm:px-3 ${baseCell}`}
                    >
                      <button
                        type="button"
                        className="text-left text-blue-800 hover:underline"
                        title="Tampilkan QR & barcode"
                        onClick={() => openCodes(r)}
                      >
                        {r.code}
                      </button>
                    </td>
                    <td
                      className={`px-2 py-2.5 sm:px-3 ${cellHide(true)} ${baseCell}`}
                    >
                      {r.jenis}
                    </td>
                    <td
                      className={`px-2 py-2.5 font-mono text-sm sm:px-3 ${cellHide(true)} ${baseCell}`}
                    >
                      <button
                        type="button"
                        className="font-semibold text-blue-800 hover:underline"
                        title="Tampilkan QR & barcode"
                        onClick={() => openCodes(r)}
                      >
                        Lihat
                      </button>
                    </td>
                    <td
                      className={`px-2 py-2.5 font-semibold sm:px-3 ${baseCell}`}
                    >
                      <span className="line-clamp-2">{r.peminjam}</span>
                      {shouldShowDivisi(r.peminjam, r.divisi) ? (
                        <span className="block text-xs font-normal text-slate-700 sm:text-sm">
                          {r.divisi}
                        </span>
                      ) : null}
                    </td>
                    <td
                      className={`px-2 py-2.5 font-mono text-xs sm:px-3 sm:text-sm ${cellHide(true)} ${baseCell}`}
                    >
                      {fmtTime(r.take_out)}
                    </td>
                    <td
                      className={`px-2 py-2.5 font-mono text-xs sm:px-3 sm:text-sm ${cellHide(true)} ${baseCell}`}
                    >
                      {fmtTime(r.give_back)}
                    </td>
                    <td
                      className={`px-2 py-2.5 text-center sm:px-3 ${baseCell}`}
                    >
                      <span
                        className={`inline-block rounded px-2 py-1 text-xs font-bold sm:text-sm ${statusBadgeClass(r.status)}`}
                      >
                        {statusLabel(r.status)}
                      </span>
                    </td>
                    <td
                      className={`px-2 py-2.5 font-mono text-sm font-semibold tabular-nums sm:px-3 ${lamaCell}`}
                    >
                      {r.take_out &&
                      (r.status === "out" ||
                        r.status === "overdue" ||
                        r.status === "returned") ? (
                        <LiveDuration
                          takeOut={r.take_out}
                          giveBack={r.give_back}
                        />
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className={`px-1 py-2 text-center sm:px-2 ${baseCell}`}>
                      {showReturn ? (
                        <button
                          type="button"
                          title="Kembalikan kunci"
                          aria-label={`Kembalikan ${r.code}`}
                          className="inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-md border-2 border-emerald-800 bg-emerald-100 text-emerald-900 hover:bg-emerald-200"
                          onClick={() => onReturnKey?.(r.code)}
                        >
                          <IconGive className="h-5 w-5" />
                        </button>
                      ) : showEdit ? (
                        <button
                          type="button"
                          title="Ubah jam"
                          aria-label={`Ubah jam ${r.code}`}
                          className="inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-md border-2 border-blue-700 bg-blue-50 text-blue-800 hover:bg-blue-100"
                          onClick={() => setEditRow(r)}
                        >
                          <IconPencil className="h-5 w-5" />
                        </button>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {editRow && editRow.log_id != null && (
        <EditTimeModal
          logId={editRow.log_id}
          code={editRow.code}
          takeOut={editRow.take_out}
          giveBack={editRow.give_back}
          editCount={editRow.edit_count}
          onClose={() => setEditRow(null)}
        />
      )}

      {codesInfo && (
        <KeyCodesModal
          info={codesInfo}
          onClose={() => setCodesInfo(null)}
        />
      )}
    </>
  );
}
