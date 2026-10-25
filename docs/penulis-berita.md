# Penulis berita

`Berita.penulis` menyimpan nama publik penulis/tim, terpisah dari `createdById`
(akun admin pembuat konten). Tipe database `VARCHAR(120) NOT NULL`, dengan default
`Redaksi IKASADA` untuk berita lama dan request create dari klien lama.

Form tambah/edit berita mengirim `penulis` melalui endpoint admin yang sudah ada.
Nama di-trim, panjang 2–120 karakter. Nilai kosong, null, dan tipe selain string
ditolak. PUT yang tidak menyertakan field ini mempertahankan nama tersimpan.
API daftar/detail publik menyertakan `penulis`; halaman detail membacanya dari DB.
Perubahan nama ikut audit, snapshot tinjauan, dan aturan verifikasi ulang konten.
Snapshot lama tanpa penulis dibandingkan dengan atribusi default saat migrasi.

## Penerapan database

SQL: `prisma/migrations/20261024000000_penulis_berita/migration.sql`.
Terapkan tambahan kolom sebelum menjalankan aplikasi dengan Prisma Client baru.
Pada database dengan riwayat migrasi Prisma yang lengkap, gunakan alur
`prisma migrate deploy` proyek yang biasa.

Database pengembangan yang diperiksa pada 24 Oktober 2026 tidak memiliki tabel
`_prisma_migrations` meskipun tabel aplikasi sudah ada. SQL penambahan kolom ini
sudah diterapkan secara terarah di dalam transaksi; bukan menjalankan ulang
seluruh direktori migrasi atau membuat baseline riwayat yang tidak diverifikasi.
Sebelum dan sesudah, 17 baris berita dibandingkan lewat hash JSON seluruh kolom
lama: identik. Nilai status, verifikasi, timestamp, isi dan media tidak diubah.

Untuk database serupa yang belum memiliki kolom, jalankan SQL tersebut sekali
melalui `npx prisma db execute --file prisma/migrations/20261024000000_penulis_berita/migration.sql`.
Sesudahnya jalankan `npx prisma generate` dan restart proses aplikasi agar
singleton Prisma dev tidak menggunakan schema lama. Jangan jalankan kembali SQL
jika kolom sudah ada. Penataan baseline migrasi seluruh database adalah pekerjaan
terpisah; jangan menandai migrasi lama sebagai applied tanpa pemeriksaan schema.

Rollback aplikasi aman dengan membiarkan kolom tambahan tetap ada: aplikasi lama
mengabaikannya dan create lama mendapat default. Jangan menghapus kolom saat
rollback karena nama penulis yang sudah dimasukkan admin akan hilang.

## Verifikasi

`npx tsx scripts/verify-berita-penulis.mts` membutuhkan server lokal yang sudah
berjalan, `.env` database/JWT yang sama, serta akun superadmin aktif. Sesi uji
dibuat menggunakan signer aplikasi, tanpa mengubah password atau izin admin.
Uji membuat berita fixture dengan judul UUID, memeriksa create/update, validasi,
kompatibilitas request lama, audit dan publikasi ke API/halaman publik, lalu
menghapus hanya fixture serta audit fixture di blok cleanup. Berita existing
tidak disimpan ulang. Jalankan juga lint, TypeScript, Prisma validate dan diff check.
