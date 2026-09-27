import { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { AlumniForm } from "@/components/admin/AlumniForm";

export const metadata: Metadata = {
  title: "Edit Alumni - IKASADA",
};

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditAlumniPage({ params }: PageProps) {
  const { id } = await params;

  const alumni = await prisma.alumni.findUnique({
    where: { id, deletedAt: null },
  });

  if (!alumni) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-normal font-serif text-[#0f1012]">
          Edit Alumni
        </h1>
        <p className="text-[#5e5e5e] text-sm mt-1">
          Perbarui informasi alumni di bawah ini.
        </p>
      </div>

      <div className="glass-card rounded-3xl p-6 lg:p-8">
        <AlumniForm mode="edit" initialData={alumni} id={id} />
      </div>
    </div>
  );
}
