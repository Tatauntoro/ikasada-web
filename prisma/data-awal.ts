// Data contoh yang sebelumnya hardcoded di src/data/alumni.ts dan src/data/events.ts.
// Dipindahkan ke sini supaya bisa di-seed ke database dan tampilan web tidak kosong
// setelah backend jadi. Data real dari pengurus bisa menggantikan data ini nanti.

import type {
  ProgramStudi,
  StatusKegiatan,
  StatusAlumni,
  StatusKerjasama,
  StatusArsip,
} from "@/generated/prisma/client";

export interface AlumniAwal {
  namaLengkap: string;
  gelar?: string;
  angkatan: number;
  programStudi: ProgramStudi;
  profesi: string;
  instansi?: string;
  industriNama: string;
  email?: string;
  noWhatsapp?: string;
  linkInstagram?: string;
  fotoUrl: string;
  status?: StatusAlumni;
}

export interface KegiatanAwal {
  judul: string;
  slug: string;
  deskripsiSingkat: string;
  deskripsiLengkap?: string;
  tanggalMulai: string; // ISO 8601
  tanggalSelesai?: string; // ISO 8601
  lokasi: string;
  kategori: string;
  gambarThumbnailUrl: string;
  videoYoutubeUrl?: string;
  videoYoutubeId?: string;
  linkPendaftaran?: string;
  status: StatusKegiatan;
}

export interface PengurusAwal {
  nama: string;
  jabatan: string;
  angkatan?: string;
  ket?: string;
  fotoUrl: string;
  urutan?: number;
}

export interface ArsipAwal {
  slug: string;
  judul: string;
  jenis: string;
  /** Kapan entri diisi admin (dipakai juga sebagai tanggal kegiatan awal). */
  tanggal: string; // ISO 8601
  berkasFormat: string;
  deskripsiSingkat: string;
  deskripsiLengkap: string;
  gambarSampulUrl: string;
  alt: string;
  status: StatusArsip;
}

export interface KerjasamaAwal {
  slug: string;
  organisasi: string;
  programUtama: string;
  profil: string;
  contohKegiatan: string[];
  imageUrl: string;
  alt: string;
  linkInstagram?: string;
  linkTiktok?: string;
  email?: string;
  urutan: number;
  status: StatusKerjasama;
}

