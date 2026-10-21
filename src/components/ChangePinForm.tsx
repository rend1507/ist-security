"use client";

import { useState } from "react";
import {
  alertError,
  alertOk,
  btnPrimary,
  inputBase,
  textLabel,
} from "@/lib/ui";

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
        <label className="flex cursor-pointer items-start gap-3 text-base font-semibold text-slate-800">
          <input
            type="checkbox"
            className="mt-1 h-5 w-5 accent-blue-700"
            checked={forOther}
            onChange={(e) => setForOther(e.target.checked)}
          />
          Ganti PIN petugas lain (Super Admin)
        </label>
      )}
      {forOther && isSuperadmin ? (
        <label className={textLabel}>
          ID petugas
          <input
            value={targetUsername}
            onChange={(e) => setTargetUsername(e.target.value)}
            className={`${inputBase} font-mono`}
            required
          />
        </label>
      ) : (
        <label className={textLabel}>
          PIN lama
          <input
            type="password"
            inputMode="numeric"
            maxLength={6}
            value={currentPin}
            onChange={(e) =>
              setCurrentPin(e.target.value.replace(/\D/g, "").slice(0, 6))
            }
            className={`${inputBase} font-mono tracking-[0.35em]`}
            required
          />
        </label>
      )}
      <label className={textLabel}>
        PIN baru (6 angka)
        <input
          type="password"
          inputMode="numeric"
          maxLength={6}
          value={newPin}
          onChange={(e) =>
            setNewPin(e.target.value.replace(/\D/g, "").slice(0, 6))
          }
          className={`${inputBase} font-mono tracking-[0.35em]`}
          required
        />
      </label>
      <label className={textLabel}>
        Ulangi PIN baru
        <input
          type="password"
          inputMode="numeric"
          maxLength={6}
          value={confirmPin}
          onChange={(e) =>
            setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 6))
          }
          className={`${inputBase} font-mono tracking-[0.35em]`}
          required
        />
      </label>
      {error && <p className={alertError}>{error}</p>}
      {msg && <p className={alertOk}>{msg}</p>}
      <button type="submit" disabled={loading} className={btnPrimary}>
        {loading ? "Menyimpan…" : "Simpan"}
      </button>
    </form>
  );
}
