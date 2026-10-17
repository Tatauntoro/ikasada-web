import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { DownloadSimple, LockKey } from "@phosphor-icons/react/dist/ssr";
import Breadcrumb from "@/components/Breadcrumb";
import RichText from "@/components/RichText";
import { PratinjauArsip } from "@/components/arsip/PratinjauArsip";
import { TautanEmailPengurus } from "@/components/arsip/TautanEmailPengurus";
import { prisma } from "@/lib/db";
import { getAlumniSession } from "@/lib/auth-alumni";
import { alumniAktif } from "@/lib/sesi-alumni";
import { bolehUnduh, labelGembokArsip, terkunci } from "@/lib/akses-arsip";
import { AKSES_ALUMNI_TERBUKA } from "@/lib/fitur";
import { formatPeriodeKegiatan, formatTanggalWIB } from "@/lib/format";

type PageProps = {
  params: Promise<{ slug: string }>;
};

async function ambilArsip(slug: string) {
  return prisma.arsip.findFirst({
    where: { slug, status: "PUBLISHED", deletedAt: null },
    include: {
      jenisArsip: true,
      media: { orderBy: { urutan: "asc" } },
    },
  });
}

/*
 * Arsip `KHUSUS_ALUMNI` tetap tampil di publik dalam mode terkunci, jadi
 * metadatanya boleh dibagikan. Saat terkunci, deskripsinya diganti keterangan
 * netral supaya isi yang digembok tidak bocor lewat preview tautan.
 */
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;

  const [dokumen, aktif] = await Promise.all([ambilArsip(slug), alumniAktif()]);

  if (!dokumen) {
    return { title: "Arsip Tidak Ditemukan - IKASADA FIB UI" };
  }

  if (terkunci(dokumen.akses, Boolean(aktif))) {
    return {
      title: `${dokumen.judul} - IKASADA FIB UI`,
      description: AKSES_ALUMNI_TERBUKA
        ? "Arsip khusus alumni — masuk untuk melihat isinya."
        : "Arsip khusus alumni — hubungi pengurus untuk membukanya.",
    };
  }

  return {
    title: `${dokumen.judul} - IKASADA FIB UI`,
    description: dokumen.deskripsiSingkat,
  };
}

