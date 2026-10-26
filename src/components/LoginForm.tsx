"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  DEMO_ACCOUNTS,
  DEMO_PASSWORD,
  DEMO_PIN,
} from "@/lib/roles";
import { UI_MSG, uiAlert, uiApiAlert } from "@/lib/public-error";

export function LoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const json = (await res.json()) as { ok: boolean; error?: string };
      if (!json.ok) {
        uiApiAlert(setError, UI_MSG.loginFail, res, json);
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      uiAlert(setError, UI_MSG.network, err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-8 space-y-4">
      <form className="space-y-4" onSubmit={onSubmit}>
        <label className="block text-base font-semibold text-slate-800">
          ID petugas
          <input
            name="username"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="contoh: sec01"
            className="mt-1 w-full rounded-md border-2 border-slate-400 bg-white px-3 py-2.5 font-mono text-base text-slate-900 outline-none ring-blue-500 focus:ring-2"
            required
          />
        </label>
        <label className="block text-base font-semibold text-slate-800">
          Password
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password akun"
            className="mt-1 w-full rounded-md border-2 border-slate-400 bg-white px-3 py-2.5 text-base text-slate-900 outline-none ring-blue-500 focus:ring-2"
            required
          />
        </label>
        {error && (
          <p className="rounded-md border-2 border-rose-300 bg-rose-50 px-3 py-2 text-base text-rose-900">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={loading || !password}
          className="w-full rounded-md bg-blue-700 px-4 py-3 text-base font-bold text-white hover:bg-blue-800 disabled:opacity-50"
        >
          {loading ? "Memeriksa…" : "Masuk"}
        </button>
      </form>

      <div className="rounded-md border-2 border-slate-300 bg-slate-50 px-3 py-3 text-base text-slate-700">
        <p className="font-bold text-slate-900">Akun uji (demo)</p>
        <ul className="mt-2 space-y-1 font-mono text-base">
          {DEMO_ACCOUNTS.map((a) => (
            <li key={a.id}>
              <button
                type="button"
                className="text-left font-semibold text-blue-800 hover:underline"
                onClick={() => {
                  setUsername(a.id);
                  setPassword(DEMO_PASSWORD);
                }}
              >
                {a.id}
              </button>
              <span className="text-slate-600"> — {a.role}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-slate-700">
          Password default:{" "}
          <span className="font-mono font-semibold text-slate-900">
            {DEMO_PASSWORD}
          </span>
        </p>
        <p className="mt-1 text-slate-700">
          PIN transaksi (bukan password login):{" "}
          <span className="font-mono font-semibold text-slate-900">
            {DEMO_PIN}
          </span>
        </p>
      </div>
    </div>
  );
}
