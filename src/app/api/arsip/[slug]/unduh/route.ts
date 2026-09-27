import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { apiHandler } from "@/lib/api-handler";
import { notFound } from "@/lib/response";
import { requireAlumniAktif, alumniAktif } from "@/lib/sesi-alumni";
import { catatAudit } from "@/lib/audit";
import { bolehUnduh } from "@/lib/akses-arsip";
import { bacaBerkasArsip, mimeDariFormat } from "@/lib/simpan-berkas";

/**
 * Satu-satunya jalan keluar berkas dokumen arsip.
 *
 * Siapa yang boleh mengambilnya ditentukan arsipnya sendiri (`akses`):
 * - `PUBLIK` — siapa saja.
 * - `PUBLIK_UNDUH_ALUMNI` dan `KHUSUS_ALUMNI` — alumni ACTIVE saja (401).
 *
 * Arsip `KHUSUS_ALUMNI` memang tetap tampil di publik dalam mode terkunci,
 * jadi 401 di sini justru informatif: pengunjungnya diajak masuk, bukan diberi
 * 404 yang membingungkan.
 *
 * `requireAlumniAktif()` memeriksa status akun ke database (bukan hanya klaim
 * token), jadi alumni yang di-suspend setelah login langsung kehilangan akses.
 * Token admin ditolak di sini karena `verifyAlumniToken` mensyaratkan claim
 * `type: "alumni"`.
 *
 * `?mode=inline` dipakai untuk pratinjau PDF di halaman detail; tanpa itu
 * berkas dikirim sebagai lampiran (unduhan).
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteParams = {
  params: Promise<{ slug: string }>;
};

async function handler(
  req: NextRequest,
  { params }: RouteParams
): Promise<Response> {
  const { slug } = await params;

  const arsip = await prisma.arsip.findFirst({
    where: { slug, status: "PUBLISHED", deletedAt: null },
  });

  if (!arsip) {
    return notFound("Arsip tidak ditemukan");
  }

  let sesiAlumni = await alumniAktif();

  if (!bolehUnduh(arsip.akses, Boolean(sesiAlumni))) {
    // Melempar 401 lewat api-handler dengan pesan status akun yang jelas.
    sesiAlumni = await requireAlumniAktif();
  }

  const inline = req.nextUrl.searchParams.get("mode") === "inline";

  if (!arsip.berkasId || !arsip.berkasPenyimpanan) {
    return notFound("Berkas arsip ini belum diunggah");
  }

  const isi = await bacaBerkasArsip({
    berkasId: arsip.berkasId,
    penyimpanan: arsip.berkasPenyimpanan,
    berkasFormat: arsip.berkasFormat,
  });

  /*
   * Berkasnya mungkin sudah tidak ada di penyimpanan (mis. berkas lokal yang
   * hilang, atau aset dihapus dari penyimpanan objek). Itu bukan kesalahan
   * permintaan, jadi dijawab 404 dengan pesan yang menjelaskan — bukan 500.
   */
  if (!isi) {
    return notFound(
      "Berkas arsip ini tidak ditemukan di penyimpanan. Hubungi pengurus untuk mengunggahnya kembali."
    );
  }

  /*
   * Yang dihitung sebagai "unduhan" hanya pengambilan sebagai lampiran;
   * pratinjau tidak menambah angka, supaya `jumlahUnduhan` berarti benar-benar
   * diunduh. Audit memakai actor alumni bila ada; untuk arsip publik yang
   * diunduh tanpa login, tidak ada actor yang bisa dicatat.
   */
  if (!inline) {
    await prisma.$transaction(async (tx) => {
      await tx.arsip.update({
        where: { id: arsip.id },
        data: { jumlahUnduhan: { increment: 1 } },
      });

      if (sesiAlumni) {
        await catatAudit(tx, {
          alumniAccountId: sesiAlumni.sub,
          aksi: "ARSIP_UNDUH",
          entitas: "Arsip",
          entitasId: arsip.id,
        });
      }
    });
  }

  const format = arsip.berkasFormat ?? "";
  const namaBerkas = (
    arsip.berkasNama ?? `${arsip.slug}.${format || "bin"}`
  ).replace(/["\r\n]/g, "");

  return new Response(new Uint8Array(isi), {
    status: 200,
    headers: {
      "Content-Type": mimeDariFormat(format),
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${namaBerkas}"`,
      "Content-Length": String(isi.byteLength),
      "Cache-Control": "private, no-store",
    },
  });
}

export const GET = apiHandler(handler);
