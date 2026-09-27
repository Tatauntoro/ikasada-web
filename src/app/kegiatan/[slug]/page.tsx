import { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { formatTanggalWIB } from "@/lib/format";
import Breadcrumb from "@/components/Breadcrumb";
import VideoPreviewCard from "@/components/VideoPreviewCard";
import { MorphHeroImage } from "@/components/motion/ImageMorph";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const kegiatan = await prisma.kegiatan.findFirst({
    where: { slug, status: "PUBLISHED", deletedAt: null },
  });

  if (!kegiatan) {
    return { title: "Kegiatan Tidak Ditemukan - IKASADA" };
  }

  return {
    title: `${kegiatan.judul} - IKASADA`,
    description: kegiatan.deskripsiSingkat,
  };
}

export default async function KegiatanDetailPage({ params }: PageProps) {
  const { slug } = await params;

  const kegiatan = await prisma.kegiatan.findFirst({
    where: { slug, status: "PUBLISHED", deletedAt: null },
    include: { kategoriKegiatan: true },
  });

  if (!kegiatan) {
    notFound();
  }

  const namaKategori = kegiatan.kategoriKegiatan.namaKategori;

  const videoId = kegiatan.videoYoutubeId;

  const durasiHari = kegiatan.tanggalSelesai
    ? Math.max(
        1,
        Math.round(
          (new Date(kegiatan.tanggalSelesai).getTime() -
            new Date(kegiatan.tanggalMulai).getTime()) /
            86400000
        ) + 1
      )
    : 1;

  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    kegiatan.lokasi
  )}`;

  const tanggal =
    formatTanggalWIB(kegiatan.tanggalMulai) +
    (kegiatan.tanggalSelesai
      ? ` – ${formatTanggalWIB(kegiatan.tanggalSelesai)}`
      : "");

  const isiParagraf = (kegiatan.deskripsiLengkap ?? "")
    .split(/\n+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const specs = [
    { label: "Tanggal", value: tanggal },
    { label: "Durasi", value: `${durasiHari} Hari` },
    { label: "Lokasi", value: kegiatan.lokasi },
    { label: "Penyelenggara", value: "IKASADA FIB UI" },
  ];

  return (
    <section className="public-page relative w-full bg-white">
      <div className="mx-auto max-w-[1400px] px-6 pb-32 pt-24 md:px-12 md:pb-48 md:pt-32">
        <Breadcrumb
          className="mb-12"
          items={[
            { label: "Beranda", href: "/" },
            { label: "Kegiatan", href: "/event" },
            { label: kegiatan.judul },
          ]}
        />

        {/* Hero — gambar kegiatan */}
        <div className="group relative w-full overflow-hidden border border-black/10">
          <div className="aspect-[4/3] w-full sm:aspect-[16/9] lg:aspect-[21/9]">
            {kegiatan.gambarThumbnailUrl ? (
              <MorphHeroImage
                src={kegiatan.gambarThumbnailUrl}
                alt={kegiatan.judul}
                className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.02]"
              />
            ) : (
              <div className="h-full w-full bg-gradient-to-br from-neutral-200 to-neutral-400" />
            )}
          </div>

          <div className="absolute bottom-4 left-4 z-10 rounded-[2px] border border-black/10 bg-[#fdfdfd]/90 px-4 py-2">
            <span className="text-[10px] font-normal uppercase tracking-widest text-black">
              {kegiatan.lokasi}
            </span>
          </div>
        </div>

        {/* Konten */}
        <div className="mt-12 grid gap-12 md:grid-cols-12">
          <div className="md:col-span-7">
            <span className="mb-6 block text-[10px] uppercase tracking-widest text-black/60">
              Kegiatan — {namaKategori}
            </span>
            <h1 className="mb-6 font-serif text-[length:var(--text-display-page)] font-normal leading-tight tracking-[-0.03em] text-neutral-900">
              {kegiatan.judul}
            </h1>
            <p className="mb-4 max-w-2xl font-normal leading-relaxed text-black/70">
              {kegiatan.deskripsiSingkat}
            </p>
            {isiParagraf.map((paragraf, i) => (
              <p
                key={i}
                className="mb-4 max-w-2xl font-normal leading-relaxed text-black/70"
              >
                {paragraf}
              </p>
            ))}

            {videoId && (
              <div className="mt-12 max-w-2xl border-t border-black/10 pt-8">
                <h2 className="mb-6 text-xs font-normal uppercase tracking-widest text-black/60">
                  Lihat Video
                </h2>
                <VideoPreviewCard
                  videoId={videoId}
                  kategori={namaKategori}
                  durasi={`${durasiHari} Hari`}
                  description="Tonton rekaman dokumentasi kegiatan ini."
                />
              </div>
            )}
          </div>

          <div className="md:col-span-5">
            {/* Spesifikasi */}
            <div className="grid grid-cols-1 gap-x-4 gap-y-5 border-t border-black/10 pt-6 sm:grid-cols-2">
              {specs.map((spec) => (
                <div key={spec.label} className="flex items-baseline gap-2">
                  <span className="shrink-0 text-[10px] font-normal uppercase tracking-widest text-black/60">
                    {spec.label}
                  </span>
                  <span className="text-[10px] font-normal text-black/30">—</span>
                  <span className="text-sm font-normal text-black">
                    {spec.value}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-10 flex flex-col items-start gap-4">
              {kegiatan.linkPendaftaran ? (
                <a
                  href={kegiatan.linkPendaftaran}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block rounded-[2px] border border-black/40 px-8 py-3 text-[10px] uppercase tracking-widest transition-colors duration-500 hover:bg-black hover:text-white"
                >
                  Daftar / Ikuti Kegiatan
                </a>
              ) : (
                <span className="text-sm font-normal text-black/60">
                  Terbuka untuk umum, tanpa pendaftaran.
                </span>
              )}

              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="border-b border-black/30 pb-0.5 text-[10px] uppercase tracking-widest text-black/60 transition-colors hover:border-black hover:text-black"
              >
                Lihat Lokasi
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
