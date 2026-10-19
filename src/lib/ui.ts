/** Kelas tombol & navigasi — kontras tinggi (petugas ~30–65 th). */

export const btnBase =
  "inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-md px-3 py-2.5 text-sm font-semibold transition sm:min-h-12 sm:px-4 sm:text-base disabled:cursor-not-allowed disabled:opacity-50";

export const btnPrimary = `${btnBase} bg-blue-700 text-white hover:bg-blue-800`;
export const btnSuccess = `${btnBase} bg-emerald-700 text-white hover:bg-emerald-800`;
export const btnDanger = `${btnBase} bg-rose-700 text-white hover:bg-rose-800`;
export const btnNeutral = `${btnBase} bg-slate-800 text-white hover:bg-slate-900`;
export const btnCancel =
  `${btnBase} border-2 border-slate-400 bg-white text-slate-800 hover:bg-slate-100`;
export const btnGhost =
  `${btnBase} border border-slate-300 bg-slate-50 text-slate-800 hover:bg-slate-200`;

export const pillBase =
  "inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-md px-2.5 py-2 text-sm font-semibold transition sm:min-h-11 sm:gap-2 sm:px-3 sm:text-base";

export const pillActive = `${pillBase} bg-blue-700 text-white`;
export const pillIdle = `${pillBase} bg-white text-slate-800 ring-1 ring-slate-300 hover:bg-slate-100`;

export const pillActiveDark = `${pillBase} bg-blue-600 text-white`;
export const pillIdleDark =
  `${pillBase} text-slate-200 hover:bg-slate-800 hover:text-white`;

export const toolbarGroup =
  "flex flex-wrap items-center gap-2 rounded-lg border border-slate-300 bg-slate-100/90 p-2";
