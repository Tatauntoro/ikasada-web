import ArsipDirectory from "@/components/ArsipDirectory";
import BackButton from "@/components/BackButton";
import Breadcrumb from "@/components/Breadcrumb";
import ScrollReveal from "@/components/ScrollReveal";
import type { Metadata } from "next";
import {
  PER_PAGE_ARSIP,
  daftarArsipPublik,
  jenisArsipTerpakai,
  tahunArsipTersedia,
} from "@/lib/arsip-publik";
import { alumniAktif } from "@/lib/sesi-alumni";

export const metadata: Metadata = {
  title: "Arsip Dokumen - IKASADA FIB UI",
  description:
    "Arsip laporan, notulen, proposal, dan publikasi IKASADA FIB UI.",
};

/*
 * Halaman ini membaca database, jadi harus dirender per permintaan.
 * Tanpa ini Next mem-prerender-nya saat build dan daftar arsipnya membeku
 * sampai deploy berikutnya. Pola yang sama dipakai halaman alumni
 * (`/alumni/jejaring`, `/alumni/profil`).
 */
export const dynamic = "force-dynamic";

/**
 * Halaman daftar arsip.
 *
 * Halaman pertama diambil di server dan diteruskan ke `ArsipDirectory` sebagai
 * data awal, supaya HTML pertama sudah berisi dokumen (arsipnya tetap terbaca
 * mesin pencari dan tidak ada kedipan kosong). Penyaringan berikutnya berjalan
 * lewat `/api/public/arsip`.
 */
export default async function ArsipPage() {
  /*
   * Alumni aktif melihat isi arsip `KHUSUS_ALUMNI`; pengunjung lain tetap
   * melihat entrinya dalam mode terkunci (flag `terkunci` di payload).
   */
  const alumni = Boolean(await alumniAktif());

  const [{ items, total }, daftarJenis, daftarTahun] = await Promise.all([
    daftarArsipPublik({ page: 1, limit: PER_PAGE_ARSIP, alumniAktif: alumni }),
    jenisArsipTerpakai(),
    tahunArsipTersedia(),
  ]);

  return (
    <>
      <div className="public-page relative z-10 min-h-screen">
        <section className="relative min-h-screen overflow-hidden bg-white py-24">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage: "radial-gradient(rgba(0,0,0,0.06) 1px, transparent 1px)",
              backgroundSize: "32px 32px",
            }}
          />

          <div className="relative z-10 mx-auto w-full max-w-6xl px-6">
            <BackButton fallback="/#arsip" forceFallback />
            <Breadcrumb
              className="mb-10"
              items={[{ label: "Beranda", href: "/" }, { label: "Arsip Dokumen" }]}
            />

            <div
              className="mb-12"
              style={{ animation: "fadeSlideIn 0.8s ease-out 0.1s both" }}
            >
              <h1 className="page-title page-title--single">
                Arsip <span className="text-black/25">Dokumen.</span>
              </h1>
              <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-black/68 text-pretty sm:text-base">
                Kumpulan laporan, notulen, proposal, dan publikasi IKASADA FIB
                UI. Gunakan pencarian dan filter untuk menemukan dokumen.
              </p>
            </div>

            <ArsipDirectory
              awal={items}
              totalAwal={total}
              jenisAwal={daftarJenis}
              tahunAwal={daftarTahun}
            />
          </div>
        </section>
      </div>
      <ScrollReveal />
    </>
  );
}
