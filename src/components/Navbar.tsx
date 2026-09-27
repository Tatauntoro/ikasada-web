"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, m, useMotionValueEvent, useScroll } from "framer-motion";
import { List, UserCircle, X } from "@phosphor-icons/react";
import { panggilApi } from "@/lib/api-client";
import { getInitials } from "@/lib/format";
import { scrollToSection } from "@/lib/scroll";
import { useLoader } from "./LoaderProvider";
import { useHeroMotionPolicy } from "@/lib/useHeroMotionPolicy";
import { TombolPermintaanMasuk } from "./alumni/BadgePermintaanMasuk";
import { PermintaanMasukProvider } from "./alumni/PermintaanMasukProvider";
import {
  SESI_BERUBAH_EVENT,
  StatusAkunProvider,
} from "./alumni/StatusAkunProvider";

export { scrollToSection } from "@/lib/scroll";

/**
 * `href` menandai item yang menuju halaman terpisah; tanpa `href`, item
 * dianggap anchor section di beranda.
 */
const navItems: { id: string; label: string; href?: string }[] = [
  { id: "hero", label: "Beranda" },
  { id: "alumni", label: "Direktori Alumni" },
  { id: "arsip", label: "Arsip" },
  { id: "kegiatan", label: "Kegiatan" },
];

/** Jeda masuk pill navbar dan CTA Masuk/Daftar, dalam milidetik. */
const JEDA_NAV = { pill: 2900, auth: 3200 };

/** Bagian `GET /api/auth/alumni/me` yang dipakai navbar. */
type SesiAlumni = {
  status: "PENDING" | "ACTIVE";
  namaLengkapSaatDaftar: string;
  alumni: { namaLengkap: string; fotoUrl: string | null } | null;
};

/**
 * Akun yang sedang login. `href` menyesuaikan status: pendaftar `PENDING` belum
 * boleh membuka `/alumni/profil`, jadi ikonnya mengarah ke halaman status.
 */
type AkunNavbar = {
  nama: string;
  fotoUrl: string | null;
  href: string;
  /** Akun `ACTIVE` saja yang bisa menerima permintaan koneksi. */
  aktif: boolean;
};

/**
 * Isi ikon profil: foto alumni kalau ada, kalau tidak inisial namanya, dan glyph
 * Phosphor hitam sebagai jaring terakhir untuk nama yang kosong.
 */
