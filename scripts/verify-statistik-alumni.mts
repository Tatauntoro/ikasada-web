/** Verifikasi agregasi publik tanpa koneksi database atau perubahan data. */
import assert from "node:assert/strict";
import { hitungStatistikAlumni } from "../src/lib/statistik-alumni";

const pendidikan = { id: "pendidikan", namaSektor: "Pendidikan", deletedAt: null };
const media = { id: "media", namaSektor: "Media", deletedAt: null };
const alumni = (profesi: string | null, sektorIndustri = pendidikan, angkatan = 2012) => ({
  angkatan,
  profesi,
  sektorIndustri,
});

const sesuai = ["Dosen", "  GURU  ", "Pengajar Bahasa Jawa", "Dosen/Peneliti", "Guru Besar", "ｄｏｓｅｎ"];
const lainnya = ["Editor", "Pegawai perguruan tinggi", "Gurupreneur", "Asisten dosenku"];
const campuran = hitungStatistikAlumni([
  ...sesuai.map((p) => alumni(p, media)), // Profesi, bukan sektor, menentukan hasil.
  ...lainnya.map((p) => alumni(p)),
  alumni(""), alumni(" \n\t"), alumni(null),
]);
assert.deepEqual(campuran.relevansiPekerjaan, {
  sesuai: 6, tidakSesuai: 4, belumDiketahui: 3, totalDinilai: 10,
  persenSesuai: 60, persenTidakSesuai: 40,
});
assert.equal(campuran.sebaranSektor.reduce((n, s) => n + s.jumlah, 0), 13);
assert.deepEqual(campuran.angkatanPerDekade, [{ dekade: 2010, jumlah: 13 }]);

for (const rows of [[], [alumni("")], [alumni(null)]]) {
  const data = hitungStatistikAlumni(rows);
  assert.equal(data.relevansiPekerjaan.totalDinilai, 0);
  assert.equal(data.relevansiPekerjaan.persenSesuai, null);
  assert.equal(data.relevansiPekerjaan.persenTidakSesuai, null);
}

for (const [profesi, persentase] of [["Guru", 100], ["Editor", 0]] as const) {
  const data = hitungStatistikAlumni([alumni(profesi)]).relevansiPekerjaan;
  assert.equal(data.persenSesuai, persentase);
  assert.equal(data.persenTidakSesuai, 100 - persentase);
}

const pecahan = hitungStatistikAlumni([alumni("Guru"), alumni("Editor"), alumni("Penulis")]);
assert.equal(pecahan.relevansiPekerjaan.persenSesuai, 33.3);
assert.equal(pecahan.relevansiPekerjaan.persenTidakSesuai, 66.7);

const sektor = hitungStatistikAlumni([
  alumni("Guru", pendidikan, 2020),
  alumni("Editor", media, 1989),
  alumni("Editor", media, 2003),
  { ...alumni("Editor"), sektorIndustri: { ...media, deletedAt: new Date() } },
  { ...alumni("Editor"), sektorIndustri: null },
]);
assert.deepEqual(sektor.sebaranSektor.map(({ nama, jumlah }) => [nama, jumlah]), [
  ["Belum diketahui", 2], ["Media", 2], ["Pendidikan", 1],
]);
assert.deepEqual(sektor.angkatanPerDekade.map((d) => d.dekade), [1980, 2000, 2010, 2020]);
assert.deepEqual(Object.keys(sektor).sort(), ["angkatanPerDekade", "relevansiPekerjaan", "sebaranSektor"]);

console.log("Lulus: kata profesi, kapitalisasi, Unicode, sektor independen, data kosong, 0/100%, pembulatan, sektor terhapus, dan dekade.");
