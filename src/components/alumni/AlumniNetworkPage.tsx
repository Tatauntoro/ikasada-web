"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  ArrowsCounterClockwise,
  CheckCircle,
  EnvelopeSimple,
  HourglassMedium,
  InstagramLogo,
  UserMinus,
  WhatsappLogo,
  XCircle,
} from "@phosphor-icons/react";
import { panggilApi } from "@/lib/api-client";
import { formatTanggalWIB, getInitials } from "@/lib/format";
import type { ItemKoneksiJejaring, LawanBicaraJejaring } from "@/lib/types";
import Pagination from "@/components/Pagination";
import {
  beritahuPermintaanDibaca,
  type HitunganJejaringKlien,
} from "./PermintaanMasukProvider";

/**
 * Halaman Jejaring (FE-Planning §3.6, master planning §4.5).
 *
 * Tiga tab dari satu endpoint (`?tab=`): permintaan masuk, terkirim, dan
 * koneksi yang sudah diterima. Setiap aksi (terima/tolak/batalkan) memanggil
 * endpoint-nya lalu **memuat ulang dari server** — tidak ada perubahan status
 * optimistis, karena status koneksi menentukan data kontak yang boleh terlihat.
 */

export type TabJejaring = "incoming" | "outgoing" | "accepted";

const TAB: { kunci: TabJejaring; label: string }[] = [
  { kunci: "incoming", label: "Permintaan Masuk" },
  { kunci: "outgoing", label: "Permintaan Terkirim" },
  { kunci: "accepted", label: "Terhubung" },
];

const KOSONG: Record<TabJejaring, string> = {
  incoming: "Belum ada permintaan masuk.",
  outgoing: "Belum ada permintaan terkirim. Mulai dari direktori alumni.",
  accepted: "Belum ada koneksi yang diterima.",
};

/** Angka badge tiap tab, beserta teks pembaca layarnya. */
function badgeTab(
  kunci: TabJejaring,
  hitungan: HitunganJejaringKlien | null
): { jumlah: number; label: string } {
  if (!hitungan) return { jumlah: 0, label: "" };

  if (kunci === "incoming") {
    return {
      jumlah: hitungan.belumDibaca,
      label: "permintaan masuk belum dibaca",
    };
  }

  if (kunci === "accepted") {
    /*
     * Tab ini memuat dua kelompok: koneksi baru yang belum dilihat, dan koneksi
     * yang diputus pihak lain. Keduanya dibersihkan sekaligus saat tab dibuka,
     * jadi angkanya dijumlahkan.
     */
    return {
      jumlah: hitungan.belumDiterima + hitungan.belumDiputus,
      label: "kabar koneksi belum dilihat",
    };
  }

  return { jumlah: hitungan.belumDitolak, label: "jawaban ditolak belum dilihat" };
}

const PESAN_GAGAL_MUAT = "Data jejaring belum dapat dimuat.";
const PESAN_GAGAL_AKSI = "Aksi belum berhasil. Coba lagi.";

