import { NextRequest } from "next/server";
import { AlumniUnauthorizedError } from "@/lib/auth-alumni";
import { requireAlumniAktif } from "@/lib/sesi-alumni";
import { unauthorized } from "@/lib/response";
import { hitungJejaring } from "@/lib/permintaan-masuk";
import { buatStreamHitungan } from "@/lib/sse";

/**
 * Kanal realtime badge jejaring alumni (Server-Sent Events).
 *
 * Satu koneksi panjang per alumni `ACTIVE`. Plumbing-nya di `@/lib/sse`; sinyal
 * instan datang dari bus in-process yang dipicu route koneksi, dengan re-cek
 * database berkala sebagai jaring pengaman.
 *
 * Yang dikirim tiga angka sekaligus: permintaan masuk yang belum dibaca, serta
 * jawaban diterima/ditolak yang belum dilihat pengirim (lihat `hitungJejaring`).
 * Semuanya milik pemanggil sendiri, jadi tidak ada data alumni lain yang bocor.
 *
 * Handler ini **tidak** dibungkus `apiHandlerWithoutParams` karena menambah
 * header pada objek `Response` streaming sebaiknya dihindari; penjagaannya
 * manual dengan `requireAlumniAktif()`.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest): Promise<Response> {
  let accountId: string;
  try {
    const saya = await requireAlumniAktif();
    accountId = saya.sub;
  } catch (error) {
    if (error instanceof AlumniUnauthorizedError) {
      return unauthorized(error.message);
    }
    throw error;
  }

  return buatStreamHitungan(() => hitungJejaring(accountId), req.signal, {
    label: "Jejaring alumni",
  });
}
