import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import {
  badRequest,
  ok,
  unauthorized,
  validationError,
} from "@/lib/response";
import { apiHandler, readJsonBody } from "@/lib/api-handler";
import { requireAlumniAktif } from "@/lib/sesi-alumni";
import { catatAudit, diffPerubahan } from "@/lib/audit";
import { alumniPreferensiSchema } from "@/lib/validations/alumni-account";
import {
  alumniAccountSelect,
  toAlumniAccountResponse,
  type AkunAlumniUntukResponse,
} from "@/lib/mapper-alumni-account";

/**
 * Profil dan preferensi milik alumni yang sedang login (BE-Planning §4.2).
 *
 * Pemilik data selalu diambil dari session (`session.sub`), tidak pernah dari
 * body atau parameter, jadi tidak ada cara mengubah preferensi akun lain.
 * Endpoint ini privat: `requireAlumniAktif()` menuntut session valid **dan**
 * akun `ACTIVE` menurut database, sehingga suspend yang terjadi setelah login
 * langsung berlaku.
 */
const PREFERENSI = (akun: AkunAlumniUntukResponse) => ({
  openToCollaboration: akun.openToCollaboration,
  openToOpportunity: akun.openToOpportunity,
  showEmailToConnections: akun.showEmailToConnections,
  showWhatsappToConnections: akun.showWhatsappToConnections,
  showSocialLinksToConnections: akun.showSocialLinksToConnections,
});

async function ambilAkunMilikSession(): Promise<
  AkunAlumniUntukResponse | undefined
> {
  const session = await requireAlumniAktif();

  const akun = await prisma.alumniAccount.findUnique({
    where: { id: session.sub },
    select: alumniAccountSelect,
  });

  return akun ?? undefined;
}

async function handleGet(): Promise<Response> {
  const akun = await ambilAkunMilikSession();
  if (!akun) {
    return unauthorized("Sesi tidak valid. Silakan login kembali.");
  }

  return ok(toAlumniAccountResponse(akun));
}

async function handlePatch(req: NextRequest): Promise<Response> {
  const akun = await ambilAkunMilikSession();
  if (!akun) {
    return unauthorized("Sesi tidak valid. Silakan login kembali.");
  }

  const body = await readJsonBody(req);
  const parsed = alumniPreferensiSchema.safeParse(body);
  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const hasil = await prisma.$transaction(async (tx) => {
    const diperbarui = await tx.alumniAccount.update({
      where: { id: akun.id },
      data: parsed.data,
      select: alumniAccountSelect,
    });

    const perubahan = diffPerubahan(PREFERENSI(akun), PREFERENSI(diperbarui));

    // PATCH dengan nilai yang sama tidak menghasilkan perubahan: tidak ada yang
    // perlu dicatat, jadi audit tidak ditulis.
    if (Object.keys(perubahan).length > 0) {
      const adaPerubahanKeterbukaan =
        perubahan.openToCollaboration !== undefined ||
        perubahan.openToOpportunity !== undefined;

      await catatAudit(tx, {
        alumniAccountId: akun.id,
        // `AksiAudit` hanya punya satu nilai khusus keterbukaan; perubahan
        // visibilitas kontak dicatat sebagai `UPDATE` dengan diff yang sama.
        aksi: adaPerubahanKeterbukaan
          ? "ALUMNI_UPDATE_AVAILABILITY"
          : "UPDATE",
        entitas: "AlumniAccount",
        entitasId: akun.id,
        detailPerubahan: perubahan,
      });
    }

    return diperbarui;
  });

  return ok(toAlumniAccountResponse(hasil));
}

async function handler(req: NextRequest): Promise<Response> {
  if (req.method === "GET") {
    return handleGet();
  }

  if (req.method === "PATCH") {
    return handlePatch(req);
  }

  return badRequest("Method tidak didukung");
}

export const GET = apiHandler(handler);
export const PATCH = apiHandler(handler);
export const dynamic = "force-dynamic";