export const alumniAwal: AlumniAwal[] = [
  {
    namaLengkap: "Ahmad Nurhadi",
    gelar: "M.Hum.",
    angkatan: 1998,
    programStudi: "JAWA",
    profesi: "Kepala Museum Kebudayaan",
    instansi: "Museum Kebudayaan",
    industriNama: "Pemerintahan",
    noWhatsapp: "6281234567890",
    linkInstagram: "https://instagram.com/ahmad_nurhadi",
    fotoUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=300",
  },
  {
    namaLengkap: "Dewi Sekarwangi",
    gelar: "S.S.",
    angkatan: 2005,
    programStudi: "SUNDA",
    profesi: "Editor Eksekutif Balai Pustaka",
    instansi: "Balai Pustaka",
    industriNama: "Media",
    noWhatsapp: "6281234567891",
    linkInstagram: "https://instagram.com/dewi_sekar",
    fotoUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=300",
  },
  {
    namaLengkap: "Rian Prasetyo",
    gelar: "Ph.D.",
    angkatan: 2012,
    programStudi: "NUSANTARA",
    profesi: "Dosen Filologi Nusantara UI",
    instansi: "Universitas Indonesia",
    industriNama: "Pendidikan",
    noWhatsapp: "6281234567892",
    linkInstagram: "https://instagram.com/rian_filologi",
    fotoUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=300",
  },
  {
    namaLengkap: "Citra Kirana Lestari",
    angkatan: 2018,
    programStudi: "NUSANTARA",
    profesi: "Content Creator Budaya",
    industriNama: "Media",
    noWhatsapp: "6281234567893",
    linkInstagram: "https://instagram.com/citra_budaya",
    fotoUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300",
  },
  {
    namaLengkap: "Eko Hendro",
    gelar: "S.S.",
    angkatan: 2002,
    programStudi: "JAWA",
    profesi: "Sponsor Specialist BUMN",
    instansi: "BUMN",
    industriNama: "BUMN",
    noWhatsapp: "6281234567894",
    linkInstagram: "https://instagram.com/eko_bumn",
    fotoUrl: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=300",
  },
  {
    namaLengkap: "Siti Rahmawati",
    gelar: "M.Pd.",
    angkatan: 2021,
    programStudi: "SUNDA",
    profesi: "Peneliti Muda Bahasa Daerah",
    instansi: "Lembaga Penelitian",
    industriNama: "Pendidikan",
    noWhatsapp: "6281234567895",
    linkInstagram: "https://instagram.com/siti_rahma",
    fotoUrl: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=300",
  },
  {
    namaLengkap: "Budi Santoso",
    gelar: "S.S.",
    angkatan: 1995,
    programStudi: "JAWA",
    profesi: "Penerjemah Bahasa Kuno",
    industriNama: "Pemerintahan",
    noWhatsapp: "6281234567896",
    linkInstagram: "https://instagram.com/budi_s",
    fotoUrl: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=300",
  },
  {
    namaLengkap: "Maya Indah",
    gelar: "M.A.",
    angkatan: 2010,
    programStudi: "NUSANTARA",
    profesi: "Kurator Pameran Seni",
    instansi: "Galeri Seni Nusantara",
    industriNama: "Media",
    noWhatsapp: "6281234567897",
    linkInstagram: "https://instagram.com/maya_kurator",
    fotoUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=300",
  },
  {
    namaLengkap: "Dedi Kurniawan",
    gelar: "S.S.",
    angkatan: 2008,
    programStudi: "SUNDA",
    profesi: "Manager Program CSR",
    instansi: "BUMN",
    industriNama: "BUMN",
    noWhatsapp: "6281234567898",
    linkInstagram: "https://instagram.com/dedi_k",
    fotoUrl: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&q=80&w=300",
  },
  {
    namaLengkap: "Anisa Fitriani",
    gelar: "M.Hum.",
    angkatan: 2015,
    programStudi: "JAWA",
    profesi: "Penulis Buku Kebudayaan",
    industriNama: "Pendidikan",
    noWhatsapp: "6281234567899",
    linkInstagram: "https://instagram.com/anisa_penulis",
    fotoUrl: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&q=80&w=300",
  },
  {
    namaLengkap: "Fajar Nugraha",
    gelar: "S.S.",
    angkatan: 2019,
    programStudi: "NUSANTARA",
    profesi: "Sutradara Teater Tradisional",
    industriNama: "Media",
    noWhatsapp: "6281234567800",
    linkInstagram: "https://instagram.com/fajar_teater",
    fotoUrl: "https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?auto=format&fit=crop&q=80&w=300",
  },
  {
    namaLengkap: "Ratna Sari",
    gelar: "M.Pd.",
    angkatan: 2014,
    programStudi: "SUNDA",
    profesi: "Pengembang Kurikulum Bahasa",
    industriNama: "Pendidikan",
    noWhatsapp: "6281234567801",
    linkInstagram: "https://instagram.com/ratna_sari",
    fotoUrl: "https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?auto=format&fit=crop&q=80&w=300",
  },
];

