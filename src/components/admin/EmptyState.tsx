import { MagnifyingGlass, Plus } from "@phosphor-icons/react";

export type EmptyStateProps = {
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  showAction?: boolean;
};

export function EmptyState({
  title = "Belum ada data",
  description = "Data masih kosong. Tambahkan data pertama sekarang.",
  actionLabel = "Tambah Data",
  onAction,
  showAction = true,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center glass-card rounded-3xl">
      <div className="w-16 h-16 rounded-2xl bg-black/[0.05] text-[#5e5e5e] flex items-center justify-center text-2xl mb-4">
        <MagnifyingGlass weight="bold" />
      </div>
      <h3 className="text-lg font-bold text-[#0f1012] mb-1">
        {title}
      </h3>
      <p className="text-sm text-[#5e5e5e] max-w-xs mb-5">
        {description}
      </p>
      {showAction && onAction && (
        <button
          onClick={onAction}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0071e3] text-white font-bold text-sm hover:bg-[#005fc1] transition-colors"
        >
          <Plus weight="bold" />
          {actionLabel}
        </button>
      )}
    </div>
  );
}
