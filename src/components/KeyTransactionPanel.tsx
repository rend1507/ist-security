"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { IconGive, IconTake } from "@/components/Icons";
import { Modal } from "@/components/Modal";
import { UI_MSG, uiAlert, uiApiAlert } from "@/lib/public-error";
import {
  canUseCamera,
  detectQrFromFile,
  detectQrFromVideo,
} from "@/lib/qr-scan";
import { normalizeScanOrCode } from "@/lib/scan-token";
import {
  alertError,
  alertOk,
  btnCancel,
  btnPrimary,
  btnSuccess,
  textLabel,
  toolbarGroup,
} from "@/lib/ui";

type Borrower = {
  id: number;
  name: string;
  display_name: string;
  divisi: string;
};

type Mode = "take" | "give" | null;

function normalizeKeyCode(raw: string) {
  return normalizeScanOrCode(raw);
}

export function KeyTransactionPanel({
  initialKeyCode = "",
  initialMode = null as Mode,
  openGiveCode = null,
  onOpenGiveHandled,
}: {
  initialKeyCode?: string;
  initialMode?: Mode;
  /** Buka popup kembalikan dengan kode terisi (dari baris tabel). */
  openGiveCode?: string | null;
  onOpenGiveHandled?: () => void;
}) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanTimer = useRef<number | null>(null);
  const scanBusy = useRef(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [open, setOpen] = useState(Boolean(initialMode));
  const [mode, setMode] = useState<Mode>(initialMode);
  const [keyCode, setKeyCode] = useState(initialKeyCode);
  const [pin, setPin] = useState("");
  const [borrowerQ, setBorrowerQ] = useState("");
  const [borrowers, setBorrowers] = useState<Borrower[]>([]);
  const [selectedBorrower, setSelectedBorrower] = useState("");
  const [newBorrower, setNewBorrower] = useState(false);
  const [newDivisi, setNewDivisi] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanHint, setScanHint] = useState<string | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  /** Setelah scan QR: kunci terdeteksi, input manual disembunyikan. */
  const [detectedCode, setDetectedCode] = useState<string | null>(null);
  const [fromScan, setFromScan] = useState(false);

  const stopScan = useCallback(() => {
    if (scanTimer.current != null) {
      window.clearInterval(scanTimer.current);
      scanTimer.current = null;
    }
    scanBusy.current = false;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setScanning(false);
  }, []);

  useEffect(() => () => stopScan(), [stopScan]);

  const searchBorrowers = useCallback(async (q: string) => {
    const res = await fetch(`/api/borrowers?q=${encodeURIComponent(q)}`);
    const json = (await res.json()) as { ok: boolean; data?: Borrower[] };
    if (json.ok) setBorrowers(json.data ?? []);
  }, []);

  useEffect(() => {
    if (mode === "take") {
      const t = window.setTimeout(() => searchBorrowers(borrowerQ), 200);
      return () => window.clearTimeout(t);
    }
  }, [borrowerQ, mode, searchBorrowers]);

  function start(m: Mode, prefillCode = "") {
    setMode(m);
    setOpen(true);
    setKeyCode(prefillCode ? normalizeKeyCode(prefillCode) : "");
    setDetectedCode(prefillCode ? normalizeKeyCode(prefillCode) : null);
    setFromScan(false);
    setPin("");
    setMsg(null);
    setError(null);
    setScanHint(null);
    setNewBorrower(false);
    setSelectedBorrower("");
    setBorrowerQ("");
    stopScan();
  }

  function clearScanLock() {
    setFromScan(false);
    setDetectedCode(null);
    setKeyCode("");
  }

  useEffect(() => {
    if (!openGiveCode) return;
    start("give", openGiveCode);
    onOpenGiveHandled?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- trigger once per code
  }, [openGiveCode]);

  async function applyScannedRaw(raw: string) {
    const token = normalizeKeyCode(raw);
    setKeyCode(token);
    try {
      const res = await fetch(
        `/api/keys?mode=resolve&q=${encodeURIComponent(token)}`
      );
      const json = (await res.json()) as {
        ok: boolean;
        data?: { code: string };
        error?: string;
      };
      if (!json.ok || !json.data) {
        uiApiAlert(setError, "QR tidak dikenali.", res, json);
        setFromScan(false);
        setDetectedCode(null);
        return;
      }
      setDetectedCode(json.data.code);
      setFromScan(true);
      setMsg(`Kunci ${json.data.code} terdeteksi dari QR.`);
      setError(null);
    } catch (err) {
      uiAlert(setError, "Gagal mengenali QR. Coba lagi.", err);
    }
  }

  async function startScan() {
    setError(null);
    setScanHint(null);
    if (!canUseCamera()) {
      setScanHint(
        "Kamera tidak tersedia di peramban ini (butuh HTTPS). Pakai Foto QR atau isi kode manual."
      );
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      streamRef.current = stream;
      setScanning(true);
      setScanHint(
        "Arahkan kamera ke QR. Bisa di browser HP biasa (Safari/Chrome) atau ikon di layar utama."
      );
      await new Promise((r) => requestAnimationFrame(() => r(null)));
      const video = videoRef.current;
      if (!video) {
        stopScan();
        setScanHint("Kamera gagal dibuka.");
        return;
      }
      video.setAttribute("playsinline", "true");
      video.setAttribute("webkit-playsinline", "true");
      video.muted = true;
      video.srcObject = stream;
      await video.play();
      scanBusy.current = false;
      scanTimer.current = window.setInterval(async () => {
        if (!videoRef.current || videoRef.current.readyState < 2) return;
        if (scanBusy.current) return;
        scanBusy.current = true;
        try {
          const raw = await detectQrFromVideo(videoRef.current);
          if (raw) {
            stopScan();
            void applyScannedRaw(raw);
          }
        } catch {
          /* frame skip */
        } finally {
          scanBusy.current = false;
        }
      }, 350);
    } catch {
      stopScan();
      setScanHint(
        "Tidak bisa mengakses kamera. Izinkan kamera, pakai Foto QR, atau isi kode manual."
      );
    }
  }

  async function onPhotoSelected(file: File | null) {
    if (!file) return;
    setError(null);
    setScanHint(null);
    setPhotoBusy(true);
    stopScan();
    try {
      const raw = await detectQrFromFile(file);
      if (!raw) {
        setScanHint(
          "QR belum terbaca. Dekatkan label, cahaya cukup, isi frame dengan QR saja — atau ketik kode manual."
        );
        return;
      }
      await applyScannedRaw(raw);
    } catch (err) {
      const detail =
        err instanceof Error && err.message
          ? err.message
          : "Gagal membaca foto QR. Coba JPEG/PNG atau Scan QR.";
      setError(detail);
    } finally {
      setPhotoBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function submit() {
    setError(null);
    setMsg(null);
    if (pin.length !== 6) {
      setError("PIN akun harus 6 angka.");
      return;
    }
    if (!keyCode.trim()) {
      setError("Isi kode kunci (contoh SEC1) atau hasil scan.");
      return;
    }
    setLoading(true);
    try {
      if (mode === "take") {
        const name = newBorrower
          ? borrowerQ.trim()
          : selectedBorrower.trim();
        if (!name) {
          setError("Pilih atau tambah nama peminjam.");
          setLoading(false);
          return;
        }
        const res = await fetch("/api/transactions/take-out", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pin,
            keyCode,
            borrowerName: name,
            borrowerDivisi: newBorrower ? newDivisi : undefined,
          }),
        });
        const json = (await res.json()) as {
          ok: boolean;
          error?: string;
          data?: { keyCode: string; takeOutAt: string; borrower: string };
        };
        if (!json.ok) {
          uiApiAlert(setError, UI_MSG.generic, res, json);
          return;
        }
        setMsg(
          `Kunci ${json.data?.keyCode} dicatat dipinjam oleh ${json.data?.borrower}. Jam otomatis dari perangkat.`
        );
      } else if (mode === "give") {
        const res = await fetch("/api/transactions/give-back", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pin, keyCode }),
        });
        const json = (await res.json()) as {
          ok: boolean;
          error?: string;
          data?: { keyCode: string };
        };
        if (!json.ok) {
          uiApiAlert(setError, UI_MSG.generic, res, json);
          return;
        }
        setMsg(`Kunci ${json.data?.keyCode} sudah dicatat kembali.`);
      }
      setPin("");
      router.refresh();
    } catch (err) {
      uiAlert(setError, UI_MSG.network, err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className={toolbarGroup}>
        <button type="button" onClick={() => start("take")} className={btnPrimary}>
          <IconTake />
          Catat pinjam kunci
        </button>
        <button type="button" onClick={() => start("give")} className={btnSuccess}>
          <IconGive />
          Catat kunci kembali
        </button>
      </div>

      {open && mode && (
        <Modal
          title={mode === "take" ? "Pinjam kunci" : "Kembalikan kunci"}
          onClose={() => {
            stopScan();
            setOpen(false);
          }}
          wide
        >
          <p className="mb-3 text-base text-slate-700">
            Isi data di bawah. Di akhir isi{" "}
            <span className="font-bold text-slate-900">PIN 6 angka</span>
            {" "}(bukan password login).
          </p>
          <div className="space-y-3">
            <div>
              {fromScan && detectedCode ? (
                <div className="rounded-md border-2 border-emerald-500 bg-emerald-50 px-3 py-3">
                  <p className="text-base font-bold text-emerald-950">
                    Kunci terdeteksi (QR)
                  </p>
                  <p className="mt-1 font-mono text-2xl font-bold text-emerald-950">
                    {detectedCode}
                  </p>
                  <button
                    type="button"
                    onClick={clearScanLock}
                    className="mt-2 text-base font-semibold text-blue-800 underline"
                  >
                    Batalkan scan — isi kode manual
                  </button>
                </div>
              ) : (
                <label className={textLabel}>
                  Kode kunci (manual)
                  <input
                    value={keyCode}
                    onChange={(e) =>
                      setKeyCode(normalizeKeyCode(e.target.value))
                    }
                    placeholder="Contoh: SEC1"
                    className="mt-1 w-full rounded-md border-2 border-slate-400 px-3 py-2.5 font-mono text-base outline-none ring-blue-600 focus:ring-2"
                  />
                </label>
              )}
              <div className="mt-2 flex flex-wrap gap-2">
                {!scanning ? (
                  <button
                    type="button"
                    onClick={startScan}
                    className="min-h-12 rounded-md border-2 border-slate-400 bg-slate-50 px-4 py-2.5 text-base font-semibold text-slate-800 hover:bg-slate-100"
                  >
                    Scan QR
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={stopScan}
                    className="min-h-12 rounded-md border-2 border-rose-400 bg-rose-50 px-4 py-2.5 text-base font-semibold text-rose-900"
                  >
                    Hentikan kamera
                  </button>
                )}
                <button
                  type="button"
                  disabled={photoBusy}
                  onClick={() => fileInputRef.current?.click()}
                  className="min-h-12 rounded-md border-2 border-slate-400 bg-white px-4 py-2.5 text-base font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-60"
                >
                  {photoBusy ? "Membaca foto…" : "Foto QR"}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/*"
                  className="sr-only"
                  onChange={(e) =>
                    void onPhotoSelected(e.target.files?.[0] ?? null)
                  }
                />
              </div>
              {scanHint && (
                <p className="mt-2 text-base font-semibold text-amber-950">
                  {scanHint}
                </p>
              )}
              {scanning && (
                <video
                  ref={videoRef}
                  className="mt-2 max-h-56 w-full rounded-md bg-black object-cover"
                  muted
                  playsInline
                />
              )}
            </div>

            {mode === "take" && (
              <div className="space-y-2 rounded-lg border-2 border-emerald-600 bg-emerald-50 p-3">
                <p className="text-base font-bold text-emerald-950">
                  Nama peminjam
                </p>
                <p className="text-base text-emerald-950">
                  Pilih dari daftar, atau centang di bawah jika nama baru.
                  Daftar lengkap juga di menu{" "}
                  <span className="font-bold">Data peminjam</span>.
                </p>
                <label className="block text-base font-semibold text-slate-900">
                  Cari peminjam
                  <input
                    value={borrowerQ}
                    onChange={(e) => {
                      setBorrowerQ(e.target.value);
                      setSelectedBorrower("");
                    }}
                    placeholder="Ketik nama…"
                    className="mt-1 w-full rounded-md border-2 border-emerald-600 bg-white px-3 py-2.5 text-base outline-none ring-emerald-600 focus:ring-2"
                  />
                </label>
                {!newBorrower && borrowers.length > 0 && (
                  <ul className="max-h-36 overflow-auto rounded-md border-2 border-emerald-300 bg-white text-base">
                    {borrowers.map((b) => (
                      <li key={b.id}>
                        <button
                          type="button"
                          className={
                            selectedBorrower === b.name
                              ? "w-full bg-emerald-100 px-3 py-2.5 text-left font-bold text-emerald-950"
                              : "w-full px-3 py-2.5 text-left hover:bg-emerald-50"
                          }
                          onClick={() => {
                            setSelectedBorrower(b.name);
                            setBorrowerQ(b.name);
                          }}
                        >
                          {b.name}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <label
                  className={`flex cursor-pointer items-start gap-3 rounded-md border-2 px-3 py-3 text-base font-semibold ${
                    newBorrower
                      ? "border-emerald-700 bg-emerald-200 text-emerald-950"
                      : "border-emerald-400 bg-white text-slate-900"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="mt-1 h-5 w-5 accent-emerald-700"
                    checked={newBorrower}
                    onChange={(e) => setNewBorrower(e.target.checked)}
                  />
                  <span>
                    Nama belum ada di daftar —{" "}
                    <span className="underline">tambah sebagai peminjam baru</span>
                  </span>
                </label>
                {newBorrower && (
                  <label className="block text-base font-semibold text-slate-900">
                    Divisi / keterangan (opsional)
                    <input
                      value={newDivisi}
                      onChange={(e) => setNewDivisi(e.target.value)}
                      placeholder="contoh: IST, DRIVER"
                      className="mt-1 w-full rounded-md border-2 border-emerald-600 bg-white px-3 py-2.5 text-base uppercase"
                    />
                  </label>
                )}
              </div>
            )}

            <div className="rounded-lg border-2 border-blue-600 bg-blue-50 p-3">
              <label className="block text-base font-bold text-blue-950">
                PIN 6 angka (wajib tiap aksi)
                <span className="mt-1 block text-base font-semibold text-blue-900">
                  Bukan password login. Hanya angka, contoh demo: 123456
                </span>
                <input
                  type="password"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={pin}
                  onChange={(e) =>
                    setPin(e.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  placeholder="••••••"
                  className="mt-2 w-full rounded-md border-2 border-blue-700 bg-white px-3 py-3 font-mono text-lg tracking-[0.35em] outline-none ring-blue-600 focus:ring-2"
                />
              </label>
            </div>

            {error && <p className={alertError}>{error}</p>}
            {msg && <p className={alertOk}>{msg}</p>}

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={loading}
                onClick={submit}
                className={btnPrimary}
              >
                {loading ? "Menyimpan…" : "Simpan"}
              </button>
              <button
                type="button"
                onClick={() => {
                  stopScan();
                  setOpen(false);
                }}
                className={btnCancel}
              >
                Batal
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