export const kegiatanAwal: KegiatanAwal[] = [
  {
    judul: "Workshop Filologi & Digitalisasi Aksara Kuno",
    slug: "workshop-filologi-digitalisasi-aksara-kuno",
    deskripsiSingkat: "Pelatihan membaca dan mengarsip naskah Jawa & Sunda kuno menggunakan teknologi AI OCR.",
    tanggalMulai: "2026-10-15T08:00:00.000Z",
    lokasi: "Gedung IX FIB UI",
    kategori: "WORKSHOP",
    gambarThumbnailUrl: "https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&q=80&w=800",
    status: "PUBLISHED",
  },
  {
    judul: "Malam Seni Pertunjukan Sastra Nusantara",
    slug: "malam-seni-pertunjukan-sastra-nusantara",
    deskripsiSingkat: "Pagelaran Macapat, Tembang Sunda, dan Kolaborasi Teater Tradisional antar-angkatan.",
    tanggalMulai: "2026-11-12T18:00:00.000Z",
    lokasi: "Makara Art Center UI",
    kategori: "GATHERING",
    gambarThumbnailUrl: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&q=80&w=800",
    status: "PUBLISHED",
  },
  {
    judul: "Kongres Tahunan & Gathering Alumni",
    slug: "kongres-tahunan-gathering-alumni",
    deskripsiSingkat: "Penyampaian laporan kepengurusan dan jejaring karir alumni muda Sastra Daerah FIB UI.",
    tanggalMulai: "2026-12-20T09:00:00.000Z",
    lokasi: "Auditorium FIB UI",
    kategori: "GATHERING",
    gambarThumbnailUrl: "https://images.unsplash.com/photo-1523580494863-6f3031224c94?auto=format&fit=crop&q=80&w=800",
    status: "PUBLISHED",
  },
  {
    judul: "Diskusi Publik: Masa Depan Bahasa Daerah di Era AI",
    slug: "diskusi-publik-masa-depan-bahasa-daerah-di-era-ai",
    deskripsiSingkat: "Webinar interaktif membahas peran generasi muda dan teknologi AI dalam pelestarian dialek Nusantara.",
    tanggalMulai: "2027-01-18T13:00:00.000Z",
    lokasi: "Daring (Zoom Webinar)",
    kategori: "SEMINAR",
    gambarThumbnailUrl: "https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&q=80&w=800",
    status: "PUBLISHED",
  },
  {
    judul: "Pameran Manuskrip & Artefak Sastra Daerah",
    slug: "pameran-manuskrip-artefak-sastra-daerah",
    deskripsiSingkat: "Pameran artefak tulisan kuno koleksi dosen dan alumni Sastra Daerah FIB UI.",
    tanggalMulai: "2027-02-25T10:00:00.000Z",
    lokasi: "Perpustakaan Pusat UI Depok",
    kategori: "LAINNYA",
    gambarThumbnailUrl: "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&q=80&w=800",
    status: "PUBLISHED",
  },
  {
    judul: "Pelatihan Penulisan Kreatif Tembang & Cerpen Daerah",
    slug: "pelatihan-penulisan-kreatif-tembang-cerpen-daerah",
    deskripsiSingkat: "Sesi mentoring menulis kreatif berbasis tradisi lisan bersama sastrawan nasional alumni FIB UI.",
    tanggalMulai: "2027-03-14T08:00:00.000Z",
    lokasi: "Ruang Seminar Gedung VIII FIB UI",
    kategori: "WORKSHOP",
    gambarThumbnailUrl: "https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&q=80&w=800",
    status: "PUBLISHED",
  },
];

export const pengurusAwal: PengurusAwal[] = [
  {
    nama: "Dr. Saraswati Rahayu, M.Hum.",
    jabatan: "Ketua Umum IKASADA FIB UI",
    angkatan: "Sastra Jawa 1998",
    ket: "Peneliti Senior Badan Bahasa Kemendikbudristek RI",
    fotoUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400",
    urutan: 1,
  },
  {
    nama: "Bambang Wijanarko, S.S.",
    jabatan: "Wakil Ketua Umum",
    angkatan: "Sastra Sunda 2002",
    ket: "Produser Eksekutif Budaya Nusantara TV",
    fotoUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=400",
    urutan: 2,
  },
  {
    nama: "Ratna Galih Lestari, M.A.",
    jabatan: "Sekretaris Jenderal",
    angkatan: "Sastra Jawa 2008",
    ket: "Dosen & Penggiat Filologi FIB UI",
    fotoUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=400",
    urutan: 3,
  },
  {
    nama: "Danang Wibowo, S.S.",
    jabatan: "Bendahara Umum",
    angkatan: "Sastra Jawa 2005",
    ket: "Senior Financial Specialist BUMN",
    fotoUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=400",
    urutan: 4,
  },
  {
    nama: "Nani Wijaya, M.Hum.",
    jabatan: "Ketua Divisi Kebudayaan",
    angkatan: "Sastra Sunda 2000",
    ket: "Kurator Museum Nasional",
    fotoUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=400",
    urutan: 5,
  },
  {
    nama: "Hendra Setiawan, S.S.",
    jabatan: "Ketua Divisi Humas & Networking",
    angkatan: "Sastra Jawa 2011",
    ket: "Head of Communications Tech Startup",
    fotoUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=400",
    urutan: 6,
  },
];

