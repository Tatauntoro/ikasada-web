"use client";

import { useState, type FormEvent } from "react";
import { CheckCircle, Key, WarningCircle } from "@phosphor-icons/react";
import { panggilApi } from "@/lib/api-client";

/**
 * Ganti kata sandi alumni (self-service).
 *
 * Ditaruh di halaman status akun supaya tetap terjangkau walau mode jejaring
 * dimatikan. Wajib kata sandi lama; server memakai rate limit terpisah.
 */
const PASSWORD_MIN = 8;

const inputClass =
  "w-full rounded-[12px] border border-[#c8d9ee] bg-white px-4 py-3 text-[15px] tracking-[-0.02em] text-[#1f2937] focus:outline-none focus:ring-2 focus:ring-[#0071e3]";

export default function GantiSandiAlumni() {
  const [sandiLama, setSandiLama] = useState("");
  const [sandiBaru, setSandiBaru] = useState("");
  const [konfirmasi, setKonfirmasi] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<Record<string, string>>({});
  const [pesanSukses, setPesanSukses] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function simpan(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setFieldError({});
    setPesanSukses(null);

    if (sandiBaru.length < PASSWORD_MIN) {
      setFieldError({ sandiBaru: `Kata sandi minimal ${PASSWORD_MIN} karakter.` });
      return;
    }
    if (sandiBaru !== konfirmasi) {
      setFieldError({ konfirmasi: "Konfirmasi kata sandi belum sama." });
      return;
    }

    setIsLoading(true);
    const hasil = await panggilApi<{ message: string }>(
      "/api/auth/alumni/change-password",
      { method: "POST", body: { sandiLama, sandiBaru } }
    );
    setIsLoading(false);

    if (!hasil.ok) {
      if (hasil.error.fields) setFieldError(hasil.error.fields);
      setError(hasil.error.fields?.sandiLama ? null : hasil.error.message);
      return;
    }

    setSandiLama("");
    setSandiBaru("");
    setKonfirmasi("");
    setPesanSukses("Kata sandi berhasil diubah.");
  }

  return (
    <section className="mt-10 rounded-[22px] border border-[#e1e5eb] bg-white px-5 py-6 sm:px-6">
      <h2 className="flex items-center gap-2 text-[17px] font-medium tracking-[-0.02em] text-[#1f2937]">
        <Key weight="regular" className="text-[#0071e3]" aria-hidden="true" />
        Ganti kata sandi
      </h2>
      <p className="mt-1 max-w-[60ch] text-[13px] leading-[1.5] tracking-[-0.02em] text-[#5e6b7b]">
        Masukkan kata sandi lama untuk memastikan ini benar-benar Anda, lalu
        tentukan kata sandi baru.
      </p>

      {pesanSukses && (
        <div
          role="status"
          className="mt-4 flex items-start gap-2 rounded-[14px] border border-[#b7e3ca] bg-[#effaf3] px-4 py-3 text-[13px] tracking-[-0.02em] text-[#1f2937]"
        >
          <CheckCircle weight="regular" className="mt-[2px] shrink-0 text-base text-[#067647]" aria-hidden="true" />
          <span>{pesanSukses}</span>
        </div>
      )}

      <form className="mt-4 grid gap-4 sm:grid-cols-3" onSubmit={simpan}>
        <div>
          <label htmlFor="alumni-sandi-lama" className="mb-1 block text-[13px] font-medium text-[#1f2937]">
            Kata sandi lama
          </label>
          <input
            id="alumni-sandi-lama"
            type="password"
            autoComplete="current-password"
            value={sandiLama}
            onChange={(e) => setSandiLama(e.target.value)}
            className={inputClass}
          />
          {fieldError.sandiLama && (
            <p className="mt-1 text-[12px] text-red-600">{fieldError.sandiLama}</p>
          )}
        </div>

        <div>
          <label htmlFor="alumni-sandi-baru" className="mb-1 block text-[13px] font-medium text-[#1f2937]">
            Kata sandi baru
          </label>
          <input
            id="alumni-sandi-baru"
            type="password"
            autoComplete="new-password"
            value={sandiBaru}
            onChange={(e) => setSandiBaru(e.target.value)}
            className={inputClass}
          />
          {fieldError.sandiBaru ? (
            <p className="mt-1 text-[12px] text-red-600">{fieldError.sandiBaru}</p>
          ) : (
            <p className="mt-1 text-[12px] text-[#6b7280]">Minimal {PASSWORD_MIN} karakter.</p>
          )}
        </div>

        <div>
          <label htmlFor="alumni-sandi-konfirmasi" className="mb-1 block text-[13px] font-medium text-[#1f2937]">
            Ulangi kata sandi baru
          </label>
          <input
            id="alumni-sandi-konfirmasi"
            type="password"
            autoComplete="new-password"
            value={konfirmasi}
            onChange={(e) => setKonfirmasi(e.target.value)}
            className={inputClass}
          />
          {fieldError.konfirmasi && (
            <p className="mt-1 text-[12px] text-red-600">{fieldError.konfirmasi}</p>
          )}
        </div>

        {error && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-[14px] border border-[#f1c7c4] bg-[#fff5f4] px-4 py-3 text-[13px] tracking-[-0.02em] text-[#7a271a] sm:col-span-3"
          >
            <WarningCircle weight="regular" className="mt-[2px] shrink-0 text-base text-[#b42318]" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        <div className="sm:col-span-3">
          <button
            type="submit"
            disabled={isLoading}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#0757a6] px-6 text-[13px] font-semibold tracking-[-0.02em] text-white transition-colors hover:bg-[#064b90] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0071e3] disabled:opacity-70"
          >
            <Key weight="regular" aria-hidden="true" />
            {isLoading ? "Menyimpan..." : "Simpan kata sandi"}
          </button>
        </div>
      </form>
    </section>
  );
}
