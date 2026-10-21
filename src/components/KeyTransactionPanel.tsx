"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { IconGive, IconTake } from "@/components/Icons";
import { Modal } from "@/components/Modal";
import { normalizeScanOrCode } from "@/lib/scan-token";
import { btnCancel, btnPrimary, btnSuccess, toolbarGroup } from "@/lib/ui";

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

type BarcodeDetectorLike = {
  detect: (
    source: ImageBitmapSource
  ) => Promise<Array<{ rawValue?: string }>>;
};

function getBarcodeDetector():
  | (new (opts?: { formats?: string[] }) => BarcodeDetectorLike)
  | null {
  if (typeof window === "undefined") return null;
  const BD = (
    window as unknown as {
      BarcodeDetector?: new (opts?: {
        formats?: string[];
      }) => BarcodeDetectorLike;
    }
  ).BarcodeDetector;
  return BD ?? null;
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
  /** Setelah scan QR: kunci terdeteksi, input manual disembunyikan. */
  const [detectedCode, setDetectedCode] = useState<string | null>(null);
  const [fromScan, setFromScan] = useState(false);

  const stopScan = useCallback(() => {
    if (scanTimer.current != null) {
      window.clearInterval(scanTimer.current);
      scanTimer.current = null;
    }
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
        setError(json.error || "QR tidak dikenali sebagai kunci.");
        setFromScan(false);
        setDetectedCode(null);
        return;
      }
      setDetectedCode(json.data.code);
      setFromScan(true);
      setMsg(`Kunci ${json.data.code} terdeteksi dari QR.`);
      setError(null);
    } catch {
      setError("Gagal mengenali QR. Coba lagi atau isi kode manual.");
    }
  }

  async function startScan() {
    setError(null);
    setScanHint(null);
    const BD = getBarcodeDetector();
    if (!BD) {
      setScanHint(
        "Peramban ini tidak mendukung scan QR. Isi kode kunci secara manual."
      );
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setScanHint("Kamera tidak tersedia. Isi kode kunci secara manual.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      streamRef.current = stream;
      setScanning(true);
      await new Promise((r) => requestAnimationFrame(() => r(null)));
      const video = videoRef.current;
      if (!video) {
        stopScan();
        setScanHint("Kamera gagal dibuka.");
        return;
      }
      video.srcObject = stream;
      await video.play();
      const detector = new BD({
        formats: ["qr_code"],
      });
      scanTimer.current = window.setInterval(async () => {
        if (!videoRef.current || videoRef.current.readyState < 2) return;
        try {
          const codes = await detector.detect(videoRef.current);
          const raw = codes[0]?.rawValue;
          if (raw) {
            stopScan();
            void applyScannedRaw(raw);
          }
        } catch {
          /* frame skip */
        }
      }, 400);
    } catch {
      stopScan();
      setScanHint(
        "Tidak bisa mengakses kamera. Izinkan kamera atau isi kode manual."
      );
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
          setError(json.error || "Gagal mencatat pinjam.");
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
          setError(json.error || "Gagal mencatat pengembalian.");
          return;
        }
        setMsg(`Kunci ${json.data?.keyCode} sudah dicatat kembali.`);
      }
      setPin("");
      router.refresh();
    } catch {
      setError("Tidak bisa terhubung. Coba lagi.");
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
          <p className="mb-3 text-base text-slate-600">Isi data, lalu PIN 6 angka.</p>
          <div className="space-y-3">
            <div>
              {fromScan && detectedCode ? (
                <div className="rounded-md border-2 border-emerald-400 bg-emerald-50 px-3 py-3">
                  <p className="text-sm font-semibold text-emerald-900">
                    Kunci terdeteksi (QR)
                  </p>
                  <p className="mt-1 font-mono text-xl font-bold text-emerald-950">
                    {detectedCode}
                  </p>
                  <button
                    type="button"
                    onClick={clearScanLock}
                    className="mt-2 text-sm font-semibold text-blue-800 underline"
                  >
                    Batalkan scan — isi kode manual
                  </button>
                </div>
              ) : (
                <label className="block text-sm font-semibold text-slate-800">
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
                    className="rounded-md border-2 border-slate-400 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-100"
                  >
                    Scan QR
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={stopScan}
                    className="rounded-md border-2 border-rose-300 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-800"
                  >
                    Hentikan kamera
                  </button>
                )}
              </div>
              {scanHint && (
                <p className="mt-2 text-sm text-amber-900">{scanHint}</p>
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
              <div className="space-y-2">
                <label className="block text-sm text-slate-700">
                  Cari peminjam
                  <input
                    value={borrowerQ}
                    onChange={(e) => {
                      setBorrowerQ(e.target.value);
                      setSelectedBorrower("");
                    }}
                    placeholder="Ketik nama…"
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-blue-600 focus:ring-2"
                  />
                </label>
                {!newBorrower && borrowers.length > 0 && (
                  <ul className="max-h-36 overflow-auto rounded-md border border-slate-200 text-sm">
                    {borrowers.map((b) => (
                      <li key={b.id}>
                        <button
                          type="button"
                          className={
                            selectedBorrower === b.name
                              ? "w-full bg-blue-50 px-3 py-2 text-left font-medium text-blue-900"
                              : "w-full px-3 py-2 text-left hover:bg-slate-50"
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
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={newBorrower}
                    onChange={(e) => setNewBorrower(e.target.checked)}
                  />
                  Nama belum ada — simpan sebagai peminjam baru
                </label>
                {newBorrower && (
                  <label className="block text-sm text-slate-700">
                    Divisi / keterangan (opsional)
                    <input
                      value={newDivisi}
                      onChange={(e) => setNewDivisi(e.target.value)}
                      placeholder="contoh: IST, DRIVER"
                      className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    />
                  </label>
                )}
              </div>
            )}

            <label className="block text-sm text-slate-700">
              PIN akun (6 angka)
              <input
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={pin}
                onChange={(e) =>
                  setPin(e.target.value.replace(/\D/g, "").slice(0, 6))
                }
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-sm tracking-widest outline-none ring-blue-600 focus:ring-2"
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
