import QRCode from "qrcode";

export type QrLabelKey = {
  code: string;
  jenis: string;
  barcode: string;
};

/**
 * Label seukuran kepala kunci tipikal.
 * Kepala kunci kabinet/padlock umum ≈ 18–25 mm (bow).
 * Target: kartu 20×26 mm, QR 16 mm — setara diameter kepala, scan jarak dekat.
 */
export async function openQrLabelPrint(keys: QrLabelKey[]): Promise<void> {
  if (keys.length === 0) {
    throw new Error("Pilih minimal satu kunci.");
  }

  const labels = await Promise.all(
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

  const cards = labels
    .map(
      (l) => `
      <article class="card">
        <img src="${l.dataUrl}" alt="QR ${escapeHtml(l.code)}" width="256" height="256" />
        <p class="code">${escapeHtml(l.code)}</p>
        <p class="jenis">${escapeHtml(l.jenis || "—")}</p>
      </article>`
    )
    .join("\n");

  const html = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8" />
  <title>Cetak QR kunci — IST Security</title>
  <style>
    @page { size: A4; margin: 6mm; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: "IBM Plex Sans", "Helvetica Neue", Arial, sans-serif;
      color: #0f172a;
    }
    .toolbar {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      align-items: center;
      padding: 12px 16px;
      border-bottom: 2px solid #cbd5e1;
      background: #f8fafc;
    }
    .toolbar p { margin: 0; font-size: 15px; line-height: 1.4; }
    .toolbar button {
      min-height: 44px;
      padding: 8px 16px;
      font-size: 16px;
      font-weight: 700;
      border: 2px solid #1d4ed8;
      border-radius: 6px;
      background: #1d4ed8;
      color: #fff;
      cursor: pointer;
    }
    /* A4 ≈ 198 mm lebar isi → 9 kolom × 20 mm + gap */
    .grid {
      display: grid;
      grid-template-columns: repeat(9, 20mm);
      gap: 2mm;
      justify-content: start;
      padding: 3mm;
    }
    .card {
      width: 20mm;
      height: 26mm;
      border: 0.3mm solid #64748b;
      border-radius: 1mm;
      padding: 0.8mm 0.6mm 0.5mm;
      text-align: center;
      overflow: hidden;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .card img {
      width: 16mm;
      height: 16mm;
      display: block;
      margin: 0 auto;
    }
    .code {
      margin: 0.5mm 0 0;
      font-family: ui-monospace, "IBM Plex Mono", monospace;
      font-size: 6pt;
      font-weight: 700;
      line-height: 1.1;
      word-break: break-all;
    }
    .jenis {
      margin: 0.2mm 0 0;
      font-size: 4.5pt;
      line-height: 1.1;
      color: #334155;
      word-break: break-word;
      max-height: 5mm;
      overflow: hidden;
    }
    @media print {
      .toolbar { display: none !important; }
      .grid { padding: 0; gap: 1.8mm; }
    }
  </style>
</head>
<body>
  <div class="toolbar">
    <p>
      <strong>${labels.length}</strong> label · kartu <strong>20×26 mm</strong> · QR
      <strong>16 mm</strong> (≈ diameter kepala kunci) · Cetak atau Simpan sebagai PDF
    </p>
    <button type="button" onclick="window.print()">Cetak / simpan PDF</button>
  </div>
  <div class="grid">
    ${cards}
  </div>
  <script>
    window.addEventListener("load", function () {
      setTimeout(function () { window.print(); }, 350);
    });
  </script>
</body>
</html>`;

  const win = window.open("", "_blank");
  if (!win) {
    throw new Error(
      "Popup diblokir. Izinkan jendela baru di browser, lalu coba lagi."
    );
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
