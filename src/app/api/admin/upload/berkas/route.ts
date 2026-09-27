import { NextRequest } from "next/server";
import { badRequest, ok } from "@/lib/response";
import { apiHandlerWithoutParams } from "@/lib/api-handler";
import { requireAdminAktif } from "@/lib/sesi-admin";
import {
  MAX_UKURAN_BERKAS,
  formatDariMime,
  simpanBerkasArsip,
} from "@/lib/simpan-berkas";

/**
 * Upload berkas dokumen arsip (PDF/DOC/DOCX/XLS/XLSX, maks 4 MB).
 *
 * Terpisah dari `/api/admin/upload` (gambar) karena aturannya berbeda: ukuran
 * lebih besar, penyimpanan di luar `public/`, dan Cloudinary memakai
 * `resource_type: "raw"` + `type: "authenticated"`.
 *
 * Response **tidak** memuat URL apa pun — hanya identitas berkas. URL-nya tidak
 * boleh sampai ke browser supaya pembatasan unduh alumni tidak bisa dilewati;
 * berkas diakses lewat `GET /api/arsip/[slug]/unduh`.
 */
async function handler(req: NextRequest): Promise<Response> {
  await requireAdminAktif();

  const formData = await req.formData();

  const file = formData.get("file");
  if (!file || !(file instanceof File)) {
    return badRequest("Berkas wajib diunggah");
  }

  if (!formatDariMime(file.type)) {
    return badRequest(
      "Format berkas tidak didukung. Gunakan PDF, DOC, DOCX, XLS, atau XLSX."
    );
  }

  if (file.size === 0) {
    return badRequest("Berkas kosong tidak bisa diunggah.");
  }

  if (file.size > MAX_UKURAN_BERKAS) {
    return badRequest("Ukuran berkas maksimal 4 MB.");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const hasil = await simpanBerkasArsip(buffer, file.name, file.type);

  return ok(hasil);
}

export const POST = apiHandlerWithoutParams(handler);
export const dynamic = "force-dynamic";
