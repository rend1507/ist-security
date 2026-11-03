"use client";

import { useState } from "react";
import { UI_MSG, uiAlert, uiApiAlert } from "@/lib/public-error";
import {
  alertError,
  alertOk,
  btnPrimary,
  inputBase,
  textLabel,
} from "@/lib/ui";

export function ChangePasswordForm({ isSuperadmin }: { isSuperadmin: boolean }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [targetUsername, setTargetUsername] = useState("");
  const [forOther, setForOther] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setError(null);
    if (newPassword !== confirmPassword) {
      setError("Password baru dan konfirmasi tidak sama.");
      return;
    }
    if (newPassword.trim().length < 6) {
      setError("Password baru minimal 6 karakter.");
      return;
    }
    setLoading(true);
    try {
      const useTarget = forOther && isSuperadmin;
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          useTarget
            ? { newPassword, targetUsername }
            : { currentPassword, newPassword }
        ),
      });
      const json = (await res.json()) as {
        ok: boolean;
        error?: string;
        data?: { message: string };
      };
      if (!json.ok) {
        uiApiAlert(setError, UI_MSG.generic, res, json);
        return;
      }
      setMsg(json.data?.message || "Password diubah.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      uiAlert(setError, UI_MSG.network, err);
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
          Ganti password petugas lain / diri sendiri tanpa password lama
        </label>
      )}
      {forOther && isSuperadmin ? (
        <label className={textLabel}>
          ID petugas
          <input
            value={targetUsername}
            onChange={(e) => setTargetUsername(e.target.value)}
            className={`${inputBase} font-mono`}
            autoComplete="username"
            required
          />
        </label>
      ) : (
        <label className={textLabel}>
          Password lama
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className={inputBase}
            autoComplete="current-password"
            required
          />
        </label>
      )}
      <label className={textLabel}>
        Password baru
        <input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className={inputBase}
          autoComplete="new-password"
          required
        />
      </label>
      <label className={textLabel}>
        Ulangi password baru
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className={inputBase}
          autoComplete="new-password"
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