function AvatarProfil({ nama, fotoUrl }: { nama: string; fotoUrl: string | null }) {
  if (fotoUrl) {
    return (
      /* eslint-disable-next-line @next/next/no-img-element */
      <img src={fotoUrl} alt="" className="h-full w-full object-cover" />
    );
  }

  const inisial = getInitials(nama);
  if (!inisial) {
    return (
      <UserCircle
        weight="regular"
        className="text-[22px] text-[#111111]"
        aria-hidden="true"
      />
    );
  }

  return <span aria-hidden="true">{inisial}</span>;
}

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const lastScrollY = useRef(0);
  const pathname = usePathname();
  const { ready, introAktif } = useLoader();
  const reducedMotion = useHeroMotionPolicy() === "reduced";
  const { scrollY } = useScroll();

  /*
   * Entrance pill/CTA hanya dianimasikan saat intro memang main. Kalau beranda
   * dibuka lewat navigasi client-side (`introAktif` false), keduanya sudah
   * "siap" sejak render pertama sehingga tidak ada slide-in ulang.
   */
  const [introReady, setIntroReady] = useState(!introAktif);
  const [authReady, setAuthReady] = useState(!introAktif);
  const [akun, setAkun] = useState<AkunNavbar | null>(null);
  const [sesiSelesai, setSesiSelesai] = useState(false);

  const isHome = pathname === "/";

  /*
   * Status sesi alumni. Server tetap penentu data apa yang boleh keluar; di sini
   * `/me` dipakai hanya untuk memilih antara CTA Masuk/Daftar dan ikon profil,
   * persis pola `AlumniDirectory`. Tidak ada auth state di `localStorage`.
   */
  const muatSesi = useCallback(async (signal: AbortSignal) => {
    const hasil = await panggilApi<SesiAlumni>("/api/auth/alumni/me", {
      signal,
    });

    if (signal.aborted) return;

    if (hasil.ok) {
      const { status, namaLengkapSaatDaftar, alumni } = hasil.data;
      setAkun({
        nama: (alumni?.namaLengkap || namaLengkapSaatDaftar).trim(),
        fotoUrl: alumni?.fotoUrl ?? null,
        href: status === "ACTIVE" ? "/alumni/profil" : "/alumni/status",
        aktif: status === "ACTIVE",
      });
    }

    setSesiSelesai(true);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    // State baru di-set setelah request selesai, bukan di badan effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    muatSesi(controller.signal);
    return () => controller.abort();
  }, [muatSesi]);

  /*
   * StatusAkunProvider melaporkan sesi sudah basi (mis. akun baru disetujui
   * pengurus). Muat ulang `/me` supaya avatar & tautan profil PENDING → ACTIVE
   * ikut berubah tanpa reload halaman.
   */
  useEffect(() => {
    const tangani = () => {
      void muatSesi(new AbortController().signal);
    };

    window.addEventListener(SESI_BERUBAH_EVENT, tangani);
    return () => window.removeEventListener(SESI_BERUBAH_EVENT, tangani);
  }, [muatSesi]);

  /*
   * Urutan masuk setelah veil preloader menyusul hero (lihat konstanta JEDA di
   * GlyphHero.tsx): hero dulu sampai CTA + logo, baru pill navbar, baru CTA
   * Masuk/Daftar.
   */
  useEffect(() => {
    if (!ready) return;
    if (reducedMotion) return;
    if (!introAktif) return;
    const pill = window.setTimeout(() => setIntroReady(true), JEDA_NAV.pill);
    const auth = window.setTimeout(() => setAuthReady(true), JEDA_NAV.auth);
    return () => {
      window.clearTimeout(pill);
      window.clearTimeout(auth);
    };
  }, [ready, reducedMotion, introAktif]);

  const navHidden = !(ready && (reducedMotion || introReady)) || hidden;
  const authHidden = !(ready && (reducedMotion || authReady)) || hidden;

  useMotionValueEvent(scrollY, "change", (latest) => {
    if (latest <= 80) {
      setHidden(false);
    } else if (latest > lastScrollY.current) {
      setHidden(true);
    } else if (latest < lastScrollY.current - 4) {
      setHidden(false);
    }
    lastScrollY.current = latest;
  });

  /* Permukaan Augen: putih susu, hairline, blur lokal, dan elevasi sangat tipis. */
  const surfaceBase =
    "augen-nav-surface rounded-[10px] transition-colors duration-200";

  const linkBase =
    "augen-nav-item font-sans text-[16px] font-[400] tracking-[-0.02em] text-[#0f1012] px-3 py-2 whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0071e3]";

  const menuButtonBase =
    "p-2.5 augen-hairline rounded-[10px] bg-[#fdfdfd] text-[#0f1012] transition-colors duration-200";

  return (
    <PermintaanMasukProvider aktif={akun?.aktif ?? false}>
      <StatusAkunProvider aktif={Boolean(akun)} />
      {/* Navbar — pill terpusat */}
      {/* 34px dari atas, sesuai posisi pill nav Augen. */}
      <div className="fixed top-[34px] inset-x-0 z-50 hidden justify-center pointer-events-none md:flex">
        <m.nav
          initial={introAktif ? { y: "-150%", opacity: 0 } : false}
          animate={{ y: navHidden ? "-150%" : "0%", opacity: navHidden ? 0 : 1 }}
          transition={{ duration: reducedMotion ? 0 : 0.3, ease: [0.22, 0.61, 0.36, 1] }}
          style={{ visibility: navHidden ? "hidden" : "visible" }}
          className="pointer-events-auto w-fit max-w-[calc(100%-2rem)]"
        >
          <div className={`flex items-center gap-1 px-[11px] py-[11px] ${surfaceBase}`}>
            <div className="augen-nav-group flex min-w-0 items-center gap-0.5">
              {navItems.map((item) =>
                item.href ? (
                  <Link key={item.id} href={item.href} className={linkBase}>
                    {item.label}
                  </Link>
                ) : isHome ? (
                  <button
                    key={item.id}
                    onClick={() => scrollToSection(item.id)}
                    className={linkBase}
                  >
                    {item.label}
                  </button>
                ) : (
                  <Link
                    key={item.id}
                    href={item.id === "hero" ? "/" : `/#${item.id}`}
                    className={linkBase}
                  >
                    {item.label}
                  </Link>
                )
              )}
            </div>

          </div>
        </m.nav>
      </div>

      {/* Akses alumni — terpisah dari pill navbar, kanan atas */}
      <m.div
        className="fixed top-[34px] right-5 z-50 hidden items-center gap-2 pointer-events-none md:flex"
        initial={introAktif ? { y: "-150%", opacity: 0 } : false}
        animate={{ y: authHidden ? "-150%" : "0%", opacity: authHidden ? 0 : 1 }}
        transition={{ duration: reducedMotion ? 0 : 0.3, ease: [0.22, 0.61, 0.36, 1] }}
        style={{ visibility: authHidden ? "hidden" : "visible" }}
      >
        {akun && <TombolPermintaanMasuk />}
        {akun ? (
          <Link
            href={akun.href}
            aria-label={akun.nama ? `Buka profil ${akun.nama}` : "Buka profil"}
            title={akun.nama || undefined}
            className={`${surfaceBase} pointer-events-auto grid h-11 w-11 place-items-center overflow-hidden rounded-full font-sans text-[13px] font-medium tracking-[-0.02em] text-[#0f1012] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0071e3]`}
          >
            <AvatarProfil nama={akun.nama} fotoUrl={akun.fotoUrl} />
          </Link>
        ) : sesiSelesai ? (
          <>
            <Link
              href="/alumni/login"
              className={`${surfaceBase} pointer-events-auto px-4 py-2.5 font-sans text-[15px] font-normal tracking-[-0.02em] text-[#0f1012] hover:underline underline-offset-4 focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-[#0071e3]`}
            >
              Masuk
            </Link>
            <Link
              href="/alumni/register"
              className="pointer-events-auto rounded-[10px] bg-[#0071e3] px-4 py-2.5 font-sans text-[15px] font-normal tracking-[-0.02em] text-white transition-colors hover:bg-[#005fc1] hover:text-white focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-[#0f1012]"
            >
              Daftar
            </Link>
          </>
        ) : null}
      </m.div>

      {/* Mobile menu button — kanan */}
      <m.div
        className="fixed top-[34px] right-5 z-50 md:hidden"
        initial={introAktif ? { y: "-150%", opacity: 0 } : false}
        animate={{ y: navHidden ? "-150%" : "0%", opacity: navHidden ? 0 : 1 }}
        transition={{ duration: reducedMotion ? 0 : 0.3, ease: [0.22, 0.61, 0.36, 1] }}
        style={{ visibility: navHidden ? "hidden" : "visible" }}
      >
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className={menuButtonBase}
          aria-label="Toggle menu"
        >
          {mobileOpen ? (
            <X weight="regular" className="text-xl" />
          ) : (
            <List weight="regular" className="text-xl" />
          )}
        </button>
      </m.div>

      {/* Mobile Menu Dropdown */}
      <AnimatePresence>
        {mobileOpen && (
          <m.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="fixed top-[88px] left-5 right-5 z-40 md:hidden augen-hairline bg-[#fdfdfd] rounded-[26px] px-5 pt-4 pb-5 space-y-1"
          >
            <div className="mb-2 flex gap-2 border-b border-black/10 px-3 pb-4">
              {akun ? (
                <Link
                  href={akun.href}
                  onClick={() => setMobileOpen(false)}
                  aria-label={
                    akun.nama ? `Buka profil ${akun.nama}` : "Buka profil"
                  }
                  className="inline-flex min-h-11 flex-1 items-center gap-3 rounded-[10px] border border-black/10 px-3 text-[15px] font-normal text-[#0f1012] focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-[#0071e3]"
                >
                  <span className="grid h-8 w-8 flex-none place-items-center overflow-hidden rounded-full bg-[#f4f4f5] text-[12px] font-medium text-[#0f1012]">
                    <AvatarProfil nama={akun.nama} fotoUrl={akun.fotoUrl} />
                  </span>
                  <span className="truncate">
                    {akun.nama || "Profil saya"}
                  </span>
                </Link>
              ) : sesiSelesai ? (
                <>
                  <Link
                    href="/alumni/login"
                    onClick={() => setMobileOpen(false)}
                    className="inline-flex min-h-11 flex-1 items-center justify-center rounded-[10px] border border-black/10 px-3 text-[15px] font-normal text-[#0f1012] focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-[#0071e3]"
                  >
                    Masuk
                  </Link>
                  <Link
                    href="/alumni/register"
                    onClick={() => setMobileOpen(false)}
                    className="inline-flex min-h-11 flex-1 items-center justify-center rounded-[10px] bg-[#0071e3] px-3 text-[15px] font-normal text-white transition-colors hover:bg-[#005fc1] hover:text-white focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-[#0f1012]"
                  >
                    Daftar
                  </Link>
                </>
              ) : null}
              {akun && (
                <TombolPermintaanMasuk
                  variant="menu"
                  onKlik={() => setMobileOpen(false)}
                />
              )}
            </div>
            {navItems.map((item) =>
              item.href ? (
                <Link
                  key={item.id}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className="font-sans block w-full text-left px-3 py-2.5 rounded-[10px] text-[16px] font-normal tracking-[-0.02em] text-[#0f1012] transition-colors hover:underline underline-offset-4"
                >
                  {item.label}
                </Link>
              ) : isHome ? (
                <button
                  key={item.id}
                  onClick={() => {
                    scrollToSection(item.id);
                    setMobileOpen(false);
                  }}
                  className="font-sans block w-full text-left px-3 py-2.5 rounded-[10px] text-[16px] font-normal tracking-[-0.02em] text-[#0f1012] transition-colors hover:underline underline-offset-4"
                >
                  {item.label}
                </button>
              ) : (
                <Link
                  key={item.id}
                  href={item.id === "hero" ? "/" : `/#${item.id}`}
                  onClick={() => setMobileOpen(false)}
                  className="font-sans block w-full text-left px-3 py-2.5 rounded-[10px] text-[16px] font-normal tracking-[-0.02em] text-[#0f1012] transition-colors hover:underline underline-offset-4"
                >
                  {item.label}
                </Link>
              )
            )}
          </m.div>
        )}
      </AnimatePresence>
    </PermintaanMasukProvider>
  );
}
