import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { StatusAlumniAccount } from "@/generated/prisma/enums";
import { ALUMNI_SESSION_COOKIE_NAME, getAlumniSession } from "@/lib/auth-alumni";
import { prisma } from "@/lib/db";
import {
  alumniAccountSelect,
  type AkunAlumniUntukResponse,
} from "@/lib/mapper-alumni-account";

/**
 * Penjaga halaman privat alumni (FE-Planning §2).
 *
 * Dipakai halaman `/alumni/status` dan `/alumni/jejaring` supaya aturan
 * pengalihannya hanya ada di satu tempat. Halaman privat dirender di server,
 * jadi pengunjung yang tidak berhak dialihkan **sebelum** satu pun data akun
 * dirender — bukan sesudah, dengan data yang sudah terkirim ke browser.
 */

export type HalamanAlumni = {
  akun: AkunAlumniUntukResponse;
};

/**
 * Session alumni yang sah beserta akunnya, apa pun status verifikasinya.
 *
 * Cookie yang masih terpasang tetapi tidak lagi lolos verifikasi dibedakan dari
 * cookie yang tidak ada sama sekali: yang pertama berarti sessionnya berakhir,
 * dan halaman login perlu menyampaikan itu (§9).
 */
export async function akunAlumniHalaman(jalur: string): Promise<HalamanAlumni> {
  const sesi = await getAlumniSession();

  if (!sesi) {
    const cookieStore = await cookies();
    const sesiBerakhir = cookieStore.has(ALUMNI_SESSION_COOKIE_NAME);
    const tujuan = `/alumni/login?next=${encodeURIComponent(jalur)}`;

    redirect(`${tujuan}${sesiBerakhir ? "&sesi=berakhir" : ""}`);
  }

  const akun = await prisma.alumniAccount.findUnique({
    where: { id: sesi.sub },
    select: alumniAccountSelect,
  });

  if (!akun) {
    redirect(`/alumni/login?next=${encodeURIComponent(jalur)}`);
  }

  return { akun };
}

/**
 * Sama seperti di atas, tetapi menuntut akun `ACTIVE`.
 *
 * Pendaftar yang belum disetujui diarahkan ke halaman status verifikasinya —
 * bukan ke login, karena ia sudah punya session dan justru perlu melihat
 * kenapa fiturnya belum terbuka.
 */
export async function akunAlumniAktifHalaman(
  jalur: string
): Promise<HalamanAlumni> {
  const { akun } = await akunAlumniHalaman(jalur);

  if (akun.status !== StatusAlumniAccount.ACTIVE) {
    redirect("/alumni/status");
  }

  return { akun };
}
