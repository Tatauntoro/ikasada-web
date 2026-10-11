import { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { fieldBerubah } from "@/lib/verifikasi-diff";
import { BeritaForm } from "@/components/admin/BeritaForm";
import { KembaliAdmin } from "@/components/admin/KembaliAdmin";

export const metadata: Metadata = {
  title: "Edit Berita - IKASADA",
};

export default async function EditBeritaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tinjau?: string }>;
}) {
  const { id } = await params;
  const tinjau = Boolean((await searchParams).tinjau);

  const berita = await prisma.berita.findFirst({
    where: { id, deletedAt: null },
    include: {
      jenisBerita: true,
      media: { orderBy: { urutan: "asc" } },
    },
  });

  if (!berita) notFound();

  const snapshot = (berita.snapshotVerifikasi ?? null) as Record<
    string,
    unknown
  > | null;
  const perubahan = tinjau
    ? fieldBerubah(
        snapshot,
        "berita",
        berita as unknown as Record<string, unknown>
      )
    : [];

  return (
    <div className="space-y-6">
      <KembaliAdmin
        href={tinjau ? "/admin/verifikasi" : "/admin/berita"}
        label={tinjau ? "Kembali ke Verifikasi Konten" : "Kembali"}
      />
      <div>
        <h1 className="text-2xl lg:text-3xl font-normal font-serif text-[#0f1012]">
          Edit Berita
        </h1>
        <p className="text-[#5e5e5e] text-sm mt-1">
          Perbarui detail berita di bawah ini.
        </p>
      </div>

      <div className="glass-card rounded-3xl p-6 lg:p-8">
        <BeritaForm
          mode="edit"
          initialData={berita}
          id={id}
          tinjau={tinjau}
          revisi={Boolean(snapshot)}
          perubahan={perubahan}
        />
      </div>
    </div>
  );
}
