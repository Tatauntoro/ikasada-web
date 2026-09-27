"use client";

import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  EnvelopeSimple,
  WarningCircle,
} from "@phosphor-icons/react";
import Image from "next/image";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { panggilApi } from "@/lib/api-client";
import styles from "./alumni-auth.module.css";

type SubmitState = "idle" | "loading" | "success" | "error";

type LupaResponse = { message: string };

function validateEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

/**
 * Form permintaan reset kata sandi (fase 1, admin-mediated).
 *
 * Belum ada email provider: submit hanya meneruskan permintaan ke pengurus lewat
 * notifikasi in-app, lalu menampilkan pesan generik dari server — sama untuk
 * email terdaftar maupun tidak (anti-enumerasi).
 */
export default function LupaPasswordForm() {
  const [email, setEmail] = useState("");
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [serverMessage, setServerMessage] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setServerMessage(null);

    if (!validateEmail(email.trim())) {
      setEmailError("Masukkan email yang valid.");
      setSubmitState("error");
      return;
    }

    setEmailError(null);
    setSubmitState("loading");

    const hasil = await panggilApi<LupaResponse>(
      "/api/auth/alumni/lupa-password",
      { method: "POST", body: { email: email.trim() } }
    );

    if (!hasil.ok) {
      setSubmitState("error");
      setServerMessage(hasil.error.fields?.email ?? hasil.error.message);
      return;
    }

    setSubmitState("success");
    setServerMessage(hasil.data.message);
  }

  const sukses = submitState === "success";

  return (
    <main className={`${styles.shell} public-page min-h-[100dvh]`}>
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
          <Link href="/alumni/login" className={styles.alternateTopLink}>
            Masuk
          </Link>
        </nav>
      </header>

      <nav className={styles.breadcrumbs} aria-label="Breadcrumb">
        <Link href="/">Beranda</Link>
        <span aria-hidden="true">/</span>
        <Link href="/alumni/login">Masuk</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">Lupa kata sandi</span>
      </nav>

      <div className={`${styles.layout} ${sukses ? styles.layoutSuccess : ""}`}>
        <section className={styles.intro} aria-labelledby="auth-title">
          <p className={styles.eyebrow}>Bantuan akun alumni</p>
          <h1 id="auth-title">Lupa kata sandi?</h1>
          <p className={styles.description}>
            Masukkan email yang Anda daftarkan. Permintaan diteruskan ke pengurus
            IKASADA, yang akan membantu mengatur ulang kata sandi Anda.
          </p>

          <ul className={styles.benefits}>
            <li>
              <EnvelopeSimple weight="regular" aria-hidden="true" />
              <span>Gunakan email terdaftar</span>
            </li>
            <li>
              <CheckCircle weight="regular" aria-hidden="true" />
              <span>Diverifikasi pengurus</span>
            </li>
            <li>
              <WarningCircle weight="regular" aria-hidden="true" />
              <span>Kata sandi baru disampaikan lewat kanal resmi</span>
            </li>
          </ul>
        </section>

        <section
          className={`${styles.formPanel} augen-hairline`}
          aria-labelledby="form-title"
        >
          {sukses ? (
            <div className={styles.successPanel} role="status">
              <span className={styles.successIcon} aria-hidden="true">
                <CheckCircle weight="regular" />
              </span>
              <p className={styles.successEyebrow}>Permintaan terkirim</p>
              <h1 id="form-title">Terima kasih</h1>
              <p className={styles.successDescription}>{serverMessage}</p>
              <div className={styles.nextSteps}>
                <h2>Apa berikutnya?</h2>
                <ol>
                  <li>Tunggu pengurus IKASADA memproses permintaan Anda.</li>
                  <li>
                    Kata sandi baru disampaikan lewat kanal resmi, bukan di halaman
                    ini.
                  </li>
                  <li>Setelah menerimanya, masuk kembali dengan kata sandi baru.</li>
                </ol>
              </div>
              <Link href="/alumni/login">
                <ArrowLeft weight="regular" aria-hidden="true" />
                Kembali ke halaman masuk
              </Link>
            </div>
          ) : (
            <>
              <div className={styles.formHeader}>
                <div>
                  <h2 id="form-title">Reset kata sandi</h2>
                  <p>Kami teruskan permintaan Anda ke pengurus IKASADA.</p>
                </div>
                <span className={styles.formIcon} aria-hidden="true">
                  <EnvelopeSimple weight="regular" />
                </span>
              </div>

              <form onSubmit={handleSubmit} noValidate className={styles.form}>
                <div className={styles.fieldGroup}>
                  <label htmlFor="email">Email</label>
                  <div className={styles.inputWrap}>
                    <span aria-hidden="true">
                      <EnvelopeSimple weight="regular" />
                    </span>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="nama@email.com"
                      aria-invalid={Boolean(emailError)}
                      aria-describedby={emailError ? "email-error" : undefined}
                      required
                    />
                  </div>
                  {emailError && (
                    <p id="email-error" className={styles.fieldError}>
                      {emailError}
                    </p>
                  )}
                </div>

                {submitState === "error" && serverMessage && (
                  <div
                    className={`${styles.feedback} ${styles.feedbackError}`}
                    role="alert"
                  >
                    <WarningCircle weight="bold" aria-hidden="true" />
                    <span>{serverMessage}</span>
                  </div>
                )}

                <button
                  type="submit"
                  className={styles.submit}
                  disabled={submitState === "loading"}
                >
                  <span>
                    {submitState === "loading" ? "Mengirim..." : "Kirim permintaan"}
                  </span>
                  {submitState === "loading" ? (
                    <span className={styles.loadingDot} aria-hidden="true" />
                  ) : (
                    <ArrowRight weight="regular" aria-hidden="true" />
                  )}
                </button>
              </form>

              <div className={styles.formFooter}>
                <span>Sudah ingat kata sandi?</span>
                <Link href="/alumni/login">Kembali ke halaman masuk</Link>
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
