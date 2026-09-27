import { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { KegiatanForm } from "@/components/admin/KegiatanForm";

export const metadata: Metadata = {
  title: "Edit Kegiatan - IKASADA",
};

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditKegiatanPage({ params }: PageProps) {
  const { id } = await params;

  const kegiatan = await prisma.kegiatan.findUnique({
    where: { id, deletedAt: null },
  });

  if (!kegiatan) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-normal font-serif text-[#0f1012]">
          Edit Kegiatan
        </h1>
        <p className="text-[#5e5e5e] text-sm mt-1">
          Perbarui informasi kegiatan di bawah ini.
        </p>
      </div>

      <div className="glass-card rounded-3xl p-6 lg:p-8">
        <KegiatanForm mode="edit" initialData={kegiatan} id={id} />
      </div>
    </div>
  );
}
