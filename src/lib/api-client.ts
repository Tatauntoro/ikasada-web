/**
 * Helper request FE (FE-Planning §6).
 *
 * Satu tempat untuk membedah amplop response project
 * (`{ success, data, meta }` / `{ success: false, error }`) supaya setiap
 * komponen tidak menulis parsing sendiri-sendiri, dan supaya pesan error server
 * mentah tidak pernah ditampilkan apa adanya.
 *
 * Helper ini tidak pernah melempar: kegagalan jaringan, body bukan JSON, dan
 * status >= 500 semuanya dipetakan ke `{ ok: false }` dengan pesan yang ramah.
 */

export type ApiError = {
  code: string;
  message: string;
  fields?: Record<string, string>;
};

/** `meta` untuk response list (`okPaginated` di `@/lib/response`). */
export type MetaPaginasi = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  /**
   * Metadata tambahan per endpoint. Yang sudah ada: `unread` (permintaan masuk
   * yang belum dibaca) beserta `unreadDiterima`/`unreadDitolak`/`unreadDiputus`
   * (jawaban dan pemutusan yang belum dilihat pihak lain) pada daftar koneksi,
   * `belumDibaca` (jumlah notifikasi admin yang belum dibaca) pada daftar inbox
   * admin, dan `tahunTersedia` (opsi filter tahun) pada daftar arsip.
   */
  unread?: number;
  unreadDiterima?: number;
  unreadDitolak?: number;
  unreadDiputus?: number;
  belumDibaca?: number;
  tahunTersedia?: string[];
  /** Daftar pengurus untuk dropdown filter (halaman Aktivitas). */
  pengurus?: { id: string; nama: string }[];
  /** Jumlah koneksi per status (halaman Jejaring Alumni). */
  perStatus?: Record<string, number>;
};

export type HasilApi<T> =
  | { ok: true; data: T; meta?: MetaPaginasi }
  | { ok: false; status: number; error: ApiError };

type Amplop<T> = {
  success?: boolean;
  data?: T;
  meta?: MetaPaginasi;
  error?: { code?: string; message?: string; fields?: Record<string, string> };
};

export type OpsiApi = {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  signal?: AbortSignal;
};

const PESAN_JARINGAN = "Terjadi kesalahan jaringan. Silakan coba lagi.";
const PESAN_SERVER = "Terjadi kesalahan pada server. Silakan coba lagi.";

export async function panggilApi<T>(
  path: string,
  opsi: OpsiApi = {}
): Promise<HasilApi<T>> {
  const method = opsi.method ?? "GET";

  let res: Response;
  try {
    res = await fetch(path, {
      method,
      headers:
        opsi.body === undefined
          ? undefined
          : { "Content-Type": "application/json" },
      // Cookie httpOnly session alumni ikut terkirim, sesuai pola project.
      credentials: "include",
      body: opsi.body === undefined ? undefined : JSON.stringify(opsi.body),
      signal: opsi.signal,
    });
  } catch {
    return {
      ok: false,
      status: 0,
      error: { code: "NETWORK_ERROR", message: PESAN_JARINGAN },
    };
  }

  let amplop: Amplop<T> | null = null;
  try {
    amplop = (await res.json()) as Amplop<T>;
  } catch {
    amplop = null;
  }

  if (res.ok && amplop?.success === true) {
    // `meta` ikut diteruskan untuk response list; tanpa ini pemanggil list
    // kehilangan info pagination (`totalPages`) dan harus mem-parse sendiri.
    return { ok: true, data: amplop.data as T, meta: amplop.meta };
  }

  // Galat 5xx tidak diteruskan mentah-mentah ke UI.
  if (res.status >= 500) {
    return {
      ok: false,
      status: res.status,
      error: { code: amplop?.error?.code ?? "INTERNAL_ERROR", message: PESAN_SERVER },
    };
  }

  return {
    ok: false,
    status: res.status,
    error: {
      code: amplop?.error?.code ?? "UNKNOWN_ERROR",
      message: amplop?.error?.message ?? PESAN_JARINGAN,
      fields: amplop?.error?.fields,
    },
  };
}
