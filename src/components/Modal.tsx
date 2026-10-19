"use client";

import { IconClose } from "@/components/Icons";

export function Modal({
  title,
  onClose,
  children,
  wide,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 p-4 sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        className={`max-h-[90vh] w-full overflow-y-auto rounded-lg bg-white shadow-xl ${
          wide ? "max-w-2xl" : "max-w-md"
        }`}
      >
        <div className="sticky top-0 flex items-center justify-between gap-3 border-b-2 border-slate-200 bg-white px-4 py-3">
          <h2 className="text-base font-bold text-slate-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-md border-2 border-slate-400 bg-white text-slate-800 hover:bg-slate-100"
          >
            <IconClose className="h-5 w-5" />
          </button>
        </div>
        <div className="p-4 text-base">{children}</div>
      </div>
    </div>
  );
}
