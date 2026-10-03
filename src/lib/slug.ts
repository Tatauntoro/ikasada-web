import { Prisma, PrismaClient } from "@/generated/prisma/client";

export function generateSlug(judul: string): string {
  return judul
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\-]/g, "")
    .replace(/\-+/g, "-")
    .replace(/^\-|\-$/g, "")
    .slice(0, 150);
}

export async function generateUniqueSlug(
  judul: string,
  client: PrismaClient | Prisma.TransactionClient,
  options: {
    existingId?: string;
    table?: "kegiatan" | "alumni" | "kerjasama" | "arsip" | "berita";
  } = {}
): Promise<string> {
  const { existingId, table = "kegiatan" } = options;
  const baseSlug = generateSlug(judul) || "untitled";

  let slug = baseSlug;
  let counter = 2;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const model = client[table] as any;

  while (true) {
    const existing = await model.findUnique({
      where: { slug },
    });

    if (!existing) {
      return slug;
    }

    if (existingId && existing.id === existingId) {
      return slug;
    }

    slug = `${baseSlug}-${counter}`;
    counter += 1;

    if (counter > 1000) {
      throw new Error("Tidak dapat menghasilkan slug unik");
    }
  }
}
