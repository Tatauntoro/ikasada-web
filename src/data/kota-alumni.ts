import data from "./kota-alumni.json";

/**
 * Titik kota untuk peta sebaran alumni. Koordinat asli (WGS84).
 *
 * `jumlah` disiapkan untuk agregat alumni per kota (belum dipakai; menyusul
 * setelah kolom `kotaDomisili` ada di database).
 */
export type KotaTitik = {
  id: string;
  nama: string;
  lat: number;
  lng: number;
  jumlah?: number;
};

/** Almamater — satu-satunya titik asal, digambar sebagai lingkaran ganda. */
export const KOTA_ASAL: KotaTitik = data.asal;

/** Cabang alumni — titik biasa yang terhubung ke Depok. */
export const KOTA_CABANG: KotaTitik[] = data.cabang;
