import { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { ArsipForm } from "@/components/admin/ArsipForm";

export const metadata: Metadata = {
  title: "Edit Arsip - IKASADA",
};

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditArsipPage({ params }: PageProps) {
  const { id } = await params;

  const arsip = await prisma.arsip.findUnique({
    where: { id, deletedAt: null },
    include: { media: { orderBy: { urutan: "asc" } } },
  });

  if (!arsip) {
    notFound();
  }

  const { media, ...dataArsip } = arsip;

  return (
    <div className="space-y-6">
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
        />
      </div>
    </div>
  );
}
