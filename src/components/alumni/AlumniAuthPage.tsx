"use client";

import {
  ArrowRight,
  Check,
  CheckCircle,
  ClockCountdown,
  EnvelopeSimple,
  Eye,
  EyeSlash,
  GraduationCap,
  Info,
  LockKey,
  ShareNetwork,
  UserCircle,
  UsersThree,
  WarningCircle,
} from "@phosphor-icons/react";
import Image from "next/image";
import { Plus_Jakarta_Sans } from "next/font/google";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { panggilApi, type ApiError } from "@/lib/api-client";
import styles from "./alumni-auth.module.css";

type AuthMode = "login" | "register";
type SubmitState = "idle" | "loading" | "success" | "error";

type AlumniAuthPageProps = {
  mode: AuthMode;
};

type FieldErrors = Partial<Record<"namaLengkap" | "email" | "password" | "angkatan" | "konfirmasiPassword" | "consentData", string>>;

type AuthResponse = {
  id?: string;
  email: string;
  status: string;
  /** Arah setelah login; hanya dikirim endpoint login. */
  redirectTo?: string;
};

/** Harus sama dengan BE-Planning §5 dan `src/lib/validations/alumni-account.ts`. */
const PASSWORD_MIN = 8;
const TAHUN_SEKARANG = new Date().getFullYear();

/*
 * Program studi tidak lagi ditanyakan di form: seluruh alumni IKASADA saat ini
 * berasal dari Sastra Jawa, jadi nilainya diisi otomatis. Field-nya tetap ada di
 * database dan API, jadi pilihan ini bisa dibuka lagi kalau prodi lain masuk.
 */
const PROGRAM_STUDI_DEFAULT = "JAWA";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

/** Kunci `error.fields` yang punya input sendiri di form ini. */
const FIELD_TERKENAL = [
  "namaLengkap",
  "email",
  "angkatan",
  "password",
  "consentData",
] as const;

/**
 * Petakan galat server ke input yang tepat.
 *
 * Kunci di luar daftar (mis. `root` untuk field asing) tidak punya input
 * sendiri, jadi ditampilkan sebagai pesan umum — bukan di bawah field acak.
 */
function petakanError(error: ApiError): {
  fieldErrors: FieldErrors;
  pesan: string | null;
} {
  const fieldErrors: FieldErrors = {};
  let pesanUmum: string | null = null;

  for (const [kunci, isi] of Object.entries(error.fields ?? {})) {
    if ((FIELD_TERKENAL as readonly string[]).includes(kunci)) {
      fieldErrors[kunci as keyof FieldErrors] = isi;
    } else {
      pesanUmum = isi;
    }
  }

  if (!pesanUmum && Object.keys(fieldErrors).length === 0) {
    pesanUmum = error.message;
  }

  return { fieldErrors, pesan: pesanUmum };
}

function safeRedirect(target: string | null): string {
  if (!target || !target.startsWith("/") || target.startsWith("//")) {
    // Jaring pengaman klien; server sudah mengirim `redirectTo` sendiri.
    return "/alumni/profil";
  }

  return target;
}

function validateEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export default function AlumniAuthPage({ mode }: AlumniAuthPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isLogin = mode === "login";
  const redirect = safeRedirect(searchParams.get("next"));

  const [namaLengkap, setNamaLengkap] = useState("");
  const [email, setEmail] = useState("");
  const [angkatan, setAngkatan] = useState("");
  const [password, setPassword] = useState("");
  const [tampilkanPassword, setTampilkanPassword] = useState(false);
  const [konfirmasiPassword, setKonfirmasiPassword] = useState("");
  const [tampilkanKonfirmasiPassword, setTampilkanKonfirmasiPassword] = useState(false);
  const [consentData, setConsentData] = useState(false);
  const [ingatSaya, setIngatSaya] = useState(false);
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [serverMessage, setServerMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  /*
   * Shell terautentikasi mengarahkan ke sini dengan `sesi=berakhir` ketika
   * cookie session-nya sudah tidak sah lagi (FE-Planning §9), jadi pesannya
   * tidak hilang begitu user mendarat di halaman login.
   */
  const sesiBerakhir = searchParams.get("sesi") === "berakhir";

  const copy = useMemo(
    () =>
      isLogin
        ? {
            eyebrow: "Ruang jejaring alumni",
            title: "Selamat datang kembali.",
            description:
              "Masuk untuk melihat status keterbukaan, mengelola profil, dan terhubung dengan alumni.",
            formTitle: "Masuk ke akun alumni",
            formDescription: "Gunakan email dan kata sandi yang Anda daftarkan.",
            submit: "Masuk ke akun",
            alternate: "Belum memiliki akun?",
            alternateAction: "Daftar sebagai alumni",
            alternateHref: "/alumni/register",
          }
        : {
            eyebrow: "Bergabung dengan jejaring",
            title: "Satu akar, lebih banyak peluang.",
            description:
              "Temukan alumni, buka peluang kolaborasi, dan bangun koneksi yang relevan.",
            formTitle: "Daftar sebagai alumni",
            formDescription: "Gunakan data yang sesuai dengan direktori alumni.",
            submit: "Kirim pendaftaran",
            alternate: "Sudah memiliki akun?",
            alternateAction: "Masuk ke akun alumni",
            alternateHref: "/alumni/login",
          },
    [isLogin]
  );

  function validate(): FieldErrors {
    const errors: FieldErrors = {};

    if (!isLogin && namaLengkap.trim().length < 3) {
      errors.namaLengkap = "Nama lengkap minimal 3 karakter.";
    }

    if (!validateEmail(email.trim())) {
      errors.email = "Masukkan email yang valid.";
    }

    if (!isLogin) {
      const tahun = Number(angkatan);
      if (!/^\d{4}$/.test(angkatan) || tahun < 1960 || tahun > TAHUN_SEKARANG) {
        errors.angkatan = `Masukkan tahun angkatan 4 angka antara 1960 dan ${TAHUN_SEKARANG}.`;
      }
    }

    // Aturan panjang hanya masuk akal saat mendaftar — pemilik akun lama tidak
    // boleh dihalangi sebelum request-nya sampai ke server.
    if (isLogin) {
      if (!password) {
        errors.password = "Kata sandi wajib diisi.";
      }
    } else if (password.length < PASSWORD_MIN) {
      errors.password = `Kata sandi minimal ${PASSWORD_MIN} karakter.`;
    }

    if (!isLogin && password !== konfirmasiPassword) {
      errors.konfirmasiPassword = "Konfirmasi kata sandi belum sama.";
    }

    if (!isLogin && !consentData) {
      errors.consentData = "Persetujuan data diperlukan untuk mendaftar.";
    }

    return errors;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const errors = validate();
    setFieldErrors(errors);
    setServerMessage(null);

    if (Object.keys(errors).length > 0) {
      setSubmitState("error");
      return;
    }

    setSubmitState("loading");

    /*
     * Satu helper request untuk kedua mode (FE-Planning §6). Galat jaringan,
     * body bukan JSON, dan 5xx sudah dipetakan helper, jadi di sini hanya perlu
     * memilih: error per field, atau pesan umum.
     */
    const hasil = isLogin
      ? await panggilApi<AuthResponse>("/api/auth/alumni/login", {
          method: "POST",
          body: {
            email: email.trim(),
            password,
            ingatSaya,
            /*
             * `next` dikirim apa adanya ke server; server yang menyaringnya
             * (`pathInternalAman`) dan mengembalikan `redirectTo`. Tanpa ini
             * server selalu memakai default `/alumni` dan parameter `next`
             * diabaikan.
             */
            next: searchParams.get("next") ?? undefined,
          },
        })
      : await panggilApi<AuthResponse>("/api/auth/alumni/register", {
          method: "POST",
          body: {
            namaLengkap: namaLengkap.trim(),
            email: email.trim(),
            angkatan: Number(angkatan),
            programStudi: PROGRAM_STUDI_DEFAULT,
            password,
            consentData,
          },
        });

    if (!hasil.ok) {
      const { fieldErrors: dipetakan, pesan } = petakanError(hasil.error);
      setFieldErrors(dipetakan);
      setSubmitState("error");
      setServerMessage(pesan);
      return;
    }

    setSubmitState("success");

    if (!isLogin) {
      // Panel `PendaftaranBerhasil` di bawah yang menjelaskan akun belum aktif.
      return;
    }

    setServerMessage("Berhasil masuk. Mengalihkan ke halaman akun...");
    await new Promise((resolve) => window.setTimeout(resolve, 700));

    /*
     * Arah akhir ditentukan server lewat `redirectTo`: akun `ACTIVE` ke `next`
     * (atau `/alumni`), akun `PENDING` ke `/alumni/status` — halaman itu membaca
     * session-nya sendiri dan menampilkan data pendaftaran beserta tombol keluar.
     * Nilainya sudah divalidasi server sebagai path internal; disaring sekali
     * lagi sebelum dipakai (defense in depth).
     */
    router.replace(safeRedirect(hasil.data.redirectTo ?? redirect));
  }

  /*
   * Sukses yang tidak boleh langsung diarahkan ke halaman lain diganti panel
   * status, bukan pesan sekilas: setelah mendaftar akun belum aktif.
   */
  const tampilkanPanelDaftar = !isLogin && submitState === "success";
  const judulIntro = tampilkanPanelDaftar
    ? "Satu akar, lebih banyak peluang."
    : copy.title;
  const deskripsiIntro = tampilkanPanelDaftar
    ? "Pendaftaran Anda adalah langkah pertama untuk terhubung dengan sesama alumni."
    : copy.description;

  return (
    <main className={`${styles.shell} ${plusJakartaSans.className} public-page min-h-[100dvh]`}>
      <header className={styles.topbar}>
        <Link href="/" className={styles.brand} aria-label="IKASADA FIB UI — Beranda">
          <Image
            src="/logo/ikasada-logo.jpeg"
            alt=""
            width={1279}
            height={1600}
            priority
            className={styles.brandLogo}
          />
        </Link>
        <nav className={styles.topActions} aria-label="Navigasi autentikasi">
          {!tampilkanPanelDaftar && (
            <Link href={copy.alternateHref} className={styles.alternateTopLink}>
              {isLogin ? "Daftar" : "Masuk"}
            </Link>
          )}
        </nav>
      </header>

      <nav className={styles.breadcrumbs} aria-label="Breadcrumb">
        <Link href="/">Beranda</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{tampilkanPanelDaftar ? "Pendaftaran" : isLogin ? "Masuk" : "Daftar"}</span>
      </nav>

      <div className={`${styles.layout} ${tampilkanPanelDaftar ? styles.layoutSuccess : ""}`}>
        <section className={styles.intro} aria-labelledby="auth-title">
          <p className={styles.eyebrow}>
            {tampilkanPanelDaftar ? "Pendaftaran alumni" : copy.eyebrow}
          </p>
          {tampilkanPanelDaftar ? (
            <h2 id="auth-title">{judulIntro}</h2>
          ) : (
            <h1 id="auth-title">{judulIntro}</h1>
          )}
          <p className={styles.description}>{deskripsiIntro}</p>

          {isLogin ? (
            <ul className={styles.benefits}>
              <li>
                <UsersThree weight="regular" aria-hidden="true" />
                <span>Lihat status alumni</span>
              </li>
              <li>
                <UserCircle weight="regular" aria-hidden="true" />
                <span>Atur profil Anda</span>
              </li>
              <li>
                <ShareNetwork weight="regular" aria-hidden="true" />
                <span>Kelola koneksi</span>
              </li>
            </ul>
          ) : (
            <AlurPendaftaran selesai={tampilkanPanelDaftar} />
          )}
        </section>

        <section className={`${styles.formPanel} augen-hairline`} aria-labelledby="form-title">
          {tampilkanPanelDaftar ? (
            <PendaftaranBerhasil email={email.trim()} />
          ) : (
            <>
          <div className={styles.formHeader}>
            <div>
              <h2 id="form-title">{copy.formTitle}</h2>
              <p>{copy.formDescription}</p>
            </div>
            <span className={styles.formIcon} aria-hidden="true">
              {isLogin ? <LockKey weight="regular" /> : <UserCircle weight="regular" />}
            </span>
          </div>

          <form onSubmit={handleSubmit} noValidate className={styles.form}>
            {sesiBerakhir && !serverMessage && (
              <div
                className={`${styles.feedback} ${styles.feedbackError}`}
                role="status"
              >
                <WarningCircle weight="bold" aria-hidden="true" />
                <span>Sesi berakhir. Silakan login kembali.</span>
              </div>
            )}
            {!isLogin && (
              <Field
                id="namaLengkap"
                label="Nama lengkap"
                value={namaLengkap}
                onChange={setNamaLengkap}
                placeholder="Nama sesuai data alumni"
                icon={<UserCircle weight="regular" />}
                error={fieldErrors.namaLengkap}
              />
            )}

            <Field
              id="email"
              label="Email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={setEmail}
              placeholder="nama@email.com"
              icon={<EnvelopeSimple weight="regular" />}
              error={fieldErrors.email}
            />

            {!isLogin && (
              <div className={styles.fieldGrid}>
                <Field
                  id="angkatan"
                  label="Angkatan"
                  type="number"
                  inputMode="numeric"
                  value={angkatan}
                  onChange={setAngkatan}
                  placeholder="2012"
                  helpText="Tahun pertama masuk kuliah."
                  icon={<GraduationCap weight="regular" />}
                  error={fieldErrors.angkatan}
                />
              </div>
            )}

            <Field
              id="password"
              label="Kata sandi"
              type={tampilkanPassword ? "text" : "password"}
              autoComplete={isLogin ? "current-password" : "new-password"}
              value={password}
              onChange={setPassword}
              placeholder={isLogin ? "Kata sandi Anda" : `Minimal ${PASSWORD_MIN} karakter`}
              icon={<LockKey weight="regular" />}
              error={fieldErrors.password}
              trailingControl={
                <button
                  type="button"
                  className={styles.passwordToggle}
                  aria-label={tampilkanPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                  aria-pressed={tampilkanPassword}
                  onClick={() => setTampilkanPassword((tampil) => !tampil)}
                >
                  {tampilkanPassword ? <EyeSlash weight="regular" /> : <Eye weight="regular" />}
                </button>
              }
            />

            {isLogin && (
              <label className={styles.consent}>
                <input
                  type="checkbox"
                  checked={ingatSaya}
                  onChange={(event) => setIngatSaya(event.target.checked)}
                />
                <span>Ingat saya selama 30 hari di perangkat ini.</span>
              </label>
            )}

            {isLogin && (
              <Link className={styles.resetPassword} href="/alumni/lupa-password">
                Lupa kata sandi?
              </Link>
            )}

            {!isLogin && (
              <Field
                id="konfirmasiPassword"
                label="Konfirmasi kata sandi"
                type={tampilkanKonfirmasiPassword ? "text" : "password"}
                autoComplete="new-password"
                value={konfirmasiPassword}
                onChange={setKonfirmasiPassword}
                placeholder="Ulangi kata sandi"
                icon={<LockKey weight="regular" />}
                error={fieldErrors.konfirmasiPassword}
                trailingControl={
                  <button
                    type="button"
                    className={styles.passwordToggle}
                    aria-label={
                      tampilkanKonfirmasiPassword
                        ? "Sembunyikan konfirmasi kata sandi"
                        : "Tampilkan konfirmasi kata sandi"
                    }
                    aria-pressed={tampilkanKonfirmasiPassword}
                    onClick={() =>
                      setTampilkanKonfirmasiPassword((tampil) => !tampil)
                    }
                  >
                    {tampilkanKonfirmasiPassword ? (
                      <EyeSlash weight="regular" />
                    ) : (
                      <Eye weight="regular" />
                    )}
                  </button>
                }
              />
            )}

            {!isLogin && (
              <label className={styles.consent}>
                <input
                  type="checkbox"
                  checked={consentData}
                  onChange={(event) => setConsentData(event.target.checked)}
                  aria-invalid={Boolean(fieldErrors.consentData)}
                />
                <span>
                  Saya menyetujui penggunaan data untuk proses verifikasi dan jejaring alumni IKASADA.
                </span>
              </label>
            )}
            {!isLogin && fieldErrors.consentData && (
              <FieldError id="consent-error" message={fieldErrors.consentData} />
            )}

            {serverMessage && (
              <div
                className={`${styles.feedback} ${
                  submitState === "success" ? styles.feedbackSuccess : styles.feedbackError
                }`}
                role={submitState === "error" ? "alert" : "status"}
              >
                {submitState === "success" ? (
                  <Check weight="bold" aria-hidden="true" />
                ) : (
                  <WarningCircle weight="bold" aria-hidden="true" />
                )}
                <span>{serverMessage}</span>
              </div>
            )}

            <button type="submit" className={styles.submit} disabled={submitState === "loading" || submitState === "success"}>
              <span>
                {submitState === "loading" ? "Memproses..." : copy.submit}
              </span>
              {submitState === "loading" ? (
                <span className={styles.loadingDot} aria-hidden="true" />
              ) : (
                <ArrowRight weight="regular" aria-hidden="true" />
              )}
            </button>
          </form>

          <div className={styles.formFooter}>
            <span>{copy.alternate}</span>
            <Link href={copy.alternateHref}>{copy.alternateAction}</Link>
          </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  placeholder,
  helpText,
  type = "text",
  autoComplete,
  inputMode,
  icon,
  error,
  trailingControl,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  helpText?: string;
  type?: string;
  autoComplete?: string;
  inputMode?: "text" | "numeric";
  icon?: React.ReactNode;
  error?: string;
  trailingControl?: React.ReactNode;
}) {
  const errorId = `${id}-error`;
  const helpId = `${id}-help`;
  const describedBy = [helpText ? helpId : null, error ? errorId : null]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={styles.fieldGroup}>
      <label htmlFor={id}>{label}</label>
      <div className={styles.inputWrap}>
        {icon && <span aria-hidden="true">{icon}</span>}
        <input
          id={id}
          name={id}
          type={type}
          inputMode={inputMode}
          autoComplete={autoComplete}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy || undefined}
          className={trailingControl ? styles.passwordInput : undefined}
          required
        />
        {trailingControl}
      </div>
      {helpText && <p id={helpId} className={styles.fieldHelp}>{helpText}</p>}
      {error && <FieldError id={errorId} message={error} />}
    </div>
  );
}

function FieldError({ id, message }: { id: string; message: string }) {
  return (
    <p id={id} className={styles.fieldError}>
      {message}
    </p>
  );
}

/**
 * Panel setelah pendaftaran berhasil (BE merespons `201` dengan status `PENDING`).
 *
 * Akun `PENDING` tetap bisa login, tetapi belum bisa mengatur profil atau
 * mengirim permintaan koneksi. `role="status"` supaya hasilnya diumumkan
 * pembaca layar setelah submit.
 */
function AlurPendaftaran({ selesai }: { selesai: boolean }) {
  const langkah = [
    {
      judul: "Isi data",
      detail: "Lengkapi formulir pendaftaran dengan data yang benar.",
    },
    {
      judul: "Verifikasi pengurus",
      detail: "Data dicocokkan dengan direktori alumni.",
    },
    {
      judul: "Akun aktif",
      detail: "Anda dapat masuk setelah disetujui.",
    },
  ];

  return (
    <ol className={styles.steps} aria-label="Tahapan pendaftaran alumni">
      {langkah.map((langkahItem, index) => {
        const status = selesai
          ? index === 0
            ? "complete"
            : index === 1
              ? "current"
              : "upcoming"
          : index === 0
            ? "current"
            : "upcoming";

        return (
          <li key={langkahItem.judul} className={styles.step} data-state={status}>
            <span className={styles.stepMarker} aria-hidden="true">
              {status === "complete" ? <Check weight="bold" /> : index + 1}
            </span>
            <div>
              <h2>{langkahItem.judul}</h2>
              <p>{langkahItem.detail}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function PendaftaranBerhasil({ email }: { email: string }) {
  return (
    <div className={styles.successPanel} role="status">
      <span className={styles.successIcon} aria-hidden="true"><CheckCircle weight="regular" /></span>
      <p className={styles.successEyebrow}>Pendaftaran berhasil</p>
      <h1 id="form-title">Pendaftaran Anda diterima</h1>
      <p className={styles.successDescription}>
        Akun <strong>{email}</strong> masih menunggu verifikasi pengurus. Anda
        tetap bisa masuk sambil menunggu persetujuan.
      </p>
      <div className={styles.statusRow}>
        <span>Status akun</span>
        <strong><ClockCountdown weight="regular" aria-hidden="true" /> Menunggu verifikasi</strong>
      </div>
      <div className={styles.nextSteps}>
        <h2>Sambil menunggu, Anda tetap bisa masuk</h2>
        <ol>
          <li>
            <div>
              <strong>Masuk dan pantau status akun</strong>
              <span>Gunakan email dan kata sandi yang baru Anda daftarkan untuk melihat perkembangan verifikasi.</span>
            </div>
          </li>
          <li>
            <div>
              <strong>Jelajahi menu IKASADA</strong>
              <span>Lihat Direktori Alumni, kegiatan, dokumen, dan informasi lain yang tersedia.</span>
            </div>
          </li>
          <li>
            <div>
              <strong>Belum bisa mengajukan koneksi</strong>
              <span>Permintaan hubungan dengan alumni lain tersedia setelah akun disetujui.</span>
            </div>
          </li>
        </ol>
      </div>
      <div className={styles.pendingCallout}>
        <Info weight="regular" aria-hidden="true" />
        <p>
          Selama menunggu, Anda bisa menjelajahi website IKASADA. Pengaturan
          profil dan permintaan koneksi aktif setelah akun diverifikasi.
        </p>
      </div>
      <div className={styles.successActions}>
        <Link href="/alumni/login" className={styles.primaryAction}>
          Masuk ke akun alumni
          <ArrowRight weight="bold" aria-hidden="true" />
        </Link>
        <Link href="/" className={styles.secondaryAction}>
          Jelajahi IKASADA
        </Link>
      </div>
    </div>
  );
}
