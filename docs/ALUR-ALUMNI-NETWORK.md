# Alur Fitur Jejaring Alumni IKASADA

Referensi visual untuk fitur akun alumni, status keterbukaan, dan koneksi.
Menggambarkan implementasi yang berjalan sekarang (Fase A–G selesai).
Status keterbukaan hanya terlihat oleh sesi alumni `ACTIVE`; kontak hanya
terbuka pada koneksi `ACCEPTED` sesuai consent per-field pemiliknya.

## 1. Perjalanan akun alumni (daftar -> verifikasi -> aktif)

```mermaid
flowchart TD
    REG["/alumni/register"] --> API1["POST /api/auth/alumni/register"]
    API1 --> DUP{"email sudah terdaftar?"}
    DUP -- ya --> C409["409 CONFLICT"]
    DUP -- tidak --> CREATE["AlumniAccount PENDING<br/>alumniId = null"]
    CREATE --> STATUS["/alumni/status<br/>Menunggu verifikasi"]
    STATUS --> VERIF["Pengurus: /admin/alumni-accounts"]
    VERIF --> HASIL{"keputusan pengurus"}
    HASIL -- tolak --> REJ["REJECTED"]
    REJ --> VERIF
    HASIL -- setujui --> ACT["ACTIVE<br/>alumniId ditautkan"]
    ACT --> LOGIN["/alumni/login"]
    LOGIN --> COOKIE["Cookie ikasada_alumni_session<br/>JWT 8 jam"]
    COOKIE --> PROF["/alumni/profil<br/>set keterbukaan + consent"]
    COOKIE --> DIR["/alumni (direktori)"]
    ACT -. suspend .-> SUSP["SUSPENDED"]
    SUSP -. restore .-> ACT
```

## 2. Siklus hidup koneksi (state machine)

```mermaid
stateDiagram-v2
    [*] --> PENDING: kirim permintaan
    PENDING --> ACCEPTED: penerima terima
    PENDING --> DECLINED: penerima tolak
    PENDING --> CANCELED: pengirim batal
    ACCEPTED --> REVOKED: salah satu pihak putuskan
    DECLINED --> PENDING: baris di-reuse
    CANCELED --> PENDING: baris di-reuse
    REVOKED --> PENDING: baris di-reuse
    ACCEPTED --> [*]: kontak terbuka sesuai consent
```

## 3. Visibilitas direktori + tombol per peran

```mermaid
flowchart LR
    GET["GET /api/public/alumni"] --> SESI{"sesi alumni ACTIVE?"}
    SESI -- tidak --> ANON["Kartu publik + openStatusLocked=true<br/>nilai keterbukaan TIDAK dikirim"]
    SESI -- ya --> AKTIF["Kartu publik + badge keterbukaan<br/>+ connectionStatus per kartu"]
    ANON --> BTN1["Tombol: Login untuk terhubung"]
    AKTIF --> ST{"connectionStatus"}
    ST -- belum --> B1["Hubungkan"]
    ST -- PENDING saya kirim --> B2["Permintaan Dikirim"]
    ST -- PENDING saya terima --> B3["Lihat Permintaan"]
    ST -- ACCEPTED --> B4["Terhubung"]
    ST -- SELF --> B5["Profil Anda"]
```

## 4. Urutan lintas tiga POV (pendaftar . alumni lain . pengurus)

```mermaid
sequenceDiagram
    actor P as Pendaftar
    actor M as Alumni Lain
    actor A as Pengurus
    participant API as API IKASADA

    P->>API: POST /api/auth/alumni/register
    API-->>P: 201 akun PENDING
    A->>API: approve + tautkan alumniId
    API-->>A: 200 ACTIVE
    P->>API: login
    API-->>P: cookie ikasada_alumni_session
    P->>API: PATCH /api/alumni/me/profile
    M->>API: GET /api/public/alumni
    API-->>M: kartu + badge keterbukaan
    M->>API: POST /api/alumni/connections (pesan max 300 char)
    API-->>M: 201 PENDING
    P->>API: PATCH /connections/:id/accept
    API-->>P: 200 ACCEPTED
    Note over P,M: kontak terbuka hanya field yang di-consent
```

## 5. Ringkas endpoint & peran

| Aksi | Anonymous | Pending | Active | Admin |
|---|---:|---:|---:|---:|
| Lihat data publik alumni | Ya | Ya | Ya | Ya |
| Lihat status keterbukaan | Tidak | Tidak | Ya | Tidak |
| Register | Ya | Tidak | Tidak | Tidak |
| Login alumni | Ya | Ya | Ya | Tidak |
| Ubah status sendiri | Tidak | Tidak | Ya | Tidak |
| Kirim/terima/tolak koneksi | Tidak | Tidak | Ya | Tidak |
| Approve / reject / suspend akun | Tidak | Tidak | Tidak | Ya |

Guard: `/alumni/status` pakai `akunAlumniHalaman()`; `/alumni/jejaring` & `/alumni/profil`
pakai `akunAlumniAktifHalaman()` + `requireAlumniAktif()` (status dibaca ulang dari DB).
