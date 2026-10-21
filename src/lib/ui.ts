/**
 * Desain UI petugas ~30–65 th.
 * - Body min 16px (text-base); hindari text-xs di konten utama
 * - Mono hanya untuk kode/jam/PIN
 * - Border 2px + kontras tinggi
 */

export const btnBase =
  "inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-md px-4 py-2.5 text-base font-semibold transition disabled:cursor-not-allowed disabled:opacity-50";

export const btnPrimary = `${btnBase} bg-blue-700 text-white hover:bg-blue-800`;
export const btnSuccess = `${btnBase} bg-emerald-700 text-white hover:bg-emerald-800`;
export const btnDanger = `${btnBase} bg-rose-700 text-white hover:bg-rose-800`;
export const btnNeutral = `${btnBase} bg-slate-800 text-white hover:bg-slate-900`;
export const btnCancel =
  `${btnBase} border-2 border-slate-400 bg-white text-slate-800 hover:bg-slate-100`;
export const btnGhost =
  `${btnBase} border-2 border-slate-300 bg-slate-50 text-slate-800 hover:bg-slate-200`;

/** Tombol aksi di baris tabel — tetap besar untuk jari */
export const btnRow =
  "inline-flex min-h-11 cursor-pointer items-center justify-center gap-1.5 rounded-md px-3 py-2 text-base font-semibold";

export const pillBase =
  "inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-base font-semibold transition";

export const pillActive = `${pillBase} bg-blue-700 text-white`;
export const pillIdle = `${pillBase} bg-white text-slate-800 ring-1 ring-slate-300 hover:bg-slate-100`;

export const pillActiveDark = `${pillBase} bg-blue-600 text-white`;
export const pillIdleDark =
  `${pillBase} text-slate-100 hover:bg-slate-800 hover:text-white`;

export const toolbarGroup =
  "flex flex-wrap items-center gap-2 rounded-lg border-2 border-slate-300 bg-slate-100 p-2";

export const textLabel =
  "block text-base font-semibold text-slate-800";
export const textTitle = "text-lg font-bold text-slate-900";
export const textBody = "text-base text-slate-800";
export const textMuted = "text-base text-slate-600";
export const textMono = "font-mono text-base tabular-nums text-slate-900";

export const inputBase =
  "mt-1 w-full rounded-md border-2 border-slate-400 bg-white px-3 py-2.5 text-base text-slate-900 outline-none ring-blue-600 focus:ring-2";

export const alertError =
  "rounded-md border-2 border-rose-300 bg-rose-50 px-3 py-2 text-base text-rose-900";
export const alertOk =
  "rounded-md border-2 border-emerald-300 bg-emerald-50 px-3 py-2 text-base text-emerald-950";
export const alertWarn =
  "rounded-md border-2 border-amber-300 bg-amber-50 px-3 py-2 text-base text-amber-950";

export const tableShell =
  "overflow-x-auto rounded-lg border-2 border-slate-300 bg-white";
export const tableHead =
  "bg-slate-200 text-sm font-bold uppercase tracking-wide text-slate-800";
export const tableCell = "px-3 py-2.5 text-base text-slate-800";
