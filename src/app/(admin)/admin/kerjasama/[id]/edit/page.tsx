import { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { fieldBerubah } from "@/lib/verifikasi-diff";
import { KerjasamaForm } from "@/components/admin/KerjasamaForm";
import { KembaliAdmin } from "@/components/admin/KembaliAdmin";

export const metadata: Metadata = {
  title: "Edit Kerjasama - IKASADA",
};

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tinjau?: string }>;
};

export default async function EditKerjasamaPage({
  params,
  searchParams,
}: PageProps) {
  const { id } = await params;
  const tinjau = Boolean((await searchParams).tinjau);

  const kerjasama = await prisma.kerjasama.findUnique({
    where: { id, deletedAt: null },
  });

  if (!kerjasama) {
    notFound();
  }

  const snapshot = (kerjasama.snapshotVerifikasi ?? null) as Record<
    string,
    unknown
  > | null;
  const perubahan = tinjau
    ? fieldBerubah(
        snapshot,
        "kerjasama",
        kerjasama as unknown as Record<string, unknown>
      )
    : [];

  return (
    <div className="space-y-6">
      <KembaliAdmin
        href={tinjau ? "/admin/verifikasi" : "/admin/kerjasama"}
        label={tinjau ? "Kembali ke Verifikasi Konten" : "Kembali"}
      />
      <div>
        <h1 className="text-2xl lg:text-3xl font-normal font-serif text-[#0f1012]">
          Edit Kerjasama
        </h1>
        <p className="text-[#5e5e5e] text-sm mt-1">
          Perbarui informasi kerjasama di bawah ini.
        </p>
      </div>

      <div className="glass-card rounded-3xl p-6 lg:p-8">
        <KerjasamaForm
          mode="edit"
          initialData={kerjasama}
          id={id}
          tinjau={tinjau}
          revisi={Boolean(snapshot)}
          perubahan={perubahan}
        />
      </div>
    </div>
  );
}
