/**
 * Decode QR di peramban HP/desktop.
 * Chrome: BarcodeDetector bila tersedia.
 * Safari/iOS/Firefox: jsQR dari frame kamera atau foto.
 * Foto: multi-skala + grayscale — jsQR gagal di foto HP full-res.
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

function decodeWithJsQR(imageData: ImageData): string | null {
  const code = jsQR(imageData.data, imageData.width, imageData.height, {
    inversionAttempts: "attemptBoth",
  });
  const raw = code?.data?.trim();
  return raw || null;
}

/** Salin ke grayscale — kadang lebih mudah dibaca jsQR. */
function toGrayscale(imageData: ImageData): ImageData {
  const copy = new ImageData(
    new Uint8ClampedArray(imageData.data),
    imageData.width,
    imageData.height
  );
  const d = copy.data;
  for (let i = 0; i < d.length; i += 4) {
    const g = (d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114) | 0;
    d[i] = g;
    d[i + 1] = g;
    d[i + 2] = g;
  }
  return copy;
}

function tryJsQRVariants(imageData: ImageData): string | null {
  return (
    decodeWithJsQR(imageData) ?? decodeWithJsQR(toGrayscale(imageData))
  );
}

function drawSourceToImageData(
  source: CanvasImageSource,
  srcW: number,
  srcH: number,
  maxEdge: number
): ImageData | null {
  if (!srcW || !srcH) return null;
  const scale = Math.min(1, maxEdge / Math.max(srcW, srcH));
  const cw = Math.max(1, Math.round(srcW * scale));
  const ch = Math.max(1, Math.round(srcH * scale));
  const canvas = document.createElement("canvas");
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(source, 0, 0, cw, ch);
  return ctx.getImageData(0, 0, cw, ch);
}

async function detectWithBarcodeDetector(
  source: ImageBitmapSource
): Promise<string | null> {
  const BD = getBarcodeDetectorCtor();
  if (!BD) return null;
  try {
    const detector = new BD({ formats: ["qr_code"] });
    const codes = await detector.detect(source);
    return codes[0]?.rawValue?.trim() || null;
  } catch {
    return null;
  }
}

/** Skala yang dicoba untuk foto HP (jsQR sering gagal di 4000px+). */
const PHOTO_MAX_EDGES = [1280, 960, 720, 560, 400, 280];

/**
 * Crop tengah (QR sering kecil di tengah frame foto HP),
 * lalu downscale ke beberapa ukuran.
 */
function decodeRegion(
  source: CanvasImageSource,
  sx: number,
  sy: number,
  sw: number,
  sh: number
): string | null {
  for (const maxEdge of PHOTO_MAX_EDGES) {
    const scale = Math.min(1, maxEdge / Math.max(sw, sh));
    const cw = Math.max(1, Math.round(sw * scale));
    const ch = Math.max(1, Math.round(sh * scale));
    const canvas = document.createElement("canvas");
    canvas.width = cw;
    canvas.height = ch;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) continue;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(source, sx, sy, sw, sh, 0, 0, cw, ch);
    const imageData = ctx.getImageData(0, 0, cw, ch);
    const raw = tryJsQRVariants(imageData);
    if (raw) return raw;
  }
  return null;
}

function decodeJsQRMultiScale(
  source: CanvasImageSource,
  srcW: number,
  srcH: number
): string | null {
  const full = decodeRegion(source, 0, 0, srcW, srcH);
  if (full) return full;

  // Crop tengah 70% / 50% / 35% — label QR kecil di foto jarak jauh
  for (const frac of [0.7, 0.5, 0.35]) {
    const sw = Math.max(1, Math.round(srcW * frac));
    const sh = Math.max(1, Math.round(srcH * frac));
    const sx = Math.max(0, Math.round((srcW - sw) / 2));
    const sy = Math.max(0, Math.round((srcH - sh) / 2));
    const raw = decodeRegion(source, sx, sy, sw, sh);
    if (raw) return raw;
  }
  return null;
}

/** Downscale frame kamera agar jsQR cepat di HP. */
function drawVideoToImageData(
  video: HTMLVideoElement,
  maxEdge = 480
): ImageData | null {
  return drawSourceToImageData(
    video,
    video.videoWidth,
    video.videoHeight,
    maxEdge
  );
}

export async function detectQrFromVideo(
  video: HTMLVideoElement
): Promise<string | null> {
  const fromBd = await detectWithBarcodeDetector(video);
  if (fromBd) return fromBd;
  const imageData = drawVideoToImageData(video);
  if (!imageData) return null;
  return tryJsQRVariants(imageData);
}

function loadImageFromObjectUrl(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = () =>
      reject(
        new Error(
          "Foto tidak bisa dibuka. Ambil ulang sebagai JPEG/PNG, atau izinkan akses foto."
        )
      );
    img.src = url;
  });
}

async function decodeFromImageSource(
  source: CanvasImageSource & ImageBitmapSource,
  w: number,
  h: number
): Promise<string | null> {
  const fromBd = await detectWithBarcodeDetector(source);
  if (fromBd) return fromBd;
  return decodeJsQRMultiScale(source, w, h);
}

/**
 * Decode dari file/foto.
 * Pakai <img> dulu (orientasi EXIF lebih andal di Safari) lalu multi-skala + crop jsQR.
 */
export async function detectQrFromFile(file: File): Promise<string | null> {
  if (file.type && !file.type.startsWith("image/")) {
    throw new Error("File bukan gambar. Pilih foto QR (JPEG/PNG).");
  }

  const url = URL.createObjectURL(file);
  let loadError: Error | null = null;
  try {
    try {
      const img = await loadImageFromObjectUrl(url);
      if (img.decode) {
        await img.decode().catch(() => {
          /* decode() opsional */
        });
      }
      const w = img.naturalWidth || img.width;
      const h = img.naturalHeight || img.height;
      if (!w || !h) {
        throw new Error("Foto kosong atau rusak. Ambil ulang.");
      }
      const raw = await decodeFromImageSource(img, w, h);
      if (raw) return raw;
    } catch (err) {
      loadError = err instanceof Error ? err : new Error(String(err));
    }

    // Fallback: createImageBitmap (HEIC Safari / beda EXIF)
    try {
      const bitmap = await createImageBitmap(file, {
        imageOrientation: "from-image",
      } as ImageBitmapOptions);
      try {
        const raw = await decodeFromImageSource(
          bitmap,
          bitmap.width,
          bitmap.height
        );
        if (raw) return raw;
      } finally {
        bitmap.close();
      }
    } catch {
      if (loadError) throw loadError;
      throw new Error(
        "Foto tidak didukung peramban ini. Coba JPEG, atau Scan QR langsung."
      );
    }

    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
}
