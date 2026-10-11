import Link from "next/link";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";

/**
 * Tautan "Kembali" untuk halaman edit Portal Admin — mengembalikan pengurus ke
 * daftar modul tanpa harus menekan tombol back peramban.
 */
export function KembaliAdmin({
  href,
  label = "Kembali",
}: {
  href: string;
  label?: string;
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 text-sm font-semibold text-[#0071e3] transition-colors hover:text-[#005fc1] hover:underline"
    >
      <ArrowLeft weight="bold" aria-hidden="true" />
      {label}
    </Link>
  );
}
