import type { AksiAudit } from "@/generated/prisma/enums";

/**
 * Terjemahan audit → kalimat yang bisa dipahami pengurus.
 *
 * Modul ini **murni** (tanpa Prisma/DB) supaya bisa dipakai di server (menyusun
 * log) sekaligus di klien (label dropdown filter).
 */

/** Verba/kalimat dasar per aksi audit. */
export const KALIMAT_AKSI: Record<AksiAudit, string> = {
  CREATE: "Menambahkan",
  UPDATE: "Mengubah",
  DELETE: "Menghapus",
  ALUMNI_REGISTER: "Mendaftar sebagai alumni",
  ALUMNI_APPROVE: "Menyetujui akun alumni",
  ALUMNI_REJECT: "Menolak pendaftaran akun",
  ALUMNI_SUSPEND: "Menangguhkan akun alumni",
  ALUMNI_LOGIN: "Masuk ke akun",
  ALUMNI_UPDATE_AVAILABILITY: "Mengubah status keterbukaan",
  ALUMNI_RESET_PASSWORD_REQUEST: "Meminta reset kata sandi",
  CONNECTION_CREATE: "Mengirim permintaan koneksi",
  CONNECTION_ACCEPT: "Menerima permintaan koneksi",
  CONNECTION_DECLINE: "Menolak permintaan koneksi",
  CONNECTION_CANCEL: "Membatalkan permintaan koneksi",
  CONNECTION_REVOKE: "Memutus koneksi",
  ARSIP_UNDUH: "Mengunduh berkas arsip",
};

/** Label modul (entitas audit) untuk kolom & filter. */
export const LABEL_ENTITAS: Record<string, string> = {
  Kegiatan: "Kegiatan",
  Alumni: "Data Alumni",
  Pengurus: "Pengurus Inti",
  Kerjasama: "Kerjasama",
  Arsip: "Arsip",
  AlumniAccount: "Akun Alumni",
  Connection: "Koneksi",
  AdminUser: "Akun Admin",
};

export const DAFTAR_ENTITAS = Object.entries(LABEL_ENTITAS).map(
  ([value, label]) => ({ value, label })
);

export const DAFTAR_AKSI = (Object.entries(KALIMAT_AKSI) as [AksiAudit, string][])
  .map(([value, label]) => ({ value, label }))
  .sort((a, b) => a.label.localeCompare(b.label, "id"));

/** Aksi CRUD butuh nama objek di belakang; aksi lain sudah kalimat utuh. */
const AKSI_CRUD = new Set<string>(["CREATE", "UPDATE", "DELETE"]);

/** Aksi yang objeknya adalah pelakunya sendiri → tidak perlu sufiks "— nama". */
const AKSI_TANPA_SUFIKS = new Set<string>([
  "ALUMNI_REGISTER",
  "ALUMNI_LOGIN",
  "ALUMNI_RESET_PASSWORD_REQUEST",
  "ALUMNI_UPDATE_AVAILABILITY",
]);

export function labelAksi(aksi: string): string {
  return KALIMAT_AKSI[aksi as AksiAudit] ?? aksi;
}

export function labelEntitas(entitas: string): string {
  return LABEL_ENTITAS[entitas] ?? entitas;
}

/** Kata benda entitas huruf kecil untuk dirangkai dengan verba CRUD. */
function objekCrud(entitas: string): string {
  if (entitas === "AlumniAccount") return "akun alumni";
  if (entitas === "AdminUser") return "akun admin";
  return labelEntitas(entitas).toLowerCase();
}

/**
 * Susun satu kalimat aktivitas.
 *
 * Contoh:
 * - `CREATE` + `Kegiatan` + "Workshop" → "Menambahkan kegiatan — Workshop"
 * - `ALUMNI_APPROVE` + `AlumniAccount` + "Budi" → "Menyetujui akun alumni — Budi"
 * - `ALUMNI_LOGIN` + `AlumniAccount` → "Masuk ke akun" (tanpa sufiks)
 */
export function kalimatAktivitas(
  aksi: string,
  entitas: string,
  namaObjek?: string | null
): string {
  const verba = labelAksi(aksi);
  const nama = (namaObjek ?? "").trim();

  if (AKSI_CRUD.has(aksi)) {
    const inti = `${verba} ${objekCrud(entitas)}`;
    return nama ? `${inti} — ${nama}` : inti;
  }

  if (AKSI_TANPA_SUFIKS.has(aksi)) {
    return verba;
  }

  return nama ? `${verba} — ${nama}` : verba;
}
