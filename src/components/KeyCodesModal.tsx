"use client";

import { useEffect, useRef, useState } from "react";
import JsBarcode from "jsbarcode";
import QRCode from "qrcode";
import { Modal } from "@/components/Modal";
import { btnNeutral } from "@/lib/ui";

export type KeyCodesInfo = {
  code: string;
  jenis: string;
  barcode: string;
};

export function KeyCodesModal({
  info,
  onClose,
}: {
  info: KeyCodesInfo;
  onClose: () => void;
}) {
  const qrRef = useRef<HTMLCanvasElement>(null);
  const barRef = useRef<SVGSVGElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function draw() {
      setError(null);
      try {
        if (qrRef.current) {
          await QRCode.toCanvas(qrRef.current, info.barcode, {
            width: 220,
            margin: 2,
            errorCorrectionLevel: "M",
          });
        }
        if (barRef.current) {
          JsBarcode(barRef.current, info.barcode, {
            format: "CODE128",
            width: 2,
            height: 72,
            displayValue: true,
            fontSize: 14,
            margin: 8,
          });
        }
      } catch (e) {
        if (!cancelled) {
          setError(
            e instanceof Error ? e.message : "Gagal menampilkan kode"
          );
        }
      }
    }
    void draw();
    return () => {
      cancelled = true;
    };
  }, [info.barcode]);

  return (
    <Modal title={`Kode kunci ${info.code}`} onClose={onClose} wide>
      <div className="space-y-4">
        <p className="text-base text-slate-700">
          Jenis: <span className="font-semibold">{info.jenis}</span>
        </p>
        <p className="text-sm text-slate-600">
          Scan menghasilkan kode acak. Website mengenali kunci dari token ini.
          Input manual tetap pakai kode{" "}
          <span className="font-mono font-bold">{info.code}</span>.
        </p>

        {error && (
          <p className="rounded-md border-2 border-rose-300 bg-rose-50 px-3 py-2 text-base text-rose-900">
            {error}
          </p>
        )}

        <div className="grid gap-6 sm:grid-cols-2">
          <div className="rounded-lg border-2 border-slate-300 bg-white p-4 text-center">
            <p className="mb-2 text-sm font-bold uppercase text-slate-700">
              QR Code
            </p>
            <canvas ref={qrRef} className="mx-auto" />
          </div>
          <div className="rounded-lg border-2 border-slate-300 bg-white p-4 text-center">
            <p className="mb-2 text-sm font-bold uppercase text-slate-700">
              Barcode
            </p>
            <svg ref={barRef} className="mx-auto max-w-full" />
          </div>
        </div>

        <p className="break-all font-mono text-xs text-slate-500">
          Token: {info.barcode}
        </p>

        <button type="button" onClick={onClose} className={btnNeutral}>
          Tutup
        </button>
      </div>
    </Modal>
  );
}
