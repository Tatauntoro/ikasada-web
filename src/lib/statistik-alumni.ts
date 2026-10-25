import type { PublicStatistik } from "./types";

type BarisAlumni = {
  angkatan: number;
  profesi: string | null;
  sektorIndustri: {
    id: string;
    namaSektor: string;
    deletedAt: Date | null;
  } | null;
};

// Cocokkan kata utuh: "guru besar" termasuk, "perguruan" tidak termasuk.
const PROFESI_PENGAJAR = /(?:^|[^\p{L}\p{N}])(?:dosen|guru|pengajar)(?=$|[^\p{L}\p{N}])/iu;

/** Agregat publik saja; tidak mengembalikan profil atau profesi individu. */
export function hitungStatistikAlumni(rows: readonly BarisAlumni[]): Pick<
  PublicStatistik,
  "angkatanPerDekade" | "sebaranSektor" | "relevansiPekerjaan"
> {
  const dekade = new Map<number, number>();
  const sektor = new Map<string | null, PublicStatistik["sebaranSektor"][number]>();
  let sesuai = 0;
  let tidakSesuai = 0;
  let belumDiketahui = 0;

  for (const row of rows) {
    const tahun = Math.floor(row.angkatan / 10) * 10;
    dekade.set(tahun, (dekade.get(tahun) ?? 0) + 1);

    const kategori = row.sektorIndustri?.deletedAt === null
      ? row.sektorIndustri
      : null;
    const id = kategori?.id ?? null;
    const entri = sektor.get(id);
    if (entri) {
      entri.jumlah += 1;
    } else {
      sektor.set(id, {
        id,
        nama: kategori?.namaSektor ?? "Belum diketahui",
        jumlah: 1,
      });
    }

    const profesi = row.profesi?.normalize("NFKC").trim() ?? "";
    if (!profesi) {
      belumDiketahui += 1;
    } else if (PROFESI_PENGAJAR.test(profesi)) {
      sesuai += 1;
    } else {
      tidakSesuai += 1;
    }
  }

  const totalDinilai = sesuai + tidakSesuai;
  const persenSesuai = totalDinilai > 0
    ? Math.round((sesuai / totalDinilai) * 1000) / 10
    : null;

  return {
    angkatanPerDekade: Array.from(dekade, ([dekade, jumlah]) => ({ dekade, jumlah }))
      .sort((a, b) => a.dekade - b.dekade),
    sebaranSektor: Array.from(sektor.values()).sort(
      (a, b) => b.jumlah - a.jumlah || a.nama.localeCompare(b.nama, "id")
    ),
    relevansiPekerjaan: {
      sesuai,
      tidakSesuai,
      belumDiketahui,
      totalDinilai,
      persenSesuai,
      // Komplemen pembulatan agar dua persentase selalu berjumlah 100%.
      persenTidakSesuai: persenSesuai === null
        ? null
        : Math.round((100 - persenSesuai) * 10) / 10,
    },
  };
}
