"use client";

import { btnCancel, btnPrimary, textLabel, toolbarGroup } from "@/lib/ui";

export const PAGE_SIZE_OPTIONS = [20, 50, 100] as const;
export type PageSizeOption = (typeof PAGE_SIZE_OPTIONS)[number];

export function PaginationBar({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  disabled,
}: {
  page: number;
  pageSize: PageSizeOption;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: PageSizeOption) => void;
  disabled?: boolean;
}) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), pageCount);
  const from = total === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const to = Math.min(safePage * pageSize, total);

  return (
    <div className={`${toolbarGroup} items-center justify-between`}>
      <label className={`${textLabel} !mb-0 flex flex-wrap items-center gap-2`}>
        Per halaman
        <select
          value={pageSize}
          disabled={disabled}
          onChange={(e) =>
            onPageSizeChange(Number(e.target.value) as PageSizeOption)
          }
          className="min-h-11 rounded-md border-2 border-slate-400 bg-white px-3 py-2 font-mono text-base"
        >
          {PAGE_SIZE_OPTIONS.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </label>

      <p className="text-base font-semibold text-slate-700">
        {total === 0 ? "0 data" : `${from}–${to} dari ${total}`}
      </p>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={btnCancel}
          disabled={disabled || safePage <= 1}
          onClick={() => onPageChange(safePage - 1)}
        >
          Sebelumnya
        </button>
        <span className="inline-flex min-h-12 items-center px-2 font-mono text-base font-bold tabular-nums text-slate-800">
          {safePage} / {pageCount}
        </span>
        <button
          type="button"
          className={btnPrimary}
          disabled={disabled || safePage >= pageCount}
          onClick={() => onPageChange(safePage + 1)}
        >
          Berikutnya
        </button>
      </div>
    </div>
  );
}
