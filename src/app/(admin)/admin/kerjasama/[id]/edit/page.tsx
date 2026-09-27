import { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { KerjasamaForm } from "@/components/admin/KerjasamaForm";

export const metadata: Metadata = {
  title: "Edit Kerjasama - IKASADA",
};

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditKerjasamaPage({ params }: PageProps) {
  const { id } = await params;

  const kerjasama = await prisma.kerjasama.findUnique({
    where: { id, deletedAt: null },
  });

  if (!kerjasama) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-normal font-serif text-[#0f1012]">
          Edit Kerjasama
        </h1>
        <p className="text-[#5e5e5e] text-sm mt-1">
          Perbarui informasi kerjasama di bawah ini.
        </p>
      </div>

      <div className="glass-card rounded-3xl p-6 lg:p-8">
        <KerjasamaForm mode="edit" initialData={kerjasama} id={id} />
      </div>
    </div>
  );
}
