"use client";

import { CaretLeft, CaretRight } from "@phosphor-icons/react";
import { m } from "framer-motion";

type PaginationProps = {
  /** Halaman aktif (1-based). */
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
  tone?: "light" | "dark";
};

/** Daftar nomor halaman dengan elipsis: 1 … 4 5 6 … 20 */
function buildItems(page: number, totalPages: number): (number | "ellipsis")[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const items: (number | "ellipsis")[] = [1];
  const start = Math.max(2, page - 1);
  const end = Math.min(totalPages - 1, page + 1);

  if (start > 2) items.push("ellipsis");
  for (let i = start; i <= end; i += 1) items.push(i);
  if (end < totalPages - 1) items.push("ellipsis");

  items.push(totalPages);
  return items;
}

export default function Pagination({
  page,
  totalPages,
  onPageChange,
  className = "",
  tone = "light",
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const items = buildItems(page, totalPages);
  const dark = tone === "dark";

  const arrowClass = `inline-flex h-10 w-10 items-center justify-center rounded-full border transition-colors disabled:cursor-default disabled:opacity-35 ${
    dark
      ? "border-white/20 text-white enabled:hover:border-white enabled:hover:text-white"
      : "border-black/18 text-black enabled:hover:border-black enabled:hover:text-black"
  }`;

  const numberBase =
    "relative inline-flex h-10 min-w-10 items-center justify-center rounded-full px-3 text-[14px] font-normal transition-colors";
  const numberActive = dark ? "text-[#0f1012]" : "text-[#fdfdfd]";
  const indicatorActive = dark ? "bg-[#fdfdfd]" : "bg-[#0f1012]";
  const numberIdle = dark
    ? "border border-white/20 text-white/80 hover:border-white hover:text-white"
    : "border border-black/18 text-black hover:border-black hover:text-black";

  return (
    <nav
      aria-label="Navigasi halaman"
      className={`flex items-center justify-center gap-2 ${className}`}
    >
      <button
        type="button"
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        aria-label="Halaman sebelumnya"
        className={arrowClass}
      >
        <CaretLeft weight="bold" />
      </button>

      {items.map((item, i) =>
        item === "ellipsis" ? (
          <span
            key={`ellipsis-${i}`}
            className={`px-1 select-none ${
              dark ? "text-white/40" : "text-black/40"
            }`}
          >
            …
          </span>
        ) : (
          <button
            key={item}
            type="button"
            onClick={() => onPageChange(item)}
            aria-current={item === page ? "page" : undefined}
            className={`${numberBase} ${
              item === page ? numberActive : numberIdle
            }`}
          >
            {item === page && (
              <m.span
                layoutId="pagination-active-indicator"
                aria-hidden="true"
                className={`absolute inset-0 rounded-full ${indicatorActive}`}
                transition={{ type: "spring", stiffness: 400, damping: 32 }}
              />
            )}
            <span className="relative z-10">{item}</span>
          </button>
        )
      )}

      <button
        type="button"
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        aria-label="Halaman berikutnya"
        className={arrowClass}
      >
        <CaretRight weight="bold" />
      </button>
    </nav>
  );
}
