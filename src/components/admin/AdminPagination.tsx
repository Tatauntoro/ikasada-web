"use client";

export type AdminPaginationProps = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  onPageChange: (page: number) => void;
};

export function AdminPagination({
  page,
  limit,
  total,
  totalPages,
  onPageChange,
}: AdminPaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
      <p className="text-sm text-[#5e5e5e]">
        Menampilkan {(page - 1) * limit + 1} - {Math.min(page * limit, total)}{" "}
        dari {total} data
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="px-4 py-2 rounded-xl border border-black/[0.08] text-[#0f1012] font-semibold text-sm hover:bg-black/[0.04] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Sebelumnya
        </button>
        <span className="text-sm font-semibold text-[#0f1012]">
          {page} / {totalPages}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="px-4 py-2 rounded-xl border border-black/[0.08] text-[#0f1012] font-semibold text-sm hover:bg-black/[0.04] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Berikutnya
        </button>
      </div>
    </div>
  );
}
