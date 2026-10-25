# Unggahan video Hero

Video Hero diunggah langsung dari browser ke bucket R2 agar berkas hingga 30 MB
tidak melewati batas body request aplikasi. Tambahkan aturan CORS berikut pada
bucket yang dipakai aplikasi. Ganti origin produksi dengan origin situs yang
sebenarnya (tanpa path); `localhost` hanya diperlukan untuk pengembangan lokal.

```json
[
  {
    "AllowedOrigins": [
      "https://domain-situs-produksi.example",
      "http://localhost:3000"
    ],
    "AllowedMethods": ["PUT"],
    "AllowedHeaders": ["Content-Type"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

Unggahan gambar tetap melalui endpoint aplikasi. URL video yang tersimpan
ditayangkan melalui endpoint publik aplikasi dengan cache dan dukungan byte
range; bucket R2 tetap privat.
