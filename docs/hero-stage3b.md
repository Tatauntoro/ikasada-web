# Hero IKASADA — Tahap 3B

## Asset dan geometri

- Sumber: `3D UI - mentah.glb` yang disediakan pengguna.
- Scene: satu root `mesh_node`, satu mesh `mesh`, satu primitive, dan satu material bernama `material`.
- Material sumber tidak memiliki texture, UV, kelompok mesh, atau nama bagian arsitektur. Jadi atap, fasad, kaca, struktur, dan Makara tidak tersedia sebagai material terpisah.
- Bounding box sumber: `[-0.74812, -0.95378, -0.94589]` sampai `[0.75004, 0.95011, 0.94979]`.
- Turunan runtime: `public/hero/ikasada-building-stage3b.glb`. Sumber disederhanakan dengan rasio `0.35`, batas error `0.001`, lalu diquantize dan dikompresi Meshopt. Hasilnya 12.87 MiB, dari 131.33 MiB, dengan siluet dan relief geometri tetap berasal dari GLB sumber.

## Material dan cahaya

- Atap: vertex pada normal lereng (`normal.y` 0.12–0.84) diberi `#9F3D2F`. Ini mencakup semua bidang genteng miring tanpa mewarnai fasad secara global.
- Fasad dan relief Makara: stone terang `#E8EAE4`, `roughness: 0.72`, `metalness: 0.02`.
- Kaca dan struktur gelap tidak memiliki mesh/material terpisah dalam sumber. Keduanya tidak dipalsukan dengan tint global; recess dan detail asli tetap dibaca oleh cahaya, contact shadow, dan relief model. Asset dengan material-slot terpisah diperlukan bila warna kaca/struktur harus dipetakan satu per satu.
- Key daylight: `#FFF0D6`, intensitas `2.2`, posisi `[-5.5, 8, 6]`.
- Fill: hemispheric `#EFF9FF → #1F6F46`, intensitas `1.45`; rim/fill biru `#C6DEF0`, intensitas `0.85`.
- Contact shadow: opacity `0.17`, blur `2.4`, resolusi `512`; ground hijau transparan adalah konteks lanskap, bukan lantai gelap.

## Lifecycle, performance, dan fallback

- Canvas dimuat melalui `next/dynamic` tanpa SSR. GLB memakai Meshopt decoder Drei, DPR dibatasi `1–1.5`, dan scene berhenti merender ketika hero keluar viewport atau tab tersembunyi.
- Sebelum `LoaderProvider.ready`, model berada diam pada scale `1.025`. Saat `ready`, ia settle ke `1` selama `1.05s`; tidak ada timer yang menjadi trigger preloader.
- Setelah settle, hanya desktop fine-pointer yang mendapat breathing ±`0.5%`, rotasi maksimal sekitar `0.7°`, dan parallax maksimal 14px. Tidak ada React state per frame.
- Pada reduced motion, Save-Data/economy, coarse pointer/touch, WebGL tidak tersedia, atau GLB error, hero memakai fallback foto statis. Foto penuh disembunyikan atomically setelah GLB siap, sehingga tidak pernah ada gedung foto dan gedung GLB yang terlihat bersamaan.
- Foto referensi hanya dipakai sebagai strip lanskap/foliage di sisi kiri saat GLB aktif; sisi yang memuat gedung referensi tidak dipakai.

## Tahap 3: motion lingkungan

- Layer daun memakai dua `InstancedMesh` berisi 48 daun perimeter foreground dan 32 daun latar. Setiap instance menerima phase, speed `0.22–0.50`, rotasi, ukuran, dan sway sendiri. Sway lateral maksimum `0.075` unit foreground dan `0.035` unit latar; opacity dipertahankan lembut pada `0.24` dan `0.16` supaya Makara, fasad, dan copy tetap bebas.
- Dua bank awan sphere instanced bergerak di belakang gedung pada `0.035` unit/detik sepanjang span `12` unit. Bank kembar mengulang layout yang sama, sehingga bank yang keluar frame selalu digantikan bank berikutnya tanpa jump yang terlihat.
- Haze daylight adalah plane transparan di belakang gedung dengan opacity `0.036–0.050`; ia memberi pemisahan kedalaman tanpa filter gelap atau post-processing.
- Ketiga layer tetap diam dan transparan sampai `interactionsReady`: `LoaderProvider.ready` telah aktif serta animasi CTA Tahap 2 selesai. Saat aktif, opacity masuk dalam `0.9–1.1s`; state itu bukan timer preloader.
- Semua update berada di `useFrame` dengan refs dan satu `Object3D` reusable per layer. Environment tidak berjalan pada reduced motion, Save-Data/economy, touch/coarse pointer, hero offscreen, atau tab tersembunyi. Canvas existing tetap memakai DPR `1–1.5` dan fallback foto statis bila WebGL/GLB tidak tersedia.

