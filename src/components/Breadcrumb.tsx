import Link from "next/link";
import { CaretRight } from "@phosphor-icons/react/dist/ssr";

export type Crumb = {
  label: string;
  href?: string;
};

/**
 * Breadcrumb ringan untuk halaman dalam. Item terakhir dianggap halaman aktif
 * (tanpa tautan). `tone` menyesuaikan warna untuk latar terang atau gelap.
 */
export default function Breadcrumb({
  items,
  className = "",
  tone = "light",
}: {
  items: Crumb[];
  className?: string;
  tone?: "light" | "dark";
}) {
  const linkClass =
    tone === "dark"
      ? "text-white/60 hover:text-white transition-colors"
      : "text-black/55 hover:text-black transition-colors";
  const mutedClass =
    tone === "dark" ? "text-white/60" : "text-black/55";
  const activeClass =
    tone === "dark"
      ? "font-normal text-white"
      : "font-normal text-[#0f1012]";
  const separatorClass =
    tone === "dark" ? "text-white/30" : "text-black/35";

  return (
    <nav
      aria-label="Breadcrumb"
      className={`flex flex-wrap items-center gap-2 text-[13px] ${className}`}
    >
      {items.map((item, i) => {
        const last = i === items.length - 1;
        return (
          <span
            key={`${item.label}-${i}`}
            className="inline-flex items-center gap-2"
          >
            {item.href && !last ? (
              <Link href={item.href} className={linkClass}>
                {item.label}
              </Link>
            ) : (
              <span
                aria-current={last ? "page" : undefined}
                className={last ? activeClass : mutedClass}
              >
                {item.label}
              </span>
            )}
            {!last && (
              <CaretRight
                weight="bold"
                className={`text-[11px] ${separatorClass}`}
              />
            )}
          </span>
        );
      })}
    </nav>
  );
}
