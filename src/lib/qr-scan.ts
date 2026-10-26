/**
 * Decode QR di peramban HP/desktop.
 * Chrome: BarcodeDetector bila tersedia.
 * Safari/iOS/Firefox: jsQR dari frame kamera atau foto.
 * Tidak bergantung PWA — jalan di tab browser biasa (HTTPS).
 */

import jsQR from "jsqr";

type BarcodeDetectorLike = {
  detect: (
    source: ImageBitmapSource
  ) => Promise<Array<{ rawValue?: string }>>;
};

function getBarcodeDetectorCtor():
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

export function canUseCamera(): boolean {
  return (
    typeof window !== "undefined" &&
    Boolean(navigator.mediaDevices?.getUserMedia) &&
    window.isSecureContext
  );
}

/** Downscale frame agar jsQR cepat di HP. */
function drawVideoToImageData(
  video: HTMLVideoElement,
  maxEdge = 480
): ImageData | null {
  const w = video.videoWidth;
  const h = video.videoHeight;
  if (!w || !h) return null;
  const scale = Math.min(1, maxEdge / Math.max(w, h));
  const cw = Math.max(1, Math.round(w * scale));
  const ch = Math.max(1, Math.round(h * scale));
  const canvas = document.createElement("canvas");
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(video, 0, 0, cw, ch);
  return ctx.getImageData(0, 0, cw, ch);
}

function decodeWithJsQR(imageData: ImageData): string | null {
  const code = jsQR(imageData.data, imageData.width, imageData.height, {
    inversionAttempts: "attemptBoth",
  });
  const raw = code?.data?.trim();
  return raw || null;
}

export async function detectQrFromVideo(
  video: HTMLVideoElement
): Promise<string | null> {
  const BD = getBarcodeDetectorCtor();
  if (BD) {
    try {
      const detector = new BD({ formats: ["qr_code"] });
      const codes = await detector.detect(video);
      const raw = codes[0]?.rawValue?.trim();
      if (raw) return raw;
    } catch {
      /* lanjut ke jsQR */
    }
  }
  const imageData = drawVideoToImageData(video);
  if (!imageData) return null;
  return decodeWithJsQR(imageData);
}

function imageDataFromBitmap(
  bitmap: ImageBitmap,
  maxEdge = 960
): ImageData | null {
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const cw = Math.max(1, Math.round(bitmap.width * scale));
  const ch = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(bitmap, 0, 0, cw, ch);
  return ctx.getImageData(0, 0, cw, ch);
}

/** Decode dari file/foto (kamera HP “Ambil foto” atau galeri). */
export async function detectQrFromFile(file: File): Promise<string | null> {
  const bitmap = await createImageBitmap(file);
  try {
    const BD = getBarcodeDetectorCtor();
    if (BD) {
      try {
        const detector = new BD({ formats: ["qr_code"] });
        const codes = await detector.detect(bitmap);
        const raw = codes[0]?.rawValue?.trim();
        if (raw) return raw;
      } catch {
        /* lanjut jsQR */
      }
    }
    const imageData = imageDataFromBitmap(bitmap);
    if (!imageData) return null;
    return decodeWithJsQR(imageData);
  } finally {
    bitmap.close();
  }
}