export default function AlumniNetworkPage({ tabAwal }: { tabAwal: TabJejaring }) {
  const [tab, setTab] = useState<TabJejaring>(tabAwal);
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<ItemKoneksiJejaring[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [memuat, setMemuat] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [menungguJawaban, setMenungguJawaban] = useState<number | null>(null);
  const [hitungan, setHitungan] = useState<HitunganJejaringKlien | null>(null);
  const [idDiproses, setIdDiproses] = useState<string | null>(null);
  const [pesanAksi, setPesanAksi] = useState<{
    id: string;
    pesan: string;
  } | null>(null);
  /** Koneksi `ACCEPTED` yang sedang dikonfirmasi untuk diputuskan. */
  const [putusTarget, setPutusTarget] = useState<ItemKoneksiJejaring | null>(null);

  const muatDaftar = useCallback(
    async (tabTarget: TabJejaring, halaman: number) => {
      setMemuat(true);
      setError(null);

      const hasil = await panggilApi<ItemKoneksiJejaring[]>(
        `/api/alumni/connections?tab=${tabTarget}&page=${halaman}`
      );

      setMemuat(false);

      if (!hasil.ok) {
        setItems([]);
        setTotalPages(1);
        setError(hasil.status === 401 ? "Sesi berakhir. Silakan login kembali." : PESAN_GAGAL_MUAT);
        return;
      }

      setItems(hasil.data);
      setTotalPages(hasil.meta?.totalPages ?? 1);
    },
    []
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    muatDaftar(tab, page);
  }, [muatDaftar, tab, page]);

  /*
   * Ringkasan antrean:
   * - `total`  = permintaan masuk yang menunggu jawaban (baris di bawah judul);
   * - `meta`   = tiga angka notifikasi: permintaan masuk belum dibaca, serta
   *              jawaban diterima/ditolak yang belum dilihat pengirim.
   * Semuanya dari satu permintaan `limit=1` — `GET` sengaja tidak menandai apa
   * pun sebagai sudah dibaca (itu tugas endpoint `/read`).
   */
  const muatMenungguJawaban = useCallback(async () => {
    const hasil = await panggilApi<ItemKoneksiJejaring[]>(
      "/api/alumni/connections?tab=incoming&limit=1"
    );

    if (!hasil.ok) return;

    setMenungguJawaban(hasil.meta?.total ?? 0);
    setHitungan({
      belumDibaca: hasil.meta?.unread ?? 0,
      belumDiterima: hasil.meta?.unreadDiterima ?? 0,
      belumDitolak: hasil.meta?.unreadDitolak ?? 0,
      belumDiputus: hasil.meta?.unreadDiputus ?? 0,
    });
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    muatMenungguJawaban();
  }, [muatMenungguJawaban]);

  /*
   * Begitu sebuah daftar benar-benar tampil, tandai kelompoknya sudah dibaca —
   * sekali per tampilan tab. Tiap tab membersihkan kelompoknya sendiri
   * (masuk/diterima/ditolak), jadi angka di tab lain tidak ikut hilang.
   * Hitungan terbaru dari server dipakai untuk menyinkronkan badge menu shell;
   * kalau panggilan ini gagal, badge tetap menunjukkan angka lama.
   */
  useEffect(() => {
    if (memuat || error) return;

    const jenis =
      tab === "incoming" ? "masuk" : tab === "accepted" ? "terhubung" : "terkirim";

    let batal = false;

    (async () => {
      const hasil = await panggilApi<{
        read: number;
        unread: number;
        unreadDiterima: number;
        unreadDitolak: number;
        unreadDiputus: number;
      }>(`/api/alumni/connections/read?jenis=${jenis}`, { method: "POST" });

      if (batal || !hasil.ok) return;

      const baru: HitunganJejaringKlien = {
        belumDibaca: hasil.data.unread,
        belumDiterima: hasil.data.unreadDiterima,
        belumDitolak: hasil.data.unreadDitolak,
        belumDiputus: hasil.data.unreadDiputus,
      };

      setHitungan(baru);
      beritahuPermintaanDibaca(baru);
    })();

    return () => {
      batal = true;
    };
  }, [tab, memuat, error, items.length]);


  const gantiTab = (tabBaru: TabJejaring) => {
    if (tabBaru === tab) return;

    setTab(tabBaru);
    setPage(1);
    setPesanAksi(null);

    /*
     * Tab disimpan di query string supaya bisa ditautkan (kartu direktori
     * mengarah ke `?tab=incoming`). Ditulis lewat history, bukan `router`, agar
     * tidak memicu render ulang halaman di server hanya untuk pindah tab.
     */
    const url = new URL(window.location.href);
    url.searchParams.set("tab", tabBaru);
    window.history.replaceState(null, "", url);
  };

  const jalankanAksi = async (
    id: string,
    aksi: "accept" | "decline" | "cancel" | "revoke"
  ) => {
    setIdDiproses(id);
    setPesanAksi(null);

    /*
     * Accept/decline/cancel mengubah status permintaan (PATCH), sedangkan
     * memutuskan koneksi (Task 20) memakai DELETE pada resource-nya. Keduanya
     * berakhir dengan memuat ulang dari server.
     */
    const hasil =
      aksi === "revoke"
        ? await panggilApi<ItemKoneksiJejaring>(
            `/api/alumni/connections/${id}`,
            { method: "DELETE" }
          )
        : await panggilApi<ItemKoneksiJejaring>(
            `/api/alumni/connections/${id}/${aksi}`,
            { method: "PATCH" }
          );

    setIdDiproses(null);

    if (!hasil.ok) {
      setPesanAksi({
        id,
        pesan:
          hasil.error.code === "NETWORK_ERROR"
            ? PESAN_GAGAL_AKSI
            : hasil.error.message,
      });

      /*
       * `409` berarti statusnya sudah berubah di server (mis. permintaan dibatalkan
       * pihak lain). Tampilan dimuat ulang supaya tidak tertinggal dari kenyataan,
       * sementara pesannya tetap dibaca user.
       */
      if (hasil.status === 409) {
        await Promise.all([muatDaftar(tab, page), muatMenungguJawaban()]);
      }

      return;
    }

    setPutusTarget(null);
    await Promise.all([muatDaftar(tab, page), muatMenungguJawaban()]);
  };

  return (
    <section>
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <span className="section-label block">Jejaring</span>
          <h1 className="page-title mt-4">Permintaan dan koneksi Anda.</h1>
          {menungguJawaban !== null && menungguJawaban > 0 && (
            <p className="mt-5 text-[14px] tracking-[-0.02em] text-[#5e5e5e]">
              {menungguJawaban} permintaan menunggu jawaban Anda.
            </p>
          )}
        </div>

        <div
          role="group"
          aria-label="Pilih daftar"
          className="flex flex-wrap items-center gap-x-2 gap-y-2 rounded-[16px] border border-[#e1e5eb] bg-white p-1.5"
        >
          {TAB.map((item) => {
            const iniAktif = item.kunci === tab;
            const { jumlah, label } = badgeTab(item.kunci, hitungan);

            return (
              <button
                key={item.kunci}
                type="button"
                onClick={() => gantiTab(item.kunci)}
                aria-pressed={iniAktif}
                className={`inline-flex min-h-11 items-center gap-2 rounded-[12px] px-3 text-[14px] tracking-[-0.02em] transition-colors hover:text-[#005bbb] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0071e3] ${
                  iniAktif
                    ? "bg-[#eaf2ff] text-[#005bbb]"
                    : "text-[#5e6b7b]"
                }`}
              >
                {item.label}
                {jumlah > 0 && (
                  <span
                    className="inline-flex min-w-6 items-center justify-center rounded-full bg-white px-[6px] text-[11px] font-medium text-[#005bbb]"
                    aria-label={`${jumlah} ${label}`}
                  >
                    {jumlah}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-10">
        {memuat && (
          <div className="grid gap-5">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-[148px] w-full animate-pulse rounded-[22px] bg-[#e8edf4] motion-reduce:animate-none"
              />
            ))}
          </div>
        )}

        {!memuat && error && (
          <div
            role="alert"
            className="grid justify-items-center gap-4 rounded-[22px] border border-[#e1e5eb] bg-white px-6 py-12 text-center"
          >
            <UserMinus weight="regular" className="text-[28px] text-[#0071e3]" aria-hidden="true" />
            <p className="text-[15px] tracking-[-0.02em] text-[#1f2937]">{error}</p>
            <button
              type="button"
              onClick={() => muatDaftar(tab, page)}
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[#bdd5f3] bg-[#eef5ff] px-5 text-[13px] tracking-[-0.02em] text-[#005bbb] transition-colors hover:bg-[#e1efff] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0071e3]"
            >
              <ArrowsCounterClockwise weight="regular" className="text-base text-[#0071e3]" aria-hidden="true" />
              Coba lagi
            </button>
          </div>
        )}

        {!memuat && !error && items.length === 0 && (
          <div className="grid justify-items-center gap-4 rounded-[22px] border border-[#e1e5eb] bg-white px-6 py-12 text-center">
            <UserMinus weight="regular" className="text-[28px] text-[#0071e3]" aria-hidden="true" />
            <p className="text-[15px] tracking-[-0.02em] text-[#1f2937]">
              {KOSONG[tab]}
            </p>
            <Link
              href="/alumni"
              className="inline-flex min-h-11 items-center gap-2 text-[13px] tracking-[-0.02em] text-[#005bbb] underline decoration-[#005bbb]/40 underline-offset-4 transition-colors hover:decoration-[#005bbb] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0071e3]"
            >
              Buka direktori alumni
              <ArrowRight weight="regular" aria-hidden="true" />
            </Link>
          </div>
        )}

        {!memuat && !error && items.length > 0 && (
          <ul className="grid gap-5">
            {items.map((item) => (
              <ItemJejaring
                key={item.id}
                item={item}
                tab={tab}
                sedangDiproses={idDiproses === item.id}
                adaYangDiproses={idDiproses !== null}
                pesanError={pesanAksi?.id === item.id ? pesanAksi.pesan : null}
                onAksi={jalankanAksi}
                onPutus={setPutusTarget}
              />
            ))}
          </ul>
        )}

        {!memuat && !error && (
          <Pagination
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
            className="mt-10"
          />
        )}
      </div>

      <DialogKonfirmasiPutus
        target={putusTarget}
        sedangDiproses={putusTarget ? idDiproses === putusTarget.id : false}
        onBatal={() => setPutusTarget(null)}
        onPutus={() => putusTarget && jalankanAksi(putusTarget.id, "revoke")}
      />
    </section>
  );
}

function ItemJejaring({
  item,
  tab,
  sedangDiproses,
  adaYangDiproses,
  pesanError,
  onAksi,
  onPutus,
}: {
  item: ItemKoneksiJejaring;
  tab: TabJejaring;
  sedangDiproses: boolean;
  adaYangDiproses: boolean;
  pesanError: string | null;
  onAksi: (
    id: string,
    aksi: "accept" | "decline" | "cancel" | "revoke"
  ) => void;
  onPutus: (item: ItemKoneksiJejaring) => void;
}) {
  const lawan = item.counterpart;
  const tombolNonaktif = adaYangDiproses;

  return (
    <li className="rounded-[20px] border border-[#e1e5eb] bg-white px-5 py-5 transition-colors hover:border-[#c8d9ee] sm:px-7">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <Avatar lawan={lawan} />

          <div className="min-w-0">
            <h2 className="text-[18px] leading-tight tracking-[-0.02em] text-[#1f2937]">
              {lawan.namaLengkap ?? "Alumni"}
              {lawan.gelar && (
                <span className="text-[14px] text-[#6b7280]"> {lawan.gelar}</span>
              )}
            </h2>
            {lawan.profesi && (
              <p className="mt-1 text-[14px] tracking-[-0.02em] text-[#4b5563]">
                {lawan.profesi}
                {lawan.instansi ? ` · ${lawan.instansi}` : ""}
              </p>
            )}
            <p className="mt-1 text-[12px] tracking-[-0.02em] text-[#6b7280]">
              Angkatan {lawan.angkatan ?? "-"}
            </p>
          </div>
        </div>

        <BadgeState tab={tab} status={item.status} />
      </div>

      {item.message && (
        <blockquote className="mt-5 rounded-[16px] border border-[#e1e5eb] bg-[#f7f9fc] px-5 py-4 text-[14px] leading-[1.5] tracking-[-0.02em] text-[#1f2937]">
          {item.message}
        </blockquote>
      )}

      {tab === "accepted" && item.status === "ACCEPTED" && <Kontak lawan={lawan} />}

      {/*
        Koneksi yang sudah diputus tidak lagi membuka kontak (aturan kontak hanya
        untuk `ACCEPTED`), jadi yang ditampilkan adalah alasannya — bukan pesan
        "belum membuka data kontaknya" yang akan menyesatkan.
      */}
      {item.status === "REVOKED" && (
        <p className="mt-5 border-t border-[#e1e5eb] pt-4 text-[13px] tracking-[-0.02em] text-[#5e6b7b]">
          Kontak ditutup karena koneksi ini sudah diputus. Anda bisa mengirim
          permintaan baru dari direktori alumni.
        </p>
      )}

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[#e1e5eb] pt-4">
        <span className="text-[12px] tracking-[-0.02em] text-[#6b7280]">
          {item.status === "REVOKED"
            ? `Diputuskan ${formatTanggalWIB(item.respondedAt ?? item.createdAt)}`
            : tab === "accepted"
              ? `Terhubung sejak ${formatTanggalWIB(item.respondedAt ?? item.createdAt)}`
              : item.status === "DECLINED"
                ? `Ditolak ${formatTanggalWIB(item.respondedAt ?? item.createdAt)}`
                : `Dikirim ${formatTanggalWIB(item.createdAt)}`}
        </span>

        {tab === "incoming" && (
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => onAksi(item.id, "decline")}
              disabled={tombolNonaktif}
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[#cbd5e1] bg-white px-5 text-[13px] tracking-[-0.02em] text-[#475569] transition-colors hover:border-[#0071e3] hover:text-[#005bbb] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0071e3] disabled:cursor-wait disabled:text-[#9ca3af]"
            >
              <XCircle weight="regular" className="text-base text-[#64748b]" aria-hidden="true" />
              {sedangDiproses ? "Memproses..." : "Tolak"}
            </button>
            <button
              type="button"
              onClick={() => onAksi(item.id, "accept")}
              disabled={tombolNonaktif}
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[#0071e3] bg-[#0071e3] px-5 text-[13px] tracking-[-0.02em] text-white transition-colors hover:bg-[#005bbb] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0071e3] disabled:cursor-wait disabled:border-[#cbd5e1] disabled:bg-[#e5e7eb] disabled:text-[#6b7280]"
            >
              <CheckCircle weight="regular" className="text-base" aria-hidden="true" />
              {sedangDiproses ? "Memproses..." : "Terima"}
            </button>
          </div>
        )}

        {tab === "outgoing" && item.status === "PENDING" && (
          <button
            type="button"
            onClick={() => onAksi(item.id, "cancel")}
            disabled={tombolNonaktif}
          className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[#d92d20]/40 bg-white px-5 text-[13px] tracking-[-0.02em] text-[#b42318] transition-colors hover:border-[#b42318] hover:bg-[#fff5f4] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b42318] disabled:cursor-wait disabled:text-[#9ca3af]"
          >
          <XCircle weight="regular" className="text-base text-[#b42318]" aria-hidden="true" />
            {sedangDiproses ? "Membatalkan..." : "Batalkan permintaan"}
          </button>
        )}

        {tab === "accepted" && item.status === "ACCEPTED" && (
          <button
            type="button"
            onClick={() => onPutus(item)}
            disabled={tombolNonaktif}
          className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[#d92d20]/40 bg-white px-5 text-[13px] tracking-[-0.02em] text-[#b42318] transition-colors hover:border-[#b42318] hover:bg-[#fff5f4] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b42318] disabled:cursor-wait disabled:text-[#9ca3af]"
          >
          <UserMinus weight="regular" className="text-base text-[#b42318]" aria-hidden="true" />
            Putuskan koneksi
          </button>
        )}
      </div>

      {pesanError && (
        <p role="alert" className="mt-3 text-[13px] tracking-[-0.02em] text-[#b42318]">
          {pesanError}
        </p>
      )}
    </li>
  );
}

/**
 * Konfirmasi sebelum memutuskan koneksi (Task 20).
 *
 * Memutus koneksi menutup akses kontak kedua pihak, jadi tidak boleh terjadi
 * karena salah klik. Dialognya `<dialog>` native: fokus terkurung, Escape
 * menutup, dan latarnya tidak bisa diakses keyboard.
 */
function DialogKonfirmasiPutus({
  target,
  sedangDiproses,
  onBatal,
  onPutus,
}: {
  target: ItemKoneksiJejaring | null;
  sedangDiproses: boolean;
  onBatal: () => void;
  onPutus: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const terbuka = Boolean(target);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;

    if (terbuka && !dialog.open) dialog.showModal();
    if (!terbuka && dialog.open) dialog.close();
  }, [terbuka]);

  return (
    <dialog
      ref={ref}
      aria-labelledby="putus-koneksi-judul"
      onCancel={(event) => {
        event.preventDefault();
        onBatal();
      }}
      onClose={onBatal}
      className="m-auto w-[calc(100%-2rem)] max-w-[480px] rounded-[24px] border border-[#e1e5eb] bg-white p-0 text-[#1f2937] backdrop:bg-[#0f1012]/50"
    >
      <div className="p-7 sm:p-9">
        <p className="text-[12px] tracking-[-0.02em] text-[#5e5e5e]">
          Putuskan koneksi
        </p>
        <h2
          id="putus-koneksi-judul"
          className="mt-2 font-sans text-[24px] font-normal leading-[1.2] tracking-[-0.02em]"
        >
          Putuskan koneksi dengan {target?.counterpart.namaLengkap ?? "alumni ini"}?
        </h2>
        <p className="mt-4 text-[14px] leading-[1.5] tracking-[-0.02em] text-[#5e5e5e]">
          Setelah diputus, kontak Anda berdua tidak lagi saling terlihat di
          daftar koneksi. Kalau berubah pikiran, kalian masih bisa saling
          mengirim permintaan koneksi baru kapan saja.
        </p>

        <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onBatal}
            className="min-h-11 rounded-full border border-[#cbd5e1] px-5 text-[13px] tracking-[-0.02em] text-[#475569] transition-colors hover:border-[#0071e3] hover:text-[#005bbb] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0071e3]"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onPutus}
            disabled={sedangDiproses}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[#d92d20]/40 px-5 text-[13px] tracking-[-0.02em] text-[#b42318] transition-colors hover:bg-[#fff5f4] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b42318] disabled:cursor-wait disabled:border-[#e1e5eb] disabled:text-[#8f8f8f]"
          >
            <UserMinus weight="regular" className="text-base text-[#b42318]" aria-hidden="true" />
            {sedangDiproses ? "Memutuskan..." : "Ya, putuskan"}
          </button>
        </div>
      </div>
    </dialog>
  );
}

function Avatar({ lawan }: { lawan: LawanBicaraJejaring }) {
  return (
    <span className="size-14 shrink-0 overflow-hidden rounded-full bg-[#eaf2ff]">
      {lawan.fotoUrl ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={lawan.fotoUrl}
          alt=""
          className="size-full object-cover"
        />
      ) : (
        <span className="grid size-full place-items-center text-[16px] text-[#005bbb]">
          {lawan.namaLengkap ? getInitials(lawan.namaLengkap) : "?"}
        </span>
      )}
    </span>
  );
}

function BadgeState({
  tab,
  status,
}: {
  tab: TabJejaring;
  status: ItemKoneksiJejaring["status"];
}) {
  if (status === "REVOKED") {
    return (
      <span className="inline-flex shrink-0 items-center gap-2 rounded-full border border-[#cbd5e1] bg-[#f7f9fc] px-3 py-1 text-[11px] tracking-[-0.02em] text-[#64748b]">
        <UserMinus weight="regular" aria-hidden="true" />
        Diputuskan
      </span>
    );
  }

  if (status === "DECLINED") {
    return (
      <span className="inline-flex shrink-0 items-center gap-2 rounded-full border border-[#cbd5e1] bg-[#f7f9fc] px-3 py-1 text-[11px] tracking-[-0.02em] text-[#64748b]">
        <XCircle weight="regular" aria-hidden="true" />
        Ditolak
      </span>
    );
  }

  if (tab === "accepted") {
    return (
      <span className="inline-flex shrink-0 items-center gap-2 rounded-full border border-[#bdd5f3] bg-[#eef5ff] px-3 py-1 text-[11px] tracking-[-0.02em] text-[#005bbb]">
        <CheckCircle weight="regular" aria-hidden="true" />
        Terhubung
      </span>
    );
  }

  return (
    <span className="inline-flex shrink-0 items-center gap-2 rounded-full border border-[#f4d5a2] bg-[#fff8eb] px-3 py-1 text-[11px] tracking-[-0.02em] text-[#8a4b00]">
      <HourglassMedium weight="regular" aria-hidden="true" />
      {tab === "incoming" ? "Menunggu jawaban Anda" : "Menunggu jawaban"}
    </span>
  );
}

/**
 * Kontak hanya sampai ke sini kalau pemiliknya menyalakan consent-nya dan
 * koneksinya sudah `ACCEPTED` (master planning §7) — field yang tidak diizinkan
 * memang tidak ada di response, bukan berisi `null`.
 */
function Kontak({ lawan }: { lawan: LawanBicaraJejaring }) {
  const punyaKontak = Boolean(
    lawan.email || lawan.noWhatsapp || lawan.linkInstagram
  );

  if (!punyaKontak) {
    return (
      <p className="mt-5 border-t border-[#e1e5eb] pt-4 text-[13px] tracking-[-0.02em] text-[#5e6b7b]">
        {lawan.namaLengkap ?? "Alumni ini"} belum membuka data kontaknya.
      </p>
    );
  }

  const tautanKelas =
    "inline-flex min-h-11 items-center gap-2 text-[13px] tracking-[-0.02em] text-[#005bbb] underline decoration-[#005bbb]/40 underline-offset-4 hover:decoration-[#005bbb] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0071e3]";

  return (
    <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-[#e1e5eb] pt-4">
      {lawan.email && (
        <a href={`mailto:${lawan.email}`} className={tautanKelas}>
          <EnvelopeSimple weight="regular" className="text-base" aria-hidden="true" />
          {lawan.email}
        </a>
      )}
      {lawan.noWhatsapp && (
        <a
          href={`https://wa.me/${lawan.noWhatsapp}`}
          target="_blank"
          rel="noopener noreferrer"
          className={tautanKelas}
        >
          <WhatsappLogo weight="regular" className="text-base" aria-hidden="true" />
          WhatsApp
        </a>
      )}
      {lawan.linkInstagram && (
        <a
          href={lawan.linkInstagram}
          target="_blank"
          rel="noopener noreferrer"
          className={tautanKelas}
        >
          <InstagramLogo weight="regular" className="text-base" aria-hidden="true" />
          Instagram
        </a>
      )}
    </div>
  );
}
