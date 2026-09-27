type BadgeVariant = "gray" | "blue" | "green" | "red" | "yellow";

const variantStyles: Record<
  BadgeVariant,
  string
> = {
  gray: "bg-[#f2f2f4] text-[#5e5e5e] border-black/[0.08]",
  blue: "bg-[#0071e3]/10 text-[#0071e3] border-[#0071e3]/30",
  green: "bg-emerald-50 text-emerald-700 border-emerald-200",
  red: "bg-red-50 text-red-700 border-red-200",
  yellow: "bg-amber-50 text-amber-700 border-amber-200",
};

const statusMap: Record<string, { label: string; variant: BadgeVariant }> = {
  DRAFT: { label: "Draft", variant: "gray" },
  PUBLISHED: { label: "Published", variant: "blue" },
  SELESAI: { label: "Selesai", variant: "green" },
  DIBATALKAN: { label: "Dibatalkan", variant: "red" },
  HIDDEN: { label: "Hidden", variant: "gray" },
  // Status akun alumni (Task 19) — halaman verifikasi di /admin/alumni-accounts.
  PENDING: { label: "Menunggu verifikasi", variant: "yellow" },
  ACTIVE: { label: "Aktif", variant: "green" },
  REJECTED: { label: "Ditolak", variant: "red" },
  SUSPENDED: { label: "Ditangguhkan", variant: "gray" },
};

type StatusBadgeProps = {
  status: string;
  className?: string;
};

export function StatusBadge({ status, className = "" }: StatusBadgeProps) {
  const normalized = status?.toUpperCase() ?? "";
  const config = statusMap[normalized] ?? { label: status, variant: "gray" as BadgeVariant };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${variantStyles[config.variant]} ${className}`}
    >
      {config.label}
    </span>
  );
}
