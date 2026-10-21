"use client";

import { IconClose } from "@/components/Icons";
import { textTitle } from "@/lib/ui";

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
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-3 sm:items-center sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className={`max-h-[92vh] w-full overflow-y-auto rounded-lg border-2 border-slate-300 bg-white shadow-lg ${
          wide ? "max-w-2xl" : "max-w-lg"
        }`}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b-2 border-slate-300 bg-white px-4 py-3.5 sm:px-5">
          <h2 id="modal-title" className={`${textTitle} pr-2`}>
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="inline-flex h-12 w-12 shrink-0 cursor-pointer items-center justify-center rounded-md border-2 border-slate-400 bg-white text-slate-800 hover:bg-slate-100"
          >
            <IconClose className="h-6 w-6" />
          </button>
        </div>
        <div className="space-y-3 p-4 text-base text-slate-800 sm:p-5">
          {children}
        </div>
      </div>
    </div>
  );
}
