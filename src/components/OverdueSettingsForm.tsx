"use client";

import { useCallback, useEffect, useState } from "react";
import { UI_MSG, uiAlert, uiApiAlert } from "@/lib/public-error";
import { alertError, alertOk, btnPrimary, textLabel } from "@/lib/ui";

/** Form batas terlambat — dipakai Pengaturan & Dashboard (satu copy). */
export function OverdueSettingsForm({
  onSaved,
}: {
  /** Setelah sukses (mis. tutup modal / refresh dashboard). */
  onSaved?: (minutes: number) => void;
}) {
  const [minutes, setMinutes] = useState("5");
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const s = await fetch("/api/settings");
      const sj = (await s.json()) as {
        ok: boolean;
        data?: { default_overdue_minutes: number };
        error?: string;
      };
      if (!sj.ok || !sj.data) {
        uiApiAlert(setError, UI_MSG.load, s, sj);
        return;
      }
      setMinutes(String(sj.data.default_overdue_minutes));
    } catch (e) {
      uiAlert(setError, UI_MSG.load, e);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    setLoading(true);
    setError(null);
    setMsg(null);
    try {
      const n = Number(minutes);
      if (!Number.isFinite(n) || n <= 0) {
        setError("Isi batas terlambat dalam menit (angka positif).");
        return;
      }
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          default_overdue_minutes: Math.floor(n),
        }),
      });
      const json = (await res.json()) as {
        ok: boolean;
        data?: { default_overdue_minutes: number };
        error?: string;
      };
      if (!json.ok) {
        uiApiAlert(setError, UI_MSG.save, res, json);
        return;
      }
      const saved = json.data?.default_overdue_minutes ?? Math.floor(n);
      setMinutes(String(saved));
      setMsg("Batas terlambat disimpan.");
      onSaved?.(saved);
    } catch (e) {
      uiAlert(setError, UI_MSG.network, e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-base text-slate-700">
        Menit default sebelum status jadi terlambat.
      </p>
      <label className={textLabel}>
        Menit
        <input
          type="number"
          min={1}
          step={1}
          inputMode="numeric"
          value={minutes}
          onChange={(e) => setMinutes(e.target.value)}
          className="mt-1 w-full rounded-md border-2 border-slate-400 bg-white px-3 py-2.5 font-mono text-base outline-none ring-blue-600 focus:ring-2"
        />
      </label>
      {error && <p className={alertError}>{error}</p>}
      {msg && <p className={alertOk}>{msg}</p>}
      <button
        type="button"
        disabled={loading}
        onClick={() => void save()}
        className={btnPrimary}
      >
        {loading ? "Menyimpan…" : "Simpan"}
      </button>
    </div>
  );
}
