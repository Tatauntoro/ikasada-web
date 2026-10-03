# Changelog

## [0.2.0](https://github.com/Tatauntoro/ikasada-web/compare/ikasada-web-v0.1.0...ikasada-web-v0.2.0) (2026-10-03)


### Features

* Dockerfile & docker-compose untuk deploy via Dokploy ([6e9ada6](https://github.com/Tatauntoro/ikasada-web/commit/6e9ada63e746fe1dfee19397f8aeccff377991e5))
* izin modul inbox untuk notifikasi admin ([33b67f8](https://github.com/Tatauntoro/ikasada-web/commit/33b67f8eedac8c286e428f54f2ecafd1b6ca16bd))
* jalankan Prisma migrate deploy otomatis saat deploy ([7a0c33f](https://github.com/Tatauntoro/ikasada-web/commit/7a0c33ffd7c5213046ce2041f4edf8ce050a8d0d))
* jalankan Prisma migrate deploy otomatis saat deploy ([cedb6de](https://github.com/Tatauntoro/ikasada-web/commit/cedb6dee630219f0e29b910f46ceaec4c35ca0a3))
* pindahkan semua penyimpanan berkas ke Cloudflare R2 ([312e441](https://github.com/Tatauntoro/ikasada-web/commit/312e44188806b30395c5eb3193c905aa576ad0ea))
* pindahkan semua penyimpanan berkas ke Cloudflare R2 ([d61fc11](https://github.com/Tatauntoro/ikasada-web/commit/d61fc1140b3f36c91d70ceef3204865051e37404))
* portal alumni IKASADA (halaman publik + admin) ([2e08318](https://github.com/Tatauntoro/ikasada-web/commit/2e083181d264e54dbf361373e578e86e89c7f150))
* tambah Dockerfile dan docker-compose untuk deploy via Dokploy ([c8bb0ff](https://github.com/Tatauntoro/ikasada-web/commit/c8bb0ff694951e52785bba1ab2f08a591812b489))
* tambah fitur Berita (DB + admin + integrasi FE) ([5e57b79](https://github.com/Tatauntoro/ikasada-web/commit/5e57b7903549de8fe436b600827fc6244c0c55d2))
* tambah fitur Berita (DB + admin + integrasi FE) ([477d91f](https://github.com/Tatauntoro/ikasada-web/commit/477d91fcd664e0f70f7b4c9e8a6a1f732a0d2ecb))
* tandai backend penyimpanan gambar di URL + wajibkan R2 di produksi ([b25b484](https://github.com/Tatauntoro/ikasada-web/commit/b25b484936b6213d076fb6839b8db8a7d5f22ea9))
* tandai backend penyimpanan gambar di URL + wajibkan R2 di produksi ([3d68667](https://github.com/Tatauntoro/ikasada-web/commit/3d68667ae6035cab58e4fe18292dc2e419090649))


### Bug Fixes

* gambar upload hanya via R2, hapus fallback lokal ([e42adc6](https://github.com/Tatauntoro/ikasada-web/commit/e42adc6593a51625d21bf2a270fb3bf598131575))
* gambar upload hanya via R2, hapus fallback lokal ([eb79ad1](https://github.com/Tatauntoro/ikasada-web/commit/eb79ad107eb451aeed62a0dc4dcc31569f52a0e4))
* hapus host port publishing di docker-compose (bentrok di Dokploy) ([0dca9df](https://github.com/Tatauntoro/ikasada-web/commit/0dca9df25455bce9ef3c2e2fbcd66fd624a53eda))
* hapus host port publishing di docker-compose (bentrok di Dokploy) ([09b7ba6](https://github.com/Tatauntoro/ikasada-web/commit/09b7ba6b9da42d729281a00e141dd3a4a3a84d3f))
* layani upload gambar lokal lewat API route, bukan public/ statis ([98c5523](https://github.com/Tatauntoro/ikasada-web/commit/98c5523d2225136f27dc93fc427c99f8b0c10c9c))
* layani upload gambar lokal lewat API route, bukan public/ statis ([a7adf76](https://github.com/Tatauntoro/ikasada-web/commit/a7adf76261d384482a16d85edf3f378b7bc110b9))
* pakai rate limit berbasis database di login admin ([bdf0032](https://github.com/Tatauntoro/ikasada-web/commit/bdf00322b4cd7f4879d35584a2ff5ff87c519917))
* pakai rate limit berbasis database di login admin ([24e415a](https://github.com/Tatauntoro/ikasada-web/commit/24e415a715cd8d987874c76696463705c6a1e6ba))
* penanda ?b=r2 di URL mengikat, tidak lagi fallback ke lokal ([c679247](https://github.com/Tatauntoro/ikasada-web/commit/c679247c27f3d38143f55cb4c37c30f646a3cae0))
* penanda ?b=r2 di URL mengikat, tidak lagi fallback ke lokal ([327e9b1](https://github.com/Tatauntoro/ikasada-web/commit/327e9b1e45e08190da4d8c45c9d9de851956e038))
* segarkan ScrollTrigger saat tinggi dokumen berubah ([7d056a2](https://github.com/Tatauntoro/ikasada-web/commit/7d056a290a7df2c6190dd502ee17267741c7a71d))
* segarkan ScrollTrigger saat tinggi dokumen berubah ([ca45c09](https://github.com/Tatauntoro/ikasada-web/commit/ca45c09760ea84129a4a9653b0971f9760a31ff1))
