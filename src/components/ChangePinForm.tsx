"use client";

import { useState } from "react";
import { btnPrimary } from "@/lib/ui";

export function ChangePinForm({ isSuperadmin }: { isSuperadmin: boolean }) {
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [targetUsername, setTargetUsername] = useState("");
  const [forOther, setForOther] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setError(null);
    if (newPin !== confirmPin) {
      setError("PIN baru dan konfirmasi tidak sama.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/change-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          forOther && isSuperadmin
            ? { newPin, targetUsername }
            : { currentPin, newPin }
        ),
      });
      const json = (await res.json()) as {
        ok: boolean;
        error?: string;
        data?: { message: string };
      };
      if (!json.ok) {
        setError(json.error || "Gagal mengubah PIN.");
        return;
      }
      setMsg(json.data?.message || "PIN diubah.");
      setCurrentPin("");
      setNewPin("");
      setConfirmPin("");
    } catch {
      setError("Tidak bisa terhubung.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      {isSuperadmin && (
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={forOther}
            onChange={(e) => setForOther(e.target.checked)}
          />
          Ganti PIN petugas lain (Super Admin)
        </label>
      )}
      {forOther && isSuperadmin ? (
        <label className="block text-sm">
          ID petugas
          <input
            value={targetUsername}
            onChange={(e) => setTargetUsername(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-sm"
            required
          />
        </label>
      ) : (
        <label className="block text-sm">
          PIN lama
          <input
            type="password"
            inputMode="numeric"
            maxLength={6}
            value={currentPin}
            onChange={(e) =>
              setCurrentPin(e.target.value.replace(/\D/g, "").slice(0, 6))
            }
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 font-mono tracking-widest"
            required
          />
        </label>
      )}
      <label className="block text-sm">
        PIN baru (6 angka)
        <input
          type="password"
          inputMode="numeric"
          maxLength={6}
          value={newPin}
          onChange={(e) =>
            setNewPin(e.target.value.replace(/\D/g, "").slice(0, 6))
          }
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 font-mono tracking-widest"
          required
        />
      </label>
      <label className="block text-sm">
        Ulangi PIN baru
        <input
          type="password"
          inputMode="numeric"
          maxLength={6}
          value={confirmPin}
          onChange={(e) =>
            setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 6))
          }
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 font-mono tracking-widest"
          required
        />
      </label>
      {error && (
        <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {error}
        </p>
      )}
      {msg && (
        <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          {msg}
        </p>
      )}
      <button type="submit" disabled={loading} className={btnPrimary}>
        {loading ? "Menyimpan…" : "Simpan"}
      </button>
    </form>
  );
}
