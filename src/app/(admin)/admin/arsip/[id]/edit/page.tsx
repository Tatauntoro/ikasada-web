import { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { fieldBerubah } from "@/lib/verifikasi-diff";
import { ArsipForm } from "@/components/admin/ArsipForm";
import { KembaliAdmin } from "@/components/admin/KembaliAdmin";

export const metadata: Metadata = {
  title: "Edit Arsip - IKASADA",
};

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tinjau?: string }>;
};

export default async function EditArsipPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const tinjau = Boolean((await searchParams).tinjau);

  const arsip = await prisma.arsip.findUnique({
    where: { id, deletedAt: null },
    include: { media: { orderBy: { urutan: "asc" } } },
  });

  if (!arsip) {
    notFound();
  }

  const snapshot = (arsip.snapshotVerifikasi ?? null) as Record<
    string,
    unknown
  > | null;
  const perubahan = tinjau
    ? fieldBerubah(
        snapshot,
        "arsip",
        arsip as unknown as Record<string, unknown>
      )
    : [];

  const { media, ...dataArsip } = arsip;

  return (
    <div className="space-y-6">
      <KembaliAdmin
        href={tinjau ? "/admin/verifikasi" : "/admin/arsip"}
        label={tinjau ? "Kembali ke Verifikasi Konten" : "Kembali"}
      />
      <div>
        <h1 className="text-2xl lg:text-3xl font-normal font-serif text-[#0f1012]">
          Edit Arsip
        </h1>
        <p className="text-[#5e5e5e] text-sm mt-1">
          Perbarui informasi dokumen arsip di bawah ini.
        </p>
      </div>

      <div className="glass-card rounded-3xl p-6 lg:p-8">
        <ArsipForm
          mode="edit"
          initialData={dataArsip}
          initialMedia={media}
          id={id}
          tinjau={tinjau}
          revisi={Boolean(snapshot)}
          perubahan={perubahan}
        />
      </div>
    </div>
  );
}