// Dipindahkan dari src/data/kerjasama.ts agar tampilan section "Kerjasama Kami"
// tidak berubah setelah datanya pindah ke database. Kanal kontaknya masih
// memakai akun IKASADA (nilai yang dulu dirender dari src/data/kontak.ts) —
// ganti per item dari Portal Admin dengan kanal masing-masing mitra.
export const kerjasamaAwal: KerjasamaAwal[] = [
  {
    slug: "ruang-berbagi",
    organisasi: "Ruang Berbagi",
    programUtama: "KOMUNITAS ALUMNI",
    profil:
      "Komunitas alumni lintas angkatan yang membuka ruang belajar bersama untuk merawat bahasa dan sastra daerah.",
    contohKegiatan: [
      "Pelatihan penulisan kreatif tembang dan cerpen daerah",
      "Kelas menulis bulanan bersama mahasiswa aktif",
    ],
    imageUrl: "/uploads/kegiatan/45f606cb-5a25-48b1-bb40-a686dfed889e.png",
    alt: "Alumni berkumpul dalam kegiatan kolaboratif",
    linkInstagram: "https://instagram.com/ikasadafibui",
    linkTiktok: "https://tiktok.com/@ikasadafibui",
    email: "sekretariat@ikasada-fibui.or.id",
    urutan: 1,
    status: "PUBLISHED",
  },
  {
    slug: "lintas-keahlian",
    organisasi: "Tlatah Waktu",
    programUtama: "Sinau Aksara Jawa",
    profil:
      "Tlatah Waktu adalah komunitas yang merawat aksara Jawa melalui ruang belajar, praktik, dan perjumpaan lintas generasi.",
    contohKegiatan: [
      "Sinau Aksara Jawa",
      "Kelas membaca dan menulis aksara Jawa",
    ],
    imageUrl: "/uploads/kegiatan/82283ff8-8b19-4472-93dc-e7f46ef94b61.jpg",
    alt: "Suasana kegiatan dan interaksi antar alumni",
    linkInstagram: "https://instagram.com/ikasadafibui",
    linkTiktok: "https://tiktok.com/@ikasadafibui",
    email: "sekretariat@ikasada-fibui.or.id",
    urutan: 2,
    status: "PUBLISHED",
  },
  {
    slug: "jejak-yang-diteruskan",
    organisasi: "Jejak Yang Diteruskan",
    programUtama: "PROGRAM KONTRIBUSI",
    profil:
      "Program kontribusi alumni untuk mendokumentasikan dan meneruskan pengetahuan tradisi kepada generasi berikutnya.",
    contohKegiatan: [
      "Dokumentasi tradisi lisan bersama sesepuh",
      "Lokakarya arsip budaya daerah",
    ],
    imageUrl: "/uploads/kegiatan/ea3ccb61-7039-447c-8c8b-547955325abf.png",
    alt: "Dokumentasi program kontribusi alumni",
    linkInstagram: "https://instagram.com/ikasadafibui",
    linkTiktok: "https://tiktok.com/@ikasadafibui",
    email: "sekretariat@ikasada-fibui.or.id",
    urutan: 3,
    status: "PUBLISHED",
  },
  {
    slug: "dari-kampus-ke-komunitas",
    organisasi: "Dari Kampus Ke Komunitas",
    programUtama: "KOMUNITAS",
    profil:
      "Komunitas alumni yang mendampingi kegiatan budaya di kampung dan sekolah sekitar kampus.",
    contohKegiatan: [
      "Pendampingan sanggar seni sekolah dasar",
      "Festival budaya desa binaan",
    ],
    imageUrl: "/uploads/kegiatan/e7743d1d-0b00-45a5-8814-83da09960ed8.png",
    alt: "Alumni berkolaborasi dalam kegiatan komunitas",
    linkInstagram: "https://instagram.com/ikasadafibui",
    linkTiktok: "https://tiktok.com/@ikasadafibui",
    email: "sekretariat@ikasada-fibui.or.id",
    urutan: 4,
    status: "PUBLISHED",
  },
];

