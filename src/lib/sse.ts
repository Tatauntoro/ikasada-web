import { langganNotifikasi } from "@/lib/notifikasi-events";

/**
 * Kerangka kanal realtime (Server-Sent Events) untuk sebuah angka.
 *
 * Dipakai bersama oleh badge notifikasi admin dan badge permintaan masuk alumni.
 * Yang berbeda antar pemakai hanya fungsi `hitung()` dan nama field payload-nya;
 * seluruh plumbing-nya sama:
 *
 * - `event: snapshot` dikirim begitu koneksi dibuka;
 * - `event: notifikasi` dikirim saat bus in-process (`@/lib/notifikasi-events`)
 *   memberi sinyal bahwa ada aksi baru;
 * - sebagai jaring pengaman, angkanya dihitung ulang dari database secara
 *   berkala — sehingga nilai tetap benar walau sinyal bus terlewat (mis. proses
 *   lain) atau koneksi sempat putus;
 * - heartbeat menjaga koneksi menganggur tidak ditutup proxy;
 * - semua interval dibersihkan saat klien memutus koneksi.
 */

/** Heartbeat supaya proxy tidak menutup koneksi yang menganggur. */
const HEARTBEAT_MS = 25_000;
/** Re-cek database untuk jaring pengaman lintas instance. */
const RE_CEK_MS = 20_000;

export type OpsiStreamHitungan = {
  /** Label untuk pesan log error. */
  label?: string;
};

/**
 * Satu angka atau sekumpulan angka sekaligus (mis. jumlah permintaan masuk dan
 * jumlah jawaban yang belum dilihat). Payload-nya diteruskan apa adanya.
 */
export type PayloadHitungan = Record<string, number>;

export function buatStreamHitungan(
  hitung: () => Promise<PayloadHitungan>,
  signal: AbortSignal,
  opsi: OpsiStreamHitungan = {}
): Response {
  const label = opsi.label ?? "SSE";
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let tertutup = false;
      let terakhir: string | null = null;

      const tulis = (teks: string) => {
        if (tertutup) return;
        try {
          controller.enqueue(encoder.encode(teks));
        } catch {
          tertutup = true;
        }
      };

      const kirim = (event: string, payload: PayloadHitungan) => {
        tulis(`event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`);
      };

      const segarkan = async () => {
        try {
          const payload = await hitung();
          const sidik = JSON.stringify(payload);

          if (sidik !== terakhir) {
            terakhir = sidik;
            kirim("notifikasi", payload);
          }
        } catch (error) {
          // Biarkan koneksi hidup; heartbeat/percobaan berikutnya mencoba lagi.
          // Dicatat supaya kegagalan tidak senyap (badge bisa tampak "0" keliru).
          console.error(`[${label}] gagal menyegarkan:`, error);
        }
      };

      // Snapshot awal supaya angka sudah benar segera setelah connect.
      try {
        const awal = await hitung();
        terakhir = JSON.stringify(awal);
        kirim("snapshot", awal);
      } catch (error) {
        console.error(`[${label}] gagal memuat snapshot:`, error);
        kirim("snapshot", { unread: 0 });
      }

      const berhentiLanggan = langganNotifikasi(() => {
        void segarkan();
      });

      const heartbeat = setInterval(() => tulis(": ping\n\n"), HEARTBEAT_MS);
      const reCek = setInterval(() => {
        void segarkan();
      }, RE_CEK_MS);

      const bersihkan = () => {
        if (tertutup) return;
        tertutup = true;
        berhentiLanggan();
        clearInterval(heartbeat);
        clearInterval(reCek);
        try {
          controller.close();
        } catch {
          // Sudah tertutup dari sisi lain.
        }
      };

      signal.addEventListener("abort", bersihkan);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      // Cegah nginx (dan proxy lain) men-buffer respons ini.
      "X-Accel-Buffering": "no",
    },
  });
}
