import { NextRequest } from "next/server";
import { Prisma, StatusAlumniAccount } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import {
  badRequest,
  conflict,
  notFound,
  ok,
  validationError,
} from "@/lib/response";
import { apiHandler, readJsonBody } from "@/lib/api-handler";
import { requirePermission } from "@/lib/sesi-admin";
import { AKSI, MODUL } from "@/lib/permission";
import { catatAudit, diffPerubahan } from "@/lib/audit";
import { publikasiNotifikasi } from "@/lib/notifikasi-events";
import { alumniApproveSchema } from "@/lib/validations/alumni-account";
import {
  alumniAccountAdminSelect,
  ambilAkunAlumni,
} from "@/lib/alumni-account-admin";

/**
 * Approve akun alumni (BE-Planning §4.5, §6).
 *
 * Pengurus mencocokkan akun dengan record `Alumni` yang sudah ada. Selain
 * `PENDING`, aksi ini juga menerima `REJECTED` dan `SUSPENDED` supaya suspend
 * tidak menjadi pintu satu arah; akun yang sudah `ACTIVE` ditolak `409`.
 *
 * Satu `Alumni` hanya boleh punya satu akun: dicek di sini untuk pesan yang
 * jelas, dan dijaga `@unique` pada `alumniId` kalau dua admin menyetujui
 * bersamaan.
 */
type RouteParams = {
  params: Promise<{ id: string }>;
};

async function handler(
  req: NextRequest,
  { params }: RouteParams
): Promise<Response> {
  const session = await requirePermission(MODUL.VERIFIKASI_AKUN, AKSI.UBAH);
  const { id } = await params;

  const akun = await ambilAkunAlumni(id);
  if (!akun) {
    return notFound("Akun alumni tidak ditemukan");
  }

  if (akun.status === StatusAlumniAccount.ACTIVE) {
    return conflict("Akun ini sudah aktif");
  }

  const body = await readJsonBody(req);
  const parsed = alumniApproveSchema.safeParse(body);
  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const { alumniId, samakanEmail } = parsed.data;

  const alumni = await prisma.alumni.findFirst({
    where: { id: alumniId, deletedAt: null, status: "PUBLISHED" },
    select: { id: true, namaLengkap: true, email: true },
  });

  if (!alumni) {
    return badRequest("Alumni tidak valid", {
      alumniId: "Alumni harus berstatus PUBLISHED dan belum dihapus",
    });
  }

  const pemakaiAlumni = await prisma.alumniAccount.findUnique({
    where: { alumniId },
    select: { id: true, status: true },
  });

  if (pemakaiAlumni && pemakaiAlumni.id !== id) {
    return conflict(
      "Alumni ini sudah tertaut ke akun lain. Tangani akun tersebut lebih dulu."
    );
  }

  try {
    const hasil = await prisma.$transaction(async (tx) => {
      const diperbarui = await tx.alumniAccount.update({
        where: { id },
        data: {
          status: StatusAlumniAccount.ACTIVE,
          alumniId,
          approvedAt: new Date(),
          rejectedAt: null,
          suspendedAt: null,
        },
        select: alumniAccountAdminSelect,
      });

      await catatAudit(tx, {
        adminId: session.sub,
        aksi: "ALUMNI_APPROVE",
        entitas: "AlumniAccount",
        entitasId: id,
        detailPerubahan: diffPerubahan(
          { status: akun.status, alumniId: akun.alumni?.id ?? null },
          {
            status: diperbarui.status,
            alumniId: diperbarui.alumni?.id ?? null,
          }
        ),
      });

      /*
       * Email record direktori diselaraskan dengan email akun (email yang
       * benar-benar dipakai login) dalam dua kondisi:
       * - direktorinya masih kosong → diisi otomatis tanpa perlu konfirmasi;
       * - pengurus mencentang "samakan email" saat nilainya berbeda → ditimpa.
       * Kalau kosong DAN tidak dicentang, tetap diisi; kalau sudah terisi dan
       * berbeda tanpa centang, nilainya dibiarkan (admin yang memutuskan).
       */
      const emailDirektori = alumni.email?.trim() ?? "";
      const emailAkun = akun.email;
      const perluGantiEmail =
        emailDirektori.length === 0 ||
        (samakanEmail === true &&
          emailDirektori.toLowerCase() !== emailAkun.toLowerCase());

      if (perluGantiEmail) {
        await tx.alumni.update({
          where: { id: alumniId },
          data: { email: emailAkun },
        });

        await catatAudit(tx, {
          adminId: session.sub,
          aksi: "UPDATE",
          entitas: "Alumni",
          entitasId: alumniId,
          detailPerubahan: diffPerubahan(
            { email: alumni.email },
            { email: emailAkun }
          ),
        });
      }

      return diperbarui;
    });

    /*
     * Ping realtime status akun: pendaftar yang sedang membuka beranda/halaman
     * status langsung tahu akunnya disetujui (kanal `/api/alumni/status/stream`).
     * Persistennya tetap baris AuditLog di transaksi di atas.
     */
    publikasiNotifikasi({ aksi: "ALUMNI_APPROVE", entitasId: id });

    return ok(hasil);
  } catch (error) {
    // Pengaman terakhir kalau dua admin menyetujui alumni yang sama bersamaan.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return conflict(
        "Alumni ini baru saja tertaut ke akun lain. Muat ulang daftar dan coba lagi."
      );
    }
    throw error;
  }
}

export const POST = apiHandler(handler);
export const dynamic = "force-dynamic";