## Remediasi visual setelah Tahap 3

- Gambar `ikasada-campus-ui-kanan.png` tidak lagi muncul sebagai gedung kedua saat Canvas aktif. Dua crop turunan tanpa gedung, `ikasada-campus-sky-stage3.png` dan `ikasada-campus-landscape-stage3.png`, mengisi langit, horizon, pepohonan, dan ground. Dengan itu silhouette gedung yang tampak tetap hanya berasal dari GLB.
- Instanced foliage polygon lama dihapus. Pepohonan kini berasal dari crop fotografis kampus dengan drift transform maksimal 4px selama 12 detik, sehingga tidak ada blob/hexagon yang menghalangi gedung atau copy.
- Cloud bank kini memakai plane instanced dan `CanvasTexture` alpha matte lembut, bukan sphere low-poly. Dua bank tetap berjalan pada `0.035` unit/detik dalam loop span `12`; opacity puncak `0.56` agar terlihat di langit tanpa mengganggu Makara.
- Karena GLB hanya satu primitive, warna arsitektur tetap berbasis vertex palette tanpa mengubah geometri: atap miring dan bidang atap depan `#9F3D2F`; façade `#F4F1EA`; recess struktur `#1B1B1B`; jendela `#234358`; Makara dibatasi pada relief tengah dan tetap putih. Kaca menggunakan dark-blue reflectance terkontrol, bukan transmission global yang akan membuat seluruh primitive transparan.
- Color management memakai `SRGBColorSpace`, `ACESFilmicToneMapping`, dan exposure `0.82`. Daylight diturunkan ke hemi `0.78`, key `1.55`, soft fill biru `0.30`, dan rim `0.24`; material `roughness: 0.64`, `metalness: 0.01`, `envMapIntensity: 0.22`. Contact shadow ditingkatkan tipis ke opacity `0.21` dengan blur `2.8`; plane ground hijau lama dihapus agar ground fotografis tetap natural.
- Framing desktop menggunakan `fov: 35`, camera `[6.15, 2.38, 11.65]`, skala model `5.55`, dan root `[2.62, -0.34, 0]`, sehingga puncak atap, Makara, dan dasar lebih lega. Scrim kiri diturunkan ke `0.88 → 0` agar copy tetap terbaca tanpa menghapus kampus di belakangnya.

## Tahap 3R.1: transform dan framing berbasis bounds

- Runtime GLB `ikasada-building-stage3b.glb` terinspeksi sebagai scene Y-up dengan satu node `mesh_node`, tanpa rotasi bawaan. Bounds terdekode: min `[-0.74814, -0.95363, -0.94593]`, max `[0.75007, 0.95011, 0.94829]`; center `[0.00097, -0.00176, 0.00118]`; ukuran `[1.49821, 1.90374, 1.89422]`.
- Model dinormalisasi dari tinggi terukur, bukan sisi terpanjang: target tinggi `4.90`, sehingga skala model `2.57381`. Root ground-aligned menjadi `[2.62, -0.700, 0]`, diperoleh dari titik bawah lokal `y = -0.95363` menuju contact surface dunia `y = -3.15`. Rotasi baseline tetap `[0, 0, 0]` agar orientasi asli tetap tegak.
- Kamera memakai `fov: 35` dan jarak hasil fit vertikal. Desktop: target `[1.05, -0.70, 0]`, camera `[6.20, 2.14, 12.04]`, coverage vertikal `58%`; tablet: target `[0.78, -0.70, 0]`, camera `[4.92, 1.86, 11.55]`, coverage `62%`. Dengan framing ini gedung tetap di kanan, sementara puncak, Makara, dan titik ground tampil dalam frame.
- `ContactShadows` dipindahkan ke `[2.62, -3.15, 0]`, yaitu koordinat ground yang sama dengan model. Tidak ada debug helper yang tertinggal, dan perubahan tidak menyentuh material, motion lingkungan, teks, maupun navigasi.
