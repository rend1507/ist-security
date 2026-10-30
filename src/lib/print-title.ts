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
