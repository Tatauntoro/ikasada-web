import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  EnvelopeSimple,
  InstagramLogo,
  TiktokLogo,
} from "@phosphor-icons/react/dist/ssr";
import Breadcrumb from "@/components/Breadcrumb";
import { prisma } from "@/lib/db";

const GAMBAR_CADANGAN = "/images/placeholder-event.jpg";

type PageProps = {
  params: Promise<{ slug: string }>;
};

/**
 * Ambil `@username` dari URL kanal sosial untuk ditampilkan sebagai nilainya.
 * Kalau URL-nya tidak bisa dibaca, nilai mentahnya dipakai apa adanya.
 */
function handleDari(url: string): string {
  try {
    const segmen = new URL(url).pathname.split("/").filter(Boolean)[0];
    return segmen ? `@${segmen}` : url;
  } catch {
    return url;
  }
}

type ItemKerjasama = {
  linkInstagram: string | null;
  linkTiktok: string | null;
  email: string | null;
};

type Kanal = {
  label: string;
  nilai: string;
  href: string;
  Ikon: typeof InstagramLogo;
};

/** Kanal yang diisi admin saja yang dirender; urutannya tetap. */
function kanalDari(item: ItemKerjasama): Kanal[] {
  const kanal: Kanal[] = [];

  if (item.linkInstagram) {
    kanal.push({
      label: "Instagram",
      nilai: handleDari(item.linkInstagram),
      href: item.linkInstagram,
      Ikon: InstagramLogo,
    });
  }

  if (item.linkTiktok) {
    kanal.push({
      label: "TikTok",
      nilai: handleDari(item.linkTiktok),
      href: item.linkTiktok,
      Ikon: TiktokLogo,
    });
  }

  if (item.email) {
    kanal.push({
      label: "Email",
      nilai: item.email,
      href: `mailto:${item.email}`,
      Ikon: EnvelopeSimple,
    });
  }

  return kanal;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const item = await prisma.kerjasama.findFirst({
    where: { slug, status: "PUBLISHED", deletedAt: null },
  });

  if (!item) {
    return { title: "Kerjasama Tidak Ditemukan - IKASADA" };
  }

  return {
    title: `${item.organisasi} - IKASADA`,
    description: item.profil,
  };
}

export default async function KerjasamaDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const item = await prisma.kerjasama.findFirst({
    where: { slug, status: "PUBLISHED", deletedAt: null },
  });

  if (!item) notFound();

  const kanal = kanalDari(item);

  return (
    <section className="public-page relative w-full bg-white">
      <div className="mx-auto max-w-[1400px] px-6 pb-32 pt-24 md:px-12 md:pb-48 md:pt-32">
        <Breadcrumb
          className="mb-12"
          items={[
            { label: "Beranda", href: "/" },
            { label: "Kerjasama Kami", href: "/#journal" },
            { label: item.organisasi },
          ]}
        />

        {/* Hero — dokumentasi kerjasama */}
        <div className="relative aspect-[4/3] w-full overflow-hidden border border-black/10 sm:aspect-[16/9] lg:aspect-[21/9]">
          <Image
            src={item.imageUrl ?? GAMBAR_CADANGAN}
            alt={item.alt}
            fill
            sizes="100vw"
            className="object-cover"
          />
        </div>

        {/* Konten */}
        <div className="mt-12 grid gap-12 md:grid-cols-12">
          <div className="md:col-span-7">
            <span className="mb-6 block text-[10px] uppercase tracking-widest text-black/60">
              Profil
            </span>
            <h1 className="mb-6 font-serif text-[length:var(--text-display-page)] font-normal leading-tight tracking-[-0.03em] text-neutral-900">
              {item.organisasi}
            </h1>
            <p className="mb-4 max-w-2xl font-normal leading-relaxed text-black/70">
              {item.profil}
            </p>
          </div>

          <div className="md:col-span-5">
            <h2 className="border-t border-black/10 pt-6 text-[10px] uppercase tracking-widest text-black/60">
              Contoh Kegiatan
            </h2>
            <ul className="mt-5 space-y-4">
              {item.contohKegiatan.map((kegiatan) => (
                <li
                  key={kegiatan}
                  className="flex gap-3 text-sm font-normal leading-relaxed text-black/80"
                >
                  <span aria-hidden="true" className="text-black/30">
                    —
                  </span>
                  {kegiatan}
                </li>
              ))}
            </ul>

            {kanal.length > 0 && (
              <section className="mt-12">
                <h2 className="border-t border-black/10 pt-6 text-[10px] uppercase tracking-widest text-black/60">
                  Hubungi Kami
                </h2>
                <p className="mt-4 max-w-sm text-sm font-normal leading-relaxed text-black/70">
                  Terbuka untuk kolaborasi, pertanyaan program, maupun ajakan
                  kegiatan bersama {item.organisasi}.
                </p>
                <ul className="mt-6 space-y-3">
                  {kanal.map(({ label, nilai, href, Ikon }) => (
                    <li key={label}>
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group inline-flex items-center gap-3"
                      >
                        <Ikon
                          weight="bold"
                          aria-hidden="true"
                          className="text-[18px] text-black/35 transition-colors group-hover:text-black"
                        />
                        <span className="text-[10px] uppercase tracking-widest text-black/50">
                          {label}
                        </span>
                        <span className="text-sm font-normal text-black/80 underline-offset-4 transition-colors group-hover:text-black group-hover:underline">
                          {nilai}
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
