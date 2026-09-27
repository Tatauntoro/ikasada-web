import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import Breadcrumb from "@/components/Breadcrumb";
import TombolKeluarAlumni from "./TombolKeluarAlumni";
import { BadgePermintaanMasuk } from "./BadgePermintaanMasuk";
import { PermintaanMasukProvider } from "./PermintaanMasukProvider";
import { StatusAkunProvider } from "./StatusAkunProvider";

/**
 * Shell halaman privat alumni (Task 11).
 *
 * Server component: identitas yang ditampilkan datang dari session yang dibaca
 * di server, bukan dari state di browser, jadi tidak ada isi privat yang
 * terkirim ke pengunjung anonymous dan tidak ada auth state di `localStorage`.
 * Penjagaan session dilakukan halaman pemakainya sebelum shell ini dirender.
 *
 * Menu memuat tiga halaman privat (status, profil, jejaring). `aktif` menentukan
 * dua di antaranya: akun yang belum disetujui memang belum boleh membukanya.
 */
export default function RuangAlumni({
  aktif,
  navAktif,
  children,
  fontClassName,
}: {
  aktif: boolean;
  navAktif: "status" | "profil" | "jejaring";
  children: ReactNode;
  fontClassName?: string;
}) {
  const menu: {
    label: string;
    href: string;
    kunci: "status" | "profil" | "jejaring";
  }[] = [{ label: "Status akun", href: "/alumni/status", kunci: "status" }];

  if (aktif) {
    menu.push(
      { label: "Profil", href: "/alumni/profil", kunci: "profil" },
      { label: "Jejaring", href: "/alumni/jejaring", kunci: "jejaring" }
    );
  }

  /* Label breadcrumb mengikuti halaman yang sedang dibuka, bukan tetap "Status". */
  const labelBreadcrumb = {
    status: "Status",
    profil: "Profil",
    jejaring: "Jejaring",
  }[navAktif];

  return (
    <main className={`public-page min-h-[100dvh] ${fontClassName ?? ""}`}>
      {/* Halaman ini selalu untuk user login: pantau perubahan status akun
          (mis. disetujui pengurus) dan tampilkan notifikasinya. */}
      <StatusAkunProvider aktif />
      <div className="mx-auto w-full max-w-[1440px] px-4 pb-16 pt-6 sm:px-6 sm:pt-8 lg:px-10">
        <header className="flex flex-col gap-4 border-b border-[#e1e5eb] pb-5 sm:flex-row sm:items-center sm:justify-between">
          <Link
            href="/"
            className="inline-flex w-fit items-center gap-2 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0071e3]"
          >
            <Image
              src="/logo/ikasada-logo.jpeg"
              alt="Logo IKASADA FIB UI"
              width={36}
              height={36}
              className="h-9 w-9 rounded-full object-cover"
              priority
            />
            <span className="text-[18px] font-medium tracking-[-0.03em] text-[#1f2937]">
              <span className="text-[#0071e3]">IKASADA</span> FIB UI
            </span>
            <span className="sr-only"> — Beranda</span>
          </Link>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/alumni"
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-[#c8d9ee] bg-white px-5 text-[13px] tracking-[-0.02em] text-[#005bbb] transition-colors hover:bg-[#f3f7fd] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0071e3]"
            >
              Direktori alumni
            </Link>
            <TombolKeluarAlumni />
          </div>
        </header>

        <div className="mt-6 grid gap-6 lg:grid-cols-[190px_minmax(0,1fr)] lg:gap-8">
          <aside className="h-fit lg:sticky lg:top-6">
            <PermintaanMasukProvider aktif={aktif}>
              <nav
                aria-label="Menu ruang alumni"
                className="grid grid-cols-3 gap-1 rounded-[16px] border border-[#e1e5eb] bg-white p-1.5 lg:grid-cols-1 lg:gap-2 lg:border-0 lg:bg-transparent lg:p-0"
              >
                {menu.map((item) => {
                  const iniAktif = item.kunci === navAktif;
                  const kelasTautan = `inline-flex min-h-11 min-w-0 items-center justify-center gap-2 rounded-[12px] px-2 text-center text-[13px] tracking-[-0.02em] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0757a6] lg:justify-start lg:px-3 lg:text-left ${
                    iniAktif
                      ? "bg-[#0757a6] text-white hover:bg-[#064b90]"
                      : "text-[#5e6b7b] hover:bg-white hover:text-[#005bbb]"
                  }`;

                  return item.kunci === "status" ? (
                    <a
                      key={item.href}
                      href={item.href}
                      aria-current={iniAktif ? "page" : undefined}
                      className={kelasTautan}
                    >
                      {item.label}
                    </a>
                  ) : (
                    <Link
                      key={item.href}
                      href={item.href}
                      aria-current={iniAktif ? "page" : undefined}
                      className={kelasTautan}
                    >
                      <span className="truncate">{item.label}</span>
                      {item.kunci === "jejaring" && (
                        <BadgePermintaanMasuk variant="pill" />
                      )}
                    </Link>
                  );
                })}
              </nav>
            </PermintaanMasukProvider>
          </aside>

          <div className="min-w-0">
            <Breadcrumb
              items={[{ label: "Beranda", href: "/" }, { label: labelBreadcrumb }]}
            />
            <div className="mt-8">{children}</div>
          </div>
        </div>
      </div>
    </main>
  );
}