export default async function ArsipDetailPage({ params }: PageProps) {
  const { slug } = await params;

  const [dokumen, sesi, aktif] = await Promise.all([
    ambilArsip(slug),
    getAlumniSession(),
    alumniAktif(),
  ]);

  if (!dokumen) notFound();

  const jalurLogin = `/alumni/login?next=/arsip/${dokumen.slug}`;
  const format = dokumen.berkasFormat?.toUpperCase() ?? null;
  const terkunciSekarang = terkunci(dokumen.akses, Boolean(aktif));
  const bolehAmbilBerkas = bolehUnduh(dokumen.akses, Boolean(aktif));
  const bisaDipratinjau = dokumen.berkasFormat?.toLowerCase() === "pdf";
  const periode = formatPeriodeKegiatan(
    dokumen.tanggalKegiatanMulai,
    dokumen.tanggalKegiatanSelesai
  );

  return (
    <div className="public-page relative z-10 min-h-screen bg-white">
      <section className="mx-auto w-full max-w-[900px] px-6 py-24">
        <Breadcrumb
          className="mb-10"
          items={[
            { label: "Beranda", href: "/" },
            { label: "Arsip Dokumen", href: "/arsip" },
            { label: dokumen.judul },
          ]}
        />

        {/* Sampul dokumen — hanya bila ada gambarnya (tanpa placeholder). */}
        {dokumen.gambarSampulUrl && (
          <div className="relative mb-10 aspect-[4/3] w-full overflow-hidden border border-black/10 sm:aspect-[16/9]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={dokumen.gambarSampulUrl}
              alt={dokumen.alt ?? dokumen.judul}
              className="h-full w-full object-cover"
            />
          </div>
        )}

        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className="rounded-full border border-black/15 px-3 py-1 text-[10px] uppercase tracking-[0.12em] text-black/60">
            {dokumen.jenisArsip.nama}
          </span>
          {format && (
            <span className="rounded-full bg-[#F4C430] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#0f1012]">
              {format}
            </span>
          )}
          <span className="text-[13px] text-black/50">{periode}</span>
          {dokumen.akses !== "PUBLIK" && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-black/15 px-3 py-1 text-[10px] uppercase tracking-[0.12em] text-black/60">
              <LockKey weight="bold" aria-hidden="true" />
              {labelGembokArsip(dokumen.akses, terkunciSekarang)}
            </span>
          )}
        </div>

        <p className="mt-3 text-[12px] text-black/40">
          Diunggah {formatTanggalWIB(dokumen.tanggalUpload)}
        </p>

        <h1 className="page-title mt-6">{dokumen.judul}</h1>

        <RichText
          teks={dokumen.deskripsiSingkat}
          className="mt-6 max-w-2xl space-y-3 text-[16px] leading-relaxed text-black/70"
        />

        {/*
          Mode terkunci: arsip khusus alumni tetap ditampilkan (judul, jenis,
          periode, sampul) tapi isinya digembok sampai alumni masuk. Pengunjung
          jadi tahu arsipnya ada dan tahu cara membukanya.
        */}
        {terkunciSekarang ? (
          <div className="mt-12 border border-dashed border-black/20 px-6 py-8">
            <p className="flex items-center gap-2 text-[15px] font-medium text-[#0f1012]">
              <LockKey weight="bold" aria-hidden="true" />
              Arsip ini khusus alumni
            </p>
            <p className="mt-3 max-w-xl text-[14px] leading-relaxed text-black/60">
              {!sesi
                ? AKSES_ALUMNI_TERBUKA
                  ? `Masuk dengan akun alumni untuk membuka ${
                      dokumen.media.length > 0
                        ? `${dokumen.media.length} media`
                        : "isi"
                    }${format ? ` dan berkas ${format}` : ""} arsip ini.`
                  : "Isi arsip ini hanya untuk alumni. Silakan hubungi tim pengurus lewat email di bawah ini untuk meminta salinan berkas arsipnya."
                : "Akun Anda belum aktif. Selesaikan verifikasi pengurus terlebih dahulu — setelah itu arsip ini bisa dibuka."}
            </p>
            {sesi ? (
              <Link
                href="/alumni/status"
                className="mt-5 inline-flex items-center gap-2 bg-[#0f1012] px-5 py-2.5 text-[13px] text-white transition-opacity hover:opacity-90"
              >
                <LockKey weight="bold" aria-hidden="true" />
                Lihat status akun
              </Link>
            ) : AKSES_ALUMNI_TERBUKA ? (
              <Link
                href={jalurLogin}
                className="mt-5 inline-flex items-center gap-2 bg-[#0f1012] px-5 py-2.5 text-[13px] text-white transition-opacity hover:opacity-90"
              >
                <LockKey weight="bold" aria-hidden="true" />
                Masuk sebagai alumni
              </Link>
            ) : (
              <TautanEmailPengurus />
            )}
          </div>
        ) : (
          <>
            <div className="mt-12 space-y-4 border-t border-black/10 pt-8">
              <RichText
                teks={dokumen.deskripsiLengkap}
                className="max-w-2xl space-y-4 text-[15px] leading-relaxed text-black/70"
              />
            </div>

            {/*
              Galeri kegiatan. Berkasnya dilayani endpoint berpenjaga supaya
              aturan akses arsipnya benar-benar berlaku (bukan sekadar
              disembunyikan), dan `next/image` tidak dipakai karena URL-nya bukan
              aset statis.
            */}
            {dokumen.media.length > 0 && (
              <section className="mt-12 border-t border-black/10 pt-8">
                <h2 className="text-[10px] uppercase tracking-[0.18em] text-black/50">
                  Galeri Kegiatan ({dokumen.media.length})
                </h2>

                <ul className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
                  {dokumen.media.map((media) => {
                    const sumber = `/api/arsip/${dokumen.slug}/media/${media.id}`;

                    return (
                      <li key={media.id}>
                        {media.jenis === "VIDEO" ? (
                          <video
                            src={sumber}
                            controls
                            preload="metadata"
                            className="w-full border border-black/10 bg-black"
                          />
                        ) : (
                          <div className="relative aspect-[4/3] w-full overflow-hidden border border-black/10">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={sumber}
                              alt={media.caption ?? dokumen.judul}
                              loading="lazy"
                              className="h-full w-full object-cover"
                            />
                          </div>
                        )}

                        {media.caption && (
                          <p className="mt-2 text-[13px] leading-relaxed text-black/60">
                            {media.caption}
                          </p>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}

            {/*
              Blok berkas. Arsipnya sendiri boleh dilihat, tapi berkasnya hanya
              untuk alumni ACTIVE — diputuskan di sini untuk memilih tampilan,
              dan ditegakkan ulang di endpoint unduh.
            */}
            <div className="mt-12">
              <p className="text-[10px] uppercase tracking-[0.18em] text-black/50">
                Dokumen
              </p>

              {!dokumen.berkasId ? (
                /* Belum diunggah: placeholder, bukan tombol unduh yang rusak. */
                <div className="mt-4 border border-dashed border-black/20 px-6 py-8">
                  <p className="max-w-xl text-[14px] leading-relaxed text-black/60">
                    Berkas {format ?? "dokumen"} belum diunggah. Pratinjau dan
                    tombol unduh akan muncul di sini setelah arsip terhubung ke
                    penyimpanan berkas.
                  </p>
                </div>
              ) : !sesi ? (
                /* Berkasnya ada, tapi pengunjung belum masuk sebagai alumni. */
                <div className="mt-4 border border-dashed border-black/20 px-6 py-8">
                  <p className="flex items-center gap-2 text-[14px] leading-relaxed text-black/70">
                    <LockKey weight="bold" />
                    {AKSES_ALUMNI_TERBUKA
                      ? "Dokumen ini hanya bisa dibuka oleh alumni yang sudah masuk."
                      : "Berkas arsip ini hanya bisa diunduh alumni."}
                  </p>
                  {AKSES_ALUMNI_TERBUKA ? (
                    <Link
                      href={jalurLogin}
                      className="mt-5 inline-flex items-center gap-2 bg-[#0f1012] px-5 py-2.5 text-[13px] text-white transition-opacity hover:opacity-90"
                    >
                      Masuk untuk membuka
                    </Link>
                  ) : (
                    <>
                      <p className="mt-3 max-w-xl text-[14px] leading-relaxed text-black/60">
                        Silakan hubungi tim pengurus lewat email di bawah ini
                        untuk meminta salinan berkasnya.
                      </p>
                      <TautanEmailPengurus />
                    </>
                  )}
                </div>
              ) : !bolehAmbilBerkas ? (
                /* Login, tapi akunnya belum ACTIVE (pending/suspend/ditolak). */
                <div className="mt-4 border border-dashed border-black/20 px-6 py-8">
                  <p className="flex items-center gap-2 text-[14px] leading-relaxed text-black/70">
                    <LockKey weight="bold" />
                    Akun Anda belum aktif. Selesaikan verifikasi pengurus
                    terlebih dahulu.
                  </p>
                  <Link
                    href="/alumni/status"
                    className="mt-5 inline-flex items-center gap-2 border border-black px-5 py-2.5 text-[13px] text-[#0f1012] transition-colors hover:bg-black hover:text-white"
                  >
                    Lihat status akun
                  </Link>
                  <p className="mt-4 text-[13px] leading-relaxed text-black/60">
                    Atau hubungi tim pengurus lewat email berikut.
                  </p>
                  <TautanEmailPengurus className="mt-3" />
                </div>
              ) : (
                <div className="mt-4 space-y-6">
                  {bisaDipratinjau ? (
                    <PratinjauArsip slug={dokumen.slug} jalurLogin={jalurLogin} />
                  ) : (
                    <p className="text-[14px] leading-relaxed text-black/60">
                      Format {format} tidak bisa dipratinjau di peramban. Silakan
                      unduh berkasnya untuk membukanya.
                    </p>
                  )}

                  <a
                    href={`/api/arsip/${dokumen.slug}/unduh`}
                    className="inline-flex items-center gap-2 bg-[#0f1012] px-5 py-3 text-[13px] text-white transition-opacity hover:opacity-90"
                  >
                    <DownloadSimple weight="bold" />
                    Unduh {dokumen.berkasNama ?? `dokumen (${format})`}
                  </a>
                </div>
              )}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
