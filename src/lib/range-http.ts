/**
 * Pemotong `Range` sederhana untuk penyajian berkas biner (video/gambar).
 *
 * Dipakai endpoint media supaya video bisa di-seek tanpa mengunduh ulang
 * seluruh berkas. Mengembalikan status 200 (tanpa Range), 206 (sebagian), atau
 * 416 (rentang tidak valid).
 */
export function potongRange(
  isi: Buffer,
  headerRange: string | null
): { badan: Buffer; status: number; contentRange?: string } {
  if (!headerRange) return { badan: isi, status: 200 };

  const cocok = /^bytes=(\d*)-(\d*)$/.exec(headerRange.trim());
  if (!cocok) return { badan: isi, status: 200 };

  const [, awalTeks, akhirTeks] = cocok;
  const ukuran = isi.byteLength;

  let awal = awalTeks === "" ? null : Number(awalTeks);
  let akhir = akhirTeks === "" ? null : Number(akhirTeks);

  if (awal === null && akhir === null) return { badan: isi, status: 200 };

  // `bytes=-500` = 500 byte terakhir.
  if (awal === null) {
    const panjang = Math.min(akhir as number, ukuran);
    awal = Math.max(0, ukuran - panjang);
    akhir = ukuran - 1;
  } else if (akhir === null || akhir >= ukuran) {
    akhir = ukuran - 1;
  }

  if (awal > akhir || awal >= ukuran) {
    return { badan: Buffer.alloc(0), status: 416 };
  }

  return {
    badan: isi.subarray(awal, akhir + 1),
    status: 206,
    contentRange: `bytes ${awal}-${akhir}/${ukuran}`,
  };
}
