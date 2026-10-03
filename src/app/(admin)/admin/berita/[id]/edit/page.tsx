import { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { BeritaForm } from "@/components/admin/BeritaForm";

export const metadata: Metadata = {
  title: "Edit Berita - IKASADA",
};

export default async function EditBeritaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const berita = await prisma.berita.findFirst({
    where: { id, deletedAt: null },
    include: { jenisBerita: true },
  });

  if (!berita) notFound();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-normal font-serif text-[#0f1012]">
          Edit Berita
        </h1>
        <p className="text-[#5e5e5e] text-sm mt-1">
          Perbarui detail berita di bawah ini.
        </p>
      </div>

      <div className="glass-card rounded-3xl p-6 lg:p-8">
        <BeritaForm mode="edit" initialData={berita} id={id} />
      </div>
    </div>
  );
}
