"use client";

import { useCallback, useEffect, useState } from "react";
import {
  PAGE_SIZE_OPTIONS,
  PaginationBar,
  type PageSizeOption,
} from "@/components/PaginationBar";
import { todayWibDate, wibDateDaysAgo } from "@/lib/dates";
import { UI_MSG, uiAlert, uiApiAlert } from "@/lib/public-error";
import { ROLE_LABELS, type Role } from "@/lib/roles";
import type { SessionAccessLogRow } from "@/lib/session-logs";
import {
  alertError,
  btnPrimary,
  tableHead,
  tableShell,
  textLabel,
  toolbarGroup,
} from "@/lib/ui";

function eventLabel(event: string) {
  return event === "login" ? "Masuk" : event === "logout" ? "Keluar" : event;
}

function eventBadgeClass(event: string) {
  return event === "login"
    ? "bg-emerald-200 text-emerald-950"
    : event === "logout"
      ? "bg-slate-200 text-slate-900"
      : "bg-amber-100 text-amber-950";
}

export function SessionAccessLogPanel() {
  const [from, setFrom] = useState(() => wibDateDaysAgo(6));
  const [to, setTo] = useState(() => todayWibDate());
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSizeOption>(20);
  const [rows, setRows] = useState<SessionAccessLogRow[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(
    async (
      fromYmd: string,
      toYmd: string,
      pageN: number,
      size: PageSizeOption
    ) => {
      setLoading(true);
      setError(null);
      try {
        const q = new URLSearchParams({
          from: fromYmd,
          to: toYmd,
          page: String(pageN),
          pageSize: String(size),
        });
        const res = await fetch(`/api/session-logs?${q}`, {
          cache: "no-store",
        });
        const json = (await res.json()) as {
          ok: boolean;
          data?: {
            rows: SessionAccessLogRow[];
            total: number;
            page: number;
          };
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
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    void load(from, to, page, pageSize);
  }, [load, from, to, page, pageSize]);

  function applyRange() {
    setPage(1);
    void load(from, to, 1, pageSize);
  }

  function setLast7Days() {
    setFrom(wibDateDaysAgo(6));
    setTo(todayWibDate());
    setPage(1);
  }

  return (
    <div className="space-y-4">
      <div className={`${toolbarGroup} items-end`}>
        <label className={textLabel}>
          Dari tanggal
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="mt-1 block w-full min-w-[10rem] rounded-md border-2 border-slate-400 bg-white px-3 py-2.5 font-mono text-base"
          />
        </label>
        <label className={textLabel}>
          Sampai tanggal
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="mt-1 block w-full min-w-[10rem] rounded-md border-2 border-slate-400 bg-white px-3 py-2.5 font-mono text-base"
          />
        </label>
        <button
          type="button"
          disabled={loading}
          onClick={applyRange}
          className={btnPrimary}
        >
          {loading ? "Memuat…" : "Tampilkan"}
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={setLast7Days}
          className="inline-flex min-h-12 items-center justify-center rounded-md border-2 border-slate-400 bg-white px-4 py-2.5 text-base font-semibold text-slate-800 hover:bg-slate-100"
        >
          7 hari
        </button>
      </div>

      <p className="text-base text-slate-700">
        Default rentang 7 hari (bisa diperpanjang lewat tanggal). Hanya Super
        Admin.
      </p>

      {error && <p className={alertError}>{error}</p>}

      <div className={tableShell}>
        <table className="min-w-full text-left text-base">
          <thead className={tableHead}>
            <tr>
              <th className="px-3 py-2.5">Waktu</th>
              <th className="px-3 py-2.5">Aksi</th>
              <th className="px-3 py-2.5">ID</th>
              <th className="px-3 py-2.5">Nama</th>
              <th className="px-3 py-2.5">Peran</th>
              <th className="px-3 py-2.5">IP</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && !loading ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-3 py-8 text-center text-base text-slate-500"
                >
                  Belum ada log di rentang ini.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-t border-slate-200">
                  <td className="whitespace-nowrap px-3 py-2.5 font-mono text-base">
                    {r.created_at}
                  </td>
                  <td className="px-3 py-2.5">
                    <span
                      className={`inline-block rounded px-2.5 py-1 text-sm font-bold ${eventBadgeClass(r.event)}`}
                    >
                      {eventLabel(r.event)}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 font-mono text-base font-semibold">
                    {r.username}
                  </td>
                  <td className="px-3 py-2.5 text-base">{r.name || "—"}</td>
                  <td className="px-3 py-2.5 text-base">
                    {ROLE_LABELS[r.role as Role] || r.role}
                  </td>
                  <td className="px-3 py-2.5 font-mono text-base text-slate-700">
                    {r.ip || "—"}
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
        disabled={loading}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          if (!(PAGE_SIZE_OPTIONS as readonly number[]).includes(size)) return;
          setPageSize(size);
          setPage(1);
        }}
      />
    </div>
  );
}
