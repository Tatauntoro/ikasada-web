"use client";

import { useId, useRef, useState, type ChangeEvent } from "react";
import {
  Eye,
  Image as ImageIcon,
  LinkSimple,
  ListBullets,
  ListNumbers,
  Spinner,
  TextB,
  TextH,
  TextItalic,
} from "@phosphor-icons/react";
import RichText from "@/components/RichText";

export type TipeUploadKonten =
  | "kegiatan"
  | "berita"
  | "arsip"
  | "kerjasama";

/**
 * Editor rich text ringan (Markdown) tanpa dependency eksternal.
 *
 * Menyimpan Markdown ke kolom teks yang sudah ada. Tombol "Sisipkan gambar"
 * mengunggah lewat `/api/admin/upload` lalu menyisipkan `![caption](url)` —
 * caption bisa langsung disunting sebagai teks di dalam kurung siku.
 */
export default function RichTextEditor({
  id,
  value,
  onChange,
  tipe,
  rows = 6,
  placeholder,
  label = "Gambar konten",
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  tipe: TipeUploadKonten;
  rows?: number;
  placeholder?: string;
  label?: string;
}) {
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const fileId = useId();
  const [unggah, setUnggah] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);
  const [pratinjau, setPratinjau] = useState(false);

  function sisip(bungkus: string, penutup = "") {
    const el = areaRef.current;
    if (!el) {
      onChange(`${value}${bungkus}${penutup}`);
      return;
    }
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const dipilih = value.slice(start, end);
    const baru = `${value.slice(0, start)}${bungkus}${dipilih}${penutup}${value.slice(end)}`;
    onChange(baru);

    requestAnimationFrame(() => {
      el.focus();
      const pos = start + bungkus.length + dipilih.length;
      el.setSelectionRange(pos, pos);
    });
  }

  function sisipBaris(teks: string) {
    const el = areaRef.current;
    if (!el) {
      onChange(`${value}\n${teks}`);
      return;
    }
    const start = el.selectionStart;
    const awalBaris = value.lastIndexOf("\n", start - 1) + 1;
    const sebelum = value.slice(0, awalBaris);
    const sisa = value.slice(awalBaris);
    const butuhBarisBaru = sebelum.length > 0 && !sebelum.endsWith("\n\n");
    const tambahan = `${butuhBarisBaru ? "\n" : ""}${teks}\n`;
    onChange(`${sebelum}${tambahan}${sisa}`);

    requestAnimationFrame(() => {
      el.focus();
      const pos = sebelum.length + tambahan.length;
      el.setSelectionRange(pos, pos);
    });
  }

  async function pilihGambar(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setGalat(null);
    setUnggah(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("tipe", tipe);

      const response = await fetch("/api/admin/upload", {
        method: "POST",
        body: formData,
      });
      const hasil = await response.json();

      if (!response.ok || !hasil?.data?.url) {
        setGalat(hasil?.error?.message || "Upload gambar gagal.");
        return;
      }

      const caption = file.name.replace(/\.[^.]+$/, "");
      sisipBaris(`![${caption}](${hasil.data.url})`);
    } catch {
      setGalat("Terjadi kesalahan jaringan saat upload.");
    } finally {
      setUnggah(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const tombol =
    "inline-flex h-9 w-9 items-center justify-center rounded-lg text-[#0f1012] transition-colors hover:bg-black/[0.06] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0071e3]";

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1 rounded-xl border border-black/[0.08] bg-[#fdfdfd] p-1">
        <button type="button" className={tombol} title="Tebal" aria-label="Tebal" onClick={() => sisip("**", "**")}>
          <TextB weight="bold" />
        </button>
        <button type="button" className={tombol} title="Miring" aria-label="Miring" onClick={() => sisip("*", "*")}>
          <TextItalic weight="bold" />
        </button>
        <button type="button" className={tombol} title="Sub-judul" aria-label="Sub-judul" onClick={() => sisipBaris("## ")}>
          <TextH weight="bold" />
        </button>
        <button type="button" className={tombol} title="Daftar berbutir" aria-label="Daftar berbutir" onClick={() => sisipBaris("- ")}>
          <ListBullets weight="bold" />
        </button>
        <button type="button" className={tombol} title="Daftar bernomor" aria-label="Daftar bernomor" onClick={() => sisipBaris("1. ")}>
          <ListNumbers weight="bold" />
        </button>
        <button type="button" className={tombol} title="Tautan" aria-label="Tautan" onClick={() => sisip("[teks](https://)")}>
          <LinkSimple weight="bold" />
        </button>
        <span className="mx-1 h-6 w-px bg-black/10" aria-hidden="true" />
        <button
          type="button"
          className={tombol}
          title="Sisipkan gambar + caption"
          aria-label="Sisipkan gambar"
          onClick={() => fileRef.current?.click()}
          disabled={unggah}
        >
          {unggah ? <Spinner weight="bold" className="animate-spin" /> : <ImageIcon weight="bold" />}
        </button>
        <button
          type="button"
          className={`${tombol} ${pratinjau ? "bg-[#0071e3]/10 text-[#0071e3]" : ""}`}
          title="Pratinjau"
          aria-label="Pratinjau"
          onClick={() => setPratinjau((p) => !p)}
        >
          <Eye weight="bold" />
        </button>
      </div>

      <input
        ref={fileRef}
        id={fileId}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        onChange={pilihGambar}
        aria-label={label}
        className="hidden"
      />

      <textarea
        ref={areaRef}
        id={id}
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full resize-none rounded-xl border border-black/[0.08] bg-[#fdfdfd] px-3 py-2 text-sm text-[#0f1012] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
      />

      {pratinjau && value.trim() && (
        <div className="rounded-xl border border-black/[0.08] bg-[#fdfdfd] px-4 py-3 text-sm text-[#0f1012]">
          <RichText teks={value} className="space-y-3" />
        </div>
      )}

      <p className="text-xs text-[#8f8f8f]">
        Mendukung **tebal**, *miring*, daftar, tautan, dan gambar dengan caption.
      </p>
      {galat && <p className="text-xs font-medium text-red-600">{galat}</p>}
    </div>
  );
}
