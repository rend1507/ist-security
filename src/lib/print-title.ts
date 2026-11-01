/**
 * Nama file saat “Save as PDF”: Chrome memakai `document.title` + `.pdf`.
 * Jangan taruh `.pdf` di judul — nanti jadi `.pdf.pdf`.
 */

export function logKunciPdfTitle(fromYmd: string, toYmd: string): string {
  const start = fromYmd <= toYmd ? fromYmd : toYmd;
  const end = fromYmd <= toYmd ? toYmd : fromYmd;
  const dates = start === end ? start : `${start} - ${end}`;
  return `${dates} | Log Kunci - IST Security`;
}

export function daftarKunciPdfTitle(printYmd: string): string {
  return `${printYmd} | Daftar Kunci - IST Security`;
}

/** Unduh blob PDF. `title` tanpa `.pdf` — sama aturan nama file Cetak/PDF. */
export function downloadPdfBlob(blob: Blob, title: string): void {
  const filename = title.endsWith(".pdf") ? title : `${title}.pdf`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2_000);
}

export function printWithTitle(title: string): void {
  const prev = document.title;
  document.title = title;
  let restored = false;
  const restore = () => {
    if (restored) return;
    restored = true;
    document.title = prev;
    window.removeEventListener("afterprint", restore);
  };
  window.addEventListener("afterprint", restore);
  window.print();
}
