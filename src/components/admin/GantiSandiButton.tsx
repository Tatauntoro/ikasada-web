"use client";

import { useEffect, useState } from "react";
import { CheckCircle, Key, WarningCircle, X } from "@phosphor-icons/react";
import { panggilApi } from "@/lib/api-client";

/**
 * Tombol "Ganti Kata Sandi" untuk admin (self-service).
 *
 * Membuka dialog dengan tiga isian: kata sandi lama, baru, dan konfirmasi.
 * Selama ada perubahan, dialog tidak ditutup (overlay tak menutup supaya tidak
 * kehilangan isian). `variant` mengikuti tempatnya seperti `LogoutButton`.
 */
const PASSWORD_MIN = 8;

const inputClass =
  "w-full rounded-xl border border-black/[0.08] bg-[#fdfdfd] px-4 py-2.5 text-[#0f1012] focus:outline-none focus:ring-2 focus:ring-[#0071e3]";

export function GantiSandiButton({
  variant = "header",
}: {
  variant?: "header" | "sidebar";
}) {
  const [buka, setBuka] = useState(false);
  const [sandiLama, setSandiLama] = useState("");
  const [sandiBaru, setSandiBaru] = useState("");
  const [konfirmasi, setKonfirmasi] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<Record<string, string>>({});
  const [sukses, setSukses] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  function reset() {
    setSandiLama("");
    setSandiBaru("");
    setKonfirmasi("");
    setError(null);
    setFieldError({});
    setSukses(false);
    setIsLoading(false);
  }

  function tutup() {
    if (isLoading) return;
    setBuka(false);
    reset();
  }

  useEffect(() => {
    if (!buka) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") tutup();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  });

  async function simpan() {
    setError(null);
    setFieldError({});

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
      "/api/auth/change-password",
      { method: "POST", body: { sandiLama, sandiBaru } }
    );
    setIsLoading(false);

    if (!hasil.ok) {
      if (hasil.error.fields) setFieldError(hasil.error.fields);
      setError(hasil.error.fields?.sandiLama ? null : hasil.error.message);
      return;
    }

    setSukses(true);
    setSandiLama("");
    setSandiBaru("");
    setKonfirmasi("");
  }

  const tombolTrigger =
    variant === "header"
      ? "inline-flex items-center gap-2 rounded-xl border border-black/[0.08] px-3 py-2 text-sm font-semibold text-[#0f1012] transition-colors hover:bg-black/[0.04]"
      : "w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-white/20 text-white/90 font-semibold text-sm hover:bg-white/10 transition-colors";

  return (
    <>
      <button
        type="button"
        onClick={() => {
          reset();
          setBuka(true);
        }}
        className={tombolTrigger}
      >
        <Key weight="bold" aria-hidden="true" />
        Ganti Kata Sandi
      </button>

      {buka && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={tutup}
            aria-hidden="true"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Ganti kata sandi"
            className="relative w-full max-w-md rounded-3xl border border-black/[0.08] bg-[#fdfdfd] p-6 shadow-2xl"
          >
            <button
              type="button"
              onClick={tutup}
              className="absolute right-4 top-4 rounded-lg p-1 text-[#5e5e5e] hover:bg-black/[0.04]"
              aria-label="Tutup"
            >
              <X weight="bold" />
            </button>

            <h2 className="text-lg font-bold text-[#0f1012]">
              Ganti Kata Sandi
            </h2>
            <p className="mt-1 text-sm text-[#5e5e5e]">
              Masukkan kata sandi lama untuk memastikan ini benar-benar Anda.
            </p>

            {sukses ? (
              <div className="mt-5 space-y-5">
                <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
                  <CheckCircle weight="bold" className="mt-0.5 shrink-0" />
                  <span>Kata sandi berhasil diubah.</span>
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={tutup}
                    className="rounded-xl bg-[#0071e3] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#005fc1]"
                  >
                    Selesai
                  </button>
                </div>
              </div>
            ) : (
              <form
                className="mt-5 space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  simpan();
                }}
              >
                <div>
                  <label htmlFor="sandi-lama" className="mb-1 block text-sm font-semibold">
                    Kata sandi lama
                  </label>
                  <input
                    id="sandi-lama"
                    type="password"
                    autoComplete="current-password"
                    value={sandiLama}
                    onChange={(e) => setSandiLama(e.target.value)}
                    className={inputClass}
                  />
                  {fieldError.sandiLama && (
                    <p className="mt-1 text-xs text-red-600">{fieldError.sandiLama}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="sandi-baru" className="mb-1 block text-sm font-semibold">
                    Kata sandi baru
                  </label>
                  <input
                    id="sandi-baru"
                    type="password"
                    autoComplete="new-password"
                    value={sandiBaru}
                    onChange={(e) => setSandiBaru(e.target.value)}
                    className={inputClass}
                  />
                  <p className="mt-1 text-xs text-[#5e5e5e]">
                    Minimal {PASSWORD_MIN} karakter.
                  </p>
                  {fieldError.sandiBaru && (
                    <p className="mt-1 text-xs text-red-600">{fieldError.sandiBaru}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="sandi-konfirmasi" className="mb-1 block text-sm font-semibold">
                    Ulangi kata sandi baru
                  </label>
                  <input
                    id="sandi-konfirmasi"
                    type="password"
                    autoComplete="new-password"
                    value={konfirmasi}
                    onChange={(e) => setKonfirmasi(e.target.value)}
                    className={inputClass}
                  />
                  {fieldError.konfirmasi && (
                    <p className="mt-1 text-xs text-red-600">{fieldError.konfirmasi}</p>
                  )}
                </div>

                {error && (
                  <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    <WarningCircle weight="bold" className="mt-0.5 shrink-0" />
                    <span role="alert">{error}</span>
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-1">
                  <button
                    type="button"
                    onClick={tutup}
                    disabled={isLoading}
                    className="rounded-xl border border-black/[0.08] px-5 py-2.5 text-sm font-semibold hover:bg-black/[0.06] disabled:opacity-60"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#0071e3] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#005fc1] disabled:opacity-60"
                  >
                    <Key weight="bold" />
                    {isLoading ? "Menyimpan..." : "Simpan Kata Sandi"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
