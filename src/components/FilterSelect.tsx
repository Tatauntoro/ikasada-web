import type { ReactNode } from "react";
import { CaretDown } from "@phosphor-icons/react";

/**
 * Select garis-bawah untuk baris filter editorial (dipakai direktori alumni
 * dan arsip dokumen).
 */
export default function FilterSelect({
  value,
  onChange,
  ariaLabel,
  children,
  className = "",
}: {
  value: string;
  onChange: (value: string) => void;
  ariaLabel: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span className={`relative inline-flex items-center ${className}`}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={ariaLabel}
        className="w-full cursor-pointer appearance-none border-0 bg-transparent pr-7 text-[14px] text-black outline-0"
      >
        {children}
      </select>
      <CaretDown
        weight="bold"
        className="pointer-events-none absolute right-1 text-[12px] text-black/40"
      />
    </span>
  );
}
