"use client";

import { useCallback, useEffect, useState } from "react";
import { OverdueSettingsForm } from "@/components/OverdueSettingsForm";
import {
  ASSIGNABLE_ROLES,
  ROLE_LABELS,
  type Role,
} from "@/lib/roles";
import { UI_MSG, uiAlert, uiApiAlert } from "@/lib/public-error";
import { Modal } from "@/components/Modal";
import {
  alertError,
  alertOk,
  btnDanger,
  btnGhost,
  btnNeutral,
  btnPrimary,
  btnRow,
  inputBase,
  pillActive,
  pillIdle,
  tableHead,
  textLabel,
} from "@/lib/ui";

type UserRow = {
  id: number;
  username: string;
  name: string;
  role: string;
  role_label: string;
};

export function SuperadminPanel({
  currentUserId,
  showUsersTab = true,
}: {
  currentUserId: number;
  /** false = hanya batas terlambat (Admin); true = + akun petugas (Super Admin) */
  showUsersTab?: boolean;
}) {
  const [tab, setTab] = useState<"overdue" | "users">("overdue");
  const [users, setUsers] = useState<UserRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [uUser, setUUser] = useState("");
  const [uName, setUName] = useState("");
  const [uRole, setURole] = useState<Role>("security");
  const [uPass, setUPass] = useState("");
  const [uPin, setUPin] = useState("123456");
  const [resetUser, setResetUser] = useState<UserRow | null>(null);
  const [resetKind, setResetKind] = useState<"password" | "pin" | null>(null);
  const [resetValue, setResetValue] = useState("");
  const [resetConfirm, setResetConfirm] = useState("");
  const [resetLoading, setResetLoading] = useState(false);

  const activeTab = showUsersTab ? tab : "overdue";

  const loadUsers = useCallback(async () => {
    if (!showUsersTab || activeTab !== "users") return;
    setError(null);
    try {
      const res = await fetch("/api/users");
      const json = (await res.json()) as {
        ok: boolean;
        data?: UserRow[];
        error?: string;
      };
      if (!json.ok) {
        uiApiAlert(setError, UI_MSG.load, res, json);
        return;
      }
      setUsers(json.data ?? []);
    } catch (e) {
      uiAlert(setError, UI_MSG.load, e);
    }
  }, [activeTab, showUsersTab]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  async function addUser() {
    setLoading(true);
    setError(null);
    setMsg(null);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: uUser,
          name: uName,
          role: uRole,
          password: uPass,
          pin: uPin,
        }),
      });
      const json = (await res.json()) as { ok: boolean; error?: string };
      if (!json.ok) {
        uiApiAlert(setError, UI_MSG.save, res, json);
        return;
      }
      setMsg("Akun petugas ditambahkan.");
      setUUser("");
      setUName("");
      setUPass("");
      setUPin("123456");
      await loadUsers();
    } finally {
      setLoading(false);
    }
  }

  function openReset(user: UserRow, kind: "password" | "pin") {
    setResetUser(user);
    setResetKind(kind);
    setResetValue("");
    setResetConfirm("");
    setError(null);
    setMsg(null);
  }

  async function saveReset() {
    if (!resetUser || !resetKind) return;
    if (resetValue !== resetConfirm) {
      setError(
        resetKind === "pin"
          ? "PIN baru dan konfirmasi tidak sama."
          : "Password baru dan konfirmasi tidak sama."
      );
      return;
    }
    setResetLoading(true);
    setError(null);
    setMsg(null);
    try {
      const body =
        resetKind === "pin"
          ? { id: resetUser.id, pin: resetValue }
          : { id: resetUser.id, password: resetValue };
      const res = await fetch("/api/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json()) as { ok: boolean; error?: string };
      if (!json.ok) {
        uiApiAlert(setError, UI_MSG.save, res, json);
        return;
      }
      setMsg(
        resetKind === "pin"
          ? `PIN ${resetUser.username} diubah.`
          : `Password ${resetUser.username} diubah.`
      );
      setResetUser(null);
      setResetKind(null);
    } catch (e) {
      uiAlert(setError, UI_MSG.network, e);
    } finally {
      setResetLoading(false);
    }
  }

  async function deactivate(id: number) {
    if (!window.confirm("Nonaktifkan akun ini?")) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, deactivate: true }),
      });
      const json = (await res.json()) as { ok: boolean; error?: string };
      if (!json.ok) {
        uiApiAlert(setError, UI_MSG.generic, res, json);
        return;
      }
      setMsg("Akun dinonaktifkan.");
      await loadUsers();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {showUsersTab && (
        <div className="flex flex-wrap gap-2 rounded-lg border-2 border-slate-300 bg-slate-100 p-2">
          <button
            type="button"
            onClick={() => setTab("overdue")}
            className={activeTab === "overdue" ? pillActive : pillIdle}
          >
            Batas terlambat
          </button>
          <button
            type="button"
            onClick={() => setTab("users")}
            className={activeTab === "users" ? pillActive : pillIdle}
          >
            Akun petugas
          </button>
        </div>
      )}

      {activeTab === "overdue" ? (
        <OverdueSettingsForm
          onSaved={() => {
            window.setTimeout(() => {
              window.location.reload();
            }, 400);
          }}
        />
      ) : (
        <div className="space-y-4">
          {error && <p className={alertError}>{error}</p>}
          {msg && <p className={alertOk}>{msg}</p>}
          <ul className="list-inside list-disc space-y-1 text-base text-amber-950">
            <li>Tidak bisa menambah Super Admin lewat aplikasi</li>
            <li>Tidak bisa menonaktifkan akun Super Admin (termasuk sendiri)</li>
            <li>Password dan PIN semua akun (termasuk Super Admin) bisa diganti dari daftar</li>
          </ul>
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="block text-base font-semibold">
              ID
              <input
                value={uUser}
                onChange={(e) => setUUser(e.target.value)}
                className="mt-1 w-full rounded-md border-2 border-slate-400 px-3 py-2 font-mono text-base"
              />
            </label>
            <label className="block text-base font-semibold">
              Nama
              <input
                value={uName}
                onChange={(e) => setUName(e.target.value)}
                className="mt-1 w-full rounded-md border-2 border-slate-400 px-3 py-2 text-base"
              />
            </label>
            <label className="block text-base font-semibold">
              Peran
              <select
                value={uRole}
                onChange={(e) => setURole(e.target.value as Role)}
                className="mt-1 w-full rounded-md border-2 border-slate-400 px-3 py-2 text-base"
              >
                {ASSIGNABLE_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-base font-semibold">
              Password awal
              <input
                type="password"
                value={uPass}
                onChange={(e) => setUPass(e.target.value)}
                className="mt-1 w-full rounded-md border-2 border-slate-400 px-3 py-2 text-base"
              />
            </label>
            <label className="block text-base font-semibold">
              PIN awal (6 angka)
              <input
                type="password"
                inputMode="numeric"
                autoComplete="new-password"
                maxLength={6}
                value={uPin}
                onChange={(e) =>
                  setUPin(e.target.value.replace(/\D/g, "").slice(0, 6))
                }
                className="mt-1 w-full rounded-md border-2 border-slate-400 px-3 py-2 font-mono text-base tracking-widest"
              />
            </label>
          </div>
          <button
            type="button"
            disabled={loading}
            onClick={addUser}
            className={btnNeutral}
          >
            Tambah akun
          </button>

          <div className="overflow-x-auto rounded-md border-2 border-slate-300">
            <table className="min-w-full text-left text-base">
              <thead className={tableHead}>
                <tr>
                  <th className="px-3 py-2.5">ID</th>
                  <th className="px-3 py-2.5">Nama</th>
                  <th className="px-3 py-2.5">Peran</th>
                  <th className="px-3 py-2.5">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const locked =
                    u.role === "superadmin" || u.id === currentUserId;
                  return (
                    <tr key={u.id} className="border-t border-slate-200">
                      <td className="px-3 py-2.5 font-mono text-base">
                        {u.username}
                      </td>
                      <td className="px-3 py-2.5 text-base">{u.name}</td>
                      <td className="px-3 py-2.5 text-base">{u.role_label}</td>
                      <td className="px-3 py-2.5">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            className={`${btnGhost} ${btnRow}`}
                            onClick={() => openReset(u, "password")}
                          >
                            Password
                          </button>
                          <button
                            type="button"
                            className={`${btnGhost} ${btnRow}`}
                            onClick={() => openReset(u, "pin")}
                          >
                            PIN
                          </button>
                          {locked ? null : (
                            <button
                              type="button"
                              className={`${btnDanger} ${btnRow}`}
                              onClick={() => deactivate(u.id)}
                            >
                              Nonaktifkan
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {resetUser && resetKind && (
        <Modal
          title={
            resetKind === "pin"
              ? `Ganti PIN · ${resetUser.username}`
              : `Ganti password · ${resetUser.username}`
          }
          onClose={() => {
            setResetUser(null);
            setResetKind(null);
          }}
        >
          <label className={textLabel}>
            {resetKind === "pin" ? "PIN baru (6 angka)" : "Password baru"}
            <input
              type="password"
              inputMode={resetKind === "pin" ? "numeric" : undefined}
              maxLength={resetKind === "pin" ? 6 : undefined}
              autoComplete="new-password"
              value={resetValue}
              onChange={(e) =>
                setResetValue(
                  resetKind === "pin"
                    ? e.target.value.replace(/\D/g, "").slice(0, 6)
                    : e.target.value
                )
              }
              className={`${inputBase} ${resetKind === "pin" ? "font-mono tracking-[0.35em]" : ""}`}
            />
          </label>
          <label className={textLabel}>
            {resetKind === "pin" ? "Ulangi PIN baru" : "Ulangi password baru"}
            <input
              type="password"
              inputMode={resetKind === "pin" ? "numeric" : undefined}
              maxLength={resetKind === "pin" ? 6 : undefined}
              autoComplete="new-password"
              value={resetConfirm}
              onChange={(e) =>
                setResetConfirm(
                  resetKind === "pin"
                    ? e.target.value.replace(/\D/g, "").slice(0, 6)
                    : e.target.value
                )
              }
              className={`${inputBase} ${resetKind === "pin" ? "font-mono tracking-[0.35em]" : ""}`}
            />
          </label>
          {error && <p className={alertError}>{error}</p>}
          <button
            type="button"
            disabled={resetLoading}
            onClick={() => void saveReset()}
            className={btnPrimary}
          >
            {resetLoading ? "Menyimpan…" : "Simpan"}
          </button>
        </Modal>
      )}
    </div>
  );
}