/** Master data jenis arsip. Dipakai admin maupun filter halaman publik. */
export const jenisArsipAwal: string[] = [
  "Laporan",
  "Materi",
  "Notulen",
  "Proposal",
  "Publikasi",
  "SK",
];

// Dipindahkan dari src/data/arsip.ts. Berkasnya belum pernah ada di repo ini,
// jadi `berkasId` sengaja dibiarkan kosong: halaman detail tetap menampilkan
// kotak "berkas belum diunggah" sampai admin mengunggahnya lewat Portal Admin.
const FOTO_KEGIATAN = {
  gambarSampulUrl: "/uploads/kegiatan/82283ff8-8b19-4472-93dc-e7f46ef94b61.jpg",
  alt: "Dokumentasi kegiatan alumni",
};

const GRAFIK_DOKUMEN = {
  gambarSampulUrl: "/uploads/kegiatan/45f606cb-5a25-48b1-bb40-a686dfed889e.png",
  alt: "Ilustrasi sampul dokumen",
};

export const arsipAwal: ArsipAwal[] = [
  {
    slug: "laporan-tahunan-2025",
    judul: "Laporan Tahunan IKASADA 2025",
    jenis: "Laporan",
    tanggal: "2026-01-31T00:00:00.000Z",
    berkasFormat: "pdf",
    deskripsiSingkat:
      "Rekapitulasi program, keuangan, dan capaian organisasi sepanjang 2025.",
    deskripsiLengkap:
      "Laporan ini merangkum seluruh kegiatan IKASADA FIB UI sepanjang 2025, mulai dari program rutin pengurus, agenda kebudayaan, hingga program kontribusi di desa binaan.\n\nBagian keuangan memuat rincian penerimaan iuran anggota, donasi, dan penggunaan anggaran per bidang, disertai catatan audit internal dan rekomendasi untuk periode berikutnya.",
    ...FOTO_KEGIATAN,
    status: "PUBLISHED",
  },
  {
    slug: "notulen-rapat-kerja-2026",
    judul: "Notulen Rapat Kerja Pengurus 2026",
    jenis: "Notulen",
    tanggal: "2026-02-14T00:00:00.000Z",
    berkasFormat: "pdf",
    deskripsiSingkat:
      "Hasil rapat kerja penyusunan program prioritas dan pembagian bidang pengurus.",
    deskripsiLengkap:
      "Rapat kerja tahunan ini menyusun program prioritas 2026 dan menetapkan pembagian tugas antar bidang, termasuk penanggung jawab tiap agenda kebudayaan.\n\nBeberapa keputusan penting: penguatan basis data alumni, penambahan jadwal kelas menulis, serta rencana kerja sama dengan dua sanggar budaya di sekitar kampus.",
    ...GRAFIK_DOKUMEN,
    status: "PUBLISHED",
  },
  {
    slug: "proposal-beasiswa-2026",
    judul: "Proposal Program Beasiswa Sastra Daerah",
    jenis: "Proposal",
    tanggal: "2026-03-02T00:00:00.000Z",
    berkasFormat: "docx",
    deskripsiSingkat:
      "Usulan beasiswa untuk mahasiswa aktif Sastra Daerah beserta rencana anggaran.",
    deskripsiLengkap:
      "Proposal ini mengusulkan skema beasiswa untuk mahasiswa aktif Program Studi Sastra Daerah yang memiliki keterbatasan biaya namun berprestasi akademik.\n\nRencana anggaran mencakup komponen biaya kuliah, bantuan penelitian tugas akhir, dan alokasi pendampingan mentoring dari alumni senior selama satu tahun.",
    ...FOTO_KEGIATAN,
    status: "PUBLISHED",
  },
  {
    slug: "ad-art-2024",
    judul: "AD/ART IKASADA FIB UI",
    jenis: "SK",
    tanggal: "2024-06-18T00:00:00.000Z",
    berkasFormat: "pdf",
    deskripsiSingkat:
      "Anggaran Dasar dan Anggaran Rumah Tangga hasil Musyawarah Besar 2024.",
    deskripsiLengkap:
      "Dokumen ini memuat Anggaran Dasar dan Anggaran Rumah Tangga organisasi sebagaimana disahkan pada Musyawarah Besar 2024.\n\nCakupannya meliputi asas dan tujuan, keanggotaan, struktur kepengurusan, mekanisme musyawarah, pengelolaan keuangan, serta aturan perubahan anggaran dasar.",
    ...GRAFIK_DOKUMEN,
    status: "PUBLISHED",
  },
  {
    slug: "laporan-keuangan-sem1-2025",
    judul: "Laporan Keuangan Semester I 2025",
    jenis: "Laporan",
    tanggal: "2025-07-20T00:00:00.000Z",
    berkasFormat: "xlsx",
    deskripsiSingkat:
      "Rincian penerimaan dan pengeluaran organisasi periode Januari–Juni 2025.",
    deskripsiLengkap:
      "Berkas ini memuat rincian penerimaan dan pengeluaran organisasi selama Januari hingga Juni 2025 dalam format lembar kerja.\n\nSetiap pos pengeluaran dipisahkan per bidang sehingga memudahkan penelusuran dan penyusunan laporan pada periode berikutnya.",
    ...FOTO_KEGIATAN,
    status: "PUBLISHED",
  },
  {
    slug: "notulen-mubes-2025",
    judul: "Notulen Musyawarah Besar Alumni 2025",
    jenis: "Notulen",
    tanggal: "2025-11-09T00:00:00.000Z",
    berkasFormat: "pdf",
    deskripsiSingkat:
      "Catatan sidang pleno, keputusan, dan daftar pengurus terpilih periode berikutnya.",
    deskripsiLengkap:
      "Notulen ini mencatat jalannya sidang pleno Musyawarah Besar 2025, termasuk usulan dari tiap angkatan dan tanggapan pengurus.\n\nHasil akhir musyawarah menetapkan susunan pengurus periode berikutnya beserta program kerja prioritas dan batas waktu pelaporannya.",
    ...GRAFIK_DOKUMEN,
    status: "PUBLISHED",
  },
  {
    slug: "publikasi-jurnal-tembang-vol3",
    judul: "Jurnal Tembang Nusantara Vol. 3",
    jenis: "Publikasi",
    tanggal: "2025-09-12T00:00:00.000Z",
    berkasFormat: "pdf",
    deskripsiSingkat:
      "Kumpulan kajian tembang dan sastra daerah yang ditulis alumni lintas angkatan.",
    deskripsiLengkap:
      "Jurnal edisi ketiga ini menghimpun kajian tembang dan sastra daerah hasil tulisan alumni dari berbagai angkatan.\n\nTema yang diangkat antara lain pergeseran praktik macapat di perkotaan, dokumentasi tembang langka, serta peluang digitalisasi naskah untuk pembelajaran.",
    ...FOTO_KEGIATAN,
    status: "PUBLISHED",
  },
  {
    slug: "materi-workshop-filologi",
    judul: "Materi Workshop Filologi & Digitalisasi Aksara Kuno",
    jenis: "Materi",
    tanggal: "2025-10-15T00:00:00.000Z",
    berkasFormat: "pdf",
    deskripsiSingkat:
      "Bahan pelatihan membaca dan mengarsip naskah Jawa serta Sunda kuno.",
    deskripsiLengkap:
      "Materi ini disusun untuk workshop filologi yang membahas tahapan pembacaan, transliterasi, dan pengarsipan naskah Jawa serta Sunda kuno.\n\nBagian akhir memuat panduan praktis penggunaan perangkat digital untuk memindai dan memberi metadata pada naskah agar mudah ditelusuri kembali.",
    ...GRAFIK_DOKUMEN,
    status: "PUBLISHED",
  },
  {
    slug: "proposal-kerjasama-sanggar",
    judul: "Proposal Kerjasama dengan Sanggar Budaya",
    jenis: "Proposal",
    tanggal: "2025-04-08T00:00:00.000Z",
    berkasFormat: "docx",
    deskripsiSingkat:
      "Rencana kolaborasi pendampingan sanggar dan sekolah di sekitar kampus.",
    deskripsiLengkap:
      "Proposal ini mengajukan kerja sama jangka panjang dengan sanggar budaya di sekitar kampus untuk pendampingan kegiatan seni dan literasi daerah.\n\nLingkup kerja sama mencakup jadwal pendampingan rutin, pelibatan mahasiswa sebagai fasilitator, serta indikator capaian yang dievaluasi setiap semester.",
    ...FOTO_KEGIATAN,
    status: "PUBLISHED",
  },
  {
    slug: "laporan-desa-binaan-2024",
    judul: "Laporan Program Kontribusi Desa Binaan 2024",
    jenis: "Laporan",
    tanggal: "2024-12-15T00:00:00.000Z",
    berkasFormat: "pdf",
    deskripsiSingkat:
      "Evaluasi kegiatan pendampingan budaya di desa binaan beserta dokumentasinya.",
    deskripsiLengkap:
      "Laporan ini mengevaluasi program pendampingan budaya di desa binaan selama 2024, mencakup kegiatan rutin, jumlah peserta, dan tanggapan masyarakat.\n\nDisertakan pula dokumentasi kegiatan serta rekomendasi perbaikan untuk keberlanjutan program pada tahun berikutnya.",
    ...GRAFIK_DOKUMEN,
    status: "PUBLISHED",
  },
  {
    slug: "notulen-rapat-pleno-2024",
    judul: "Notulen Rapat Pleno Pengurus 2024",
    jenis: "Notulen",
    tanggal: "2024-08-22T00:00:00.000Z",
    berkasFormat: "pdf",
    deskripsiSingkat:
      "Pembahasan progres program tengah tahun dan penyesuaian anggaran.",
    deskripsiLengkap:
      "Rapat pleno tengah tahun ini membahas capaian program yang berjalan serta kendala yang dihadapi tiap bidang.\n\nDisepakati sejumlah penyesuaian anggaran, termasuk realokasi dana dari agenda yang ditunda ke program yang berjalan lebih cepat dari rencana.",
    ...FOTO_KEGIATAN,
    status: "PUBLISHED",
  },
  {
    slug: "publikasi-buku-jejak-alumni",
    judul: "Buku Jejak Alumni Sastra Daerah",
    jenis: "Publikasi",
    tanggal: "2023-05-30T00:00:00.000Z",
    berkasFormat: "pdf",
    deskripsiSingkat:
      "Kumpulan kisah dan refleksi alumni dari berbagai angkatan.",
    deskripsiLengkap:
      "Buku ini menghimpun kisah dan refleksi alumni Sastra Daerah dari angkatan paling awal hingga angkatan termuda.\n\nTiap tulisan menuturkan perjalanan setelah lulus, cara ilmu sastra daerah dipakai di dunia kerja, serta harapan terhadap almamater.",
    ...GRAFIK_DOKUMEN,
    status: "PUBLISHED",
  },
  {
    slug: "materi-pelatihan-tembang",
    judul: "Materi Pelatihan Penulisan Tembang",
    jenis: "Materi",
    tanggal: "2023-02-11T00:00:00.000Z",
    berkasFormat: "pdf",
    deskripsiSingkat:
      "Modul dasar penulisan tembang untuk peserta pelatihan dan mahasiswa baru.",
    deskripsiLengkap:
      "Modul ini memuat dasar-dasar penulisan tembang, mulai dari aturan guru gatra, guru wilangan, dan guru lagu, hingga latihan menyusun bait sederhana.\n\nDilengkapi contoh karya peserta dan catatan koreksi sebagai bahan belajar mandiri.",
    ...FOTO_KEGIATAN,
    status: "PUBLISHED",
  },
  {
    slug: "laporan-mubes-2019",
    judul: "Laporan Musyawarah Besar 2019",
    jenis: "Laporan",
    tanggal: "2019-10-05T00:00:00.000Z",
    berkasFormat: "pdf",
    deskripsiSingkat:
      "Dokumen pertanggungjawaban kepengurusan dan hasil musyawarah besar 2019.",
    deskripsiLengkap:
      "Dokumen ini merupakan bentuk pertanggungjawaban kepengurusan periode sebelumnya pada Musyawarah Besar 2019, mencakup laporan program dan keuangan.\n\nMusyawarah menghasilkan sejumlah keputusan organisasi yang menjadi dasar penyusunan program pada periode berikutnya.",
    ...GRAFIK_DOKUMEN,
    status: "PUBLISHED",
  },
];
