import QRCode from "qrcode";

export type QrLabelKey = {
  code: string;
  jenis: string;
  barcode: string;
};

export type QrLabelReady = QrLabelKey & { dataUrl: string };

/**
 * Siapkan gambar QR untuk label stiker (kartu 20×26 mm, QR 16 mm).
 * Cetak di halaman yang sama — tanpa popup.
 */
export async function buildQrLabels(
  keys: QrLabelKey[]
): Promise<QrLabelReady[]> {
  if (keys.length === 0) {
    throw new Error("Pilih minimal satu kunci.");
  }

  return Promise.all(
    keys.map(async (k) => {
      const dataUrl = await QRCode.toDataURL(k.barcode, {
        width: 256,
        margin: 1,
        errorCorrectionLevel: "Q",
        color: { dark: "#000000", light: "#ffffff" },
      });
      return { ...k, dataUrl };
    })
  );
}
