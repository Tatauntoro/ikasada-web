"use client";

import {
  CheckCircle,
  EnvelopeSimple,
  Handshake,
  Info,
  PaperPlaneTilt,
  UserCircle,
  WarningCircle,
  X,
} from "@phosphor-icons/react";
import { FormEvent, useId, useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import type { StatusKoneksi } from "@/lib/connection";
import { MESSAGE_MAX } from "@/lib/validations/connection";

/**
 * Tombol koneksi pada kartu direktori (FE-Planning §3.4, §5).
 *
 * Lima keadaan datang dari server lewat `connectionStatus`; tidak ada satu pun
 * yang disimpulkan sendiri oleh FE. Keadaan `LOADING` dan `ERROR` sengaja tidak
 * ada di sini: mutation terjadi di dalam dialog (lihat
 * `ConnectionRequestDialog`), jadi tombol di balik dialog modal tidak pernah
 * dilihat dalam keadaan memuat atau gagal.
 *
 * Keadaan yang sudah punya halaman tujuan menjadi tautan (`PENDING_RECEIVED` dan
 * `ACCEPTED` ke daftar jejaring, `SELF` ke profil sendiri); `PENDING_SENT`
 * tetap label karena pembatalannya ada di halaman jejaring, bukan di kartu.
 */

type ConnectionButtonProps = {
  status: StatusKoneksi;
  onConnect?: () => void;
  /** Tujuan untuk keadaan label; tanpa ini, keadaan itu dirender sebagai teks. */
  tautan?: string;
};

type ConnectionRequestDialogProps = {
  recipientName: string | null;
  /**
   * Penerima belum menyalakan satu pun status keterbukaan. Status keterbukaan
   * adalah sinyal, bukan izin — permintaan tetap boleh dikirim, jadi yang
   * dilakukan dialog hanyalah menyiapkan harapan pengirim (§7 master planning).
   */
  penerimaBelumMengaturKeterbukaan?: boolean;
  onClose: () => void;
  /** `ok: false` membawa pesan yang sudah siap ditampilkan. */
  onSubmit: (message: string) => Promise<{ ok: boolean; pesan?: string }>;
};

const controlClassName =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-full border px-4 py-2 text-[12px] font-normal tracking-[-0.01em] transition-colors active:translate-y-px focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-[#69adff]";

/** Label keadaan yang tidak punya aksi di kartu (bukan tombol), atau tautannya. */
function LabelKoneksi({
  ikon,
  teks,
  tautan,
}: {
  ikon: ReactNode;
  teks: string;
  tautan?: string;
}) {
  const isi = (
    <>
      <span className="text-base text-white/60" aria-hidden="true">
        {ikon}
      </span>
      {teks}
    </>
  );

  if (tautan) {
    return (
      <Link
        href={tautan}
        className={`${controlClassName} border-white/25 text-white/90 hover:border-white/60 hover:text-white`}
      >
        {isi}
      </Link>
    );
  }

  return (
    <span
      className={`${controlClassName} cursor-default border-white/25 text-white/75`}
      aria-live="polite"
    >
      {isi}
    </span>
  );
}

/**
 * Alumni belum punya akun jejaring aktif.
 *
 * Bukan tombol, dan bukan pula "menunggu" apa pun: permintaan koneksi ke mereka
 * memang selalu ditolak server (penerima wajib `ACTIVE`), jadi kartunya
 * menjelaskan keadaan itu alih-alih menawarkan aksi yang pasti gagal.
 */
export function LabelTanpaAkunJejaring() {
  return (
    <LabelKoneksi
      ikon={<Info weight="regular" />}
      teks="Belum punya akun jejaring"
    />
  );
}

export function ConnectionButton({
  status,
  onConnect,
  tautan,
}: ConnectionButtonProps) {
  if (status === "PENDING_SENT") {
    return (
      <LabelKoneksi
        ikon={<PaperPlaneTilt weight="regular" />}
        teks="Permintaan dikirim"
      />
    );
  }

  if (status === "PENDING_RECEIVED") {
    return (
      <LabelKoneksi
        ikon={<EnvelopeSimple weight="regular" />}
        teks="Lihat Permintaan"
        tautan={tautan}
      />
    );
  }

  if (status === "ACCEPTED") {
    return (
      <LabelKoneksi
        ikon={<CheckCircle weight="regular" />}
        teks="Terhubung"
        tautan={tautan}
      />
    );
  }

  if (status === "SELF") {
    return (
      <LabelKoneksi
        ikon={<UserCircle weight="regular" />}
        teks="Profil Anda"
        tautan={tautan}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={onConnect}
      className={`${controlClassName} border-[#0071e3] text-white hover:bg-[#0071e3]/15`}
    >
      <Handshake weight="regular" className="text-base text-[#69adff]" aria-hidden="true" />
      Hubungkan
    </button>
  );
}

export function ConnectionRequestDialog({
  recipientName,
  penerimaBelumMengaturKeterbukaan = false,
  onClose,
  onSubmit,
}: ConnectionRequestDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [message, setMessage] = useState("");
  const [sedangKirim, setSedangKirim] = useState(false);
  const [pesanError, setPesanError] = useState<string | null>(null);
  const isOpen = Boolean(recipientName);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen && !dialog.open) dialog.showModal();
    if (!isOpen && dialog.open) dialog.close();
  }, [isOpen]);

  /*
   * Setiap jalur penutupan melewati sini, dan di sini juga state dikosongkan —
   * jadi draf pesan serta error penerima sebelumnya tidak pernah terbawa ke
   * penerima berikutnya, tanpa perlu effect penyelaras.
   */
  function tutup() {
    setMessage("");
    setPesanError(null);
    setSedangKirim(false);
    onClose();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sedangKirim) return;

    setSedangKirim(true);
    setPesanError(null);

    const hasil = await onSubmit(message.trim());

    if (hasil.ok) {
      tutup();
      return;
    }

    setSedangKirim(false);
    setPesanError(hasil.pesan ?? "Permintaan belum terkirim. Coba lagi.");
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        tutup();
      }}
      onClose={tutup}
      className="m-auto w-[calc(100%-2rem)] max-w-[520px] rounded-[54px] border border-black/[0.06] bg-[#fdfdfd] p-0 text-[#0f1012] backdrop:bg-[#0f1012]/50"
    >
      <form onSubmit={handleSubmit} className="p-7 sm:p-10">
        <div className="flex items-start justify-between gap-6">
          <div>
            <p className="text-[12px] font-normal tracking-[-0.02em] text-[#5e5e5e]">
              Permintaan koneksi
            </p>
            <h2
              id={titleId}
              className="mt-2 font-sans text-[27px] font-normal leading-[1.2] tracking-[-0.02em]"
            >
              Terhubung dengan {recipientName || "alumni ini"}?
            </h2>
          </div>
          <button
            type="button"
            onClick={tutup}
            aria-label="Tutup dialog"
            className="grid size-11 shrink-0 place-items-center rounded-full border border-black/[0.08] text-[#0f1012] transition-colors hover:border-[#0071e3] hover:text-[#0071e3] focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-[#0071e3]"
          >
            <X weight="regular" className="text-lg" />
          </button>
        </div>

        {penerimaBelumMengaturKeterbukaan && (
          <p className="mt-4 max-w-[42ch] text-[13px] leading-[1.5] tracking-[-0.02em] text-[#5e5e5e]">
            Alumni ini belum mengatur status keterbukaannya. Permintaan tetap
            bisa dikirim, tetapi tanggapannya bisa jadi lebih lama.
          </p>
        )}

        <div className="mt-8 grid gap-2">
          <label htmlFor="connection-message" className="text-[14px] font-normal tracking-[-0.02em]">
            Pesan pengantar <span className="text-[#5e5e5e]">(opsional)</span>
          </label>
          <textarea
            id="connection-message"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            maxLength={MESSAGE_MAX}
            rows={4}
            autoFocus
            disabled={sedangKirim}
            placeholder="Tulis alasan singkat untuk terhubung"
            className="w-full resize-none rounded-[26px] border border-black/[0.1] bg-[#f2f2f4] px-4 py-3 text-[16px] font-normal tracking-[-0.02em] outline-none placeholder:text-[#8f8f8f] focus:border-[#0071e3] disabled:opacity-60"
          />
          <p className="text-right text-[12px] text-[#5e5e5e]" aria-live="polite">
            {message.length}/{MESSAGE_MAX}
          </p>
        </div>

        {pesanError && (
          <div
            role="alert"
            className="mt-5 flex items-start gap-2 rounded-[26px] border border-[#0071e3] bg-[#0071e3]/[0.08] px-4 py-3 text-[13px] leading-[1.4] tracking-[-0.02em] text-[#0f1012]"
          >
            <WarningCircle
              weight="regular"
              className="mt-[2px] shrink-0 text-base text-[#0071e3]"
              aria-hidden="true"
            />
            <span>{pesanError}</span>
          </div>
        )}

        <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={tutup}
            className="min-h-11 rounded-full border border-black/[0.1] px-5 text-[13px] font-normal tracking-[-0.02em] text-[#0f1012] transition-colors hover:border-[#0071e3] hover:text-[#0071e3] focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-[#0071e3]"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={sedangKirim}
            aria-busy={sedangKirim}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[#0071e3] px-5 text-[13px] font-normal tracking-[-0.02em] text-[#0f1012] transition-colors hover:bg-[#0071e3]/10 focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-[#0071e3] disabled:cursor-wait disabled:border-black/[0.12] disabled:text-[#8f8f8f]"
          >
            <PaperPlaneTilt weight="regular" className="text-base text-[#0071e3]" aria-hidden="true" />
            {sedangKirim ? "Mengirim..." : "Kirim permintaan"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
