/**
 * Rich text ringan berbasis Markdown (tanpa dependency eksternal).
 *
 * Disimpan apa adanya di kolom teks yang sudah ada, jadi data lama (teks biasa)
 * tetap tampil tanpa perubahan. Parsing di sini murni: hasilnya dipetakan ke
 * elemen React oleh `@/components/RichText`, bukan disuntik sebagai HTML mentah,
 * sehingga tidak ada jalur XSS.
 *
 * Sintaks yang didukung:
 * - paragraf (dipisah baris kosong), dengan baris tunggal jadi pemisah baris
 * - `## Judul` → sub-judul
 * - `- item` → daftar berbutir, `1. item` → daftar bernomor
 * - `**tebal**`, `*miring*` / `_miring_`
 * - `[teks](url)` → tautan
 * - `![caption](url)` di barisnya sendiri → gambar + caption
 */

/** Skema URL yang aman untuk href/src. Relatif (`/...`) diizinkan. */
export function isUrlAman(url: string | null | undefined): boolean {
  if (!url) return false;
  const bersih = url.trim();
  return (
    bersih.startsWith("/") ||
    /^https?:\/\//i.test(bersih) ||
    /^mailto:/i.test(bersih) ||
    /^tel:/i.test(bersih)
  );
}

export type Blok =
  | { tipe: "paragraf"; isi: string }
  | { tipe: "heading"; isi: string }
  | { tipe: "list"; ordered: boolean; item: string[] }
  | { tipe: "gambar"; src: string; caption: string };

export type InlineToken =
  | { t: "teks"; value: string }
  | { t: "tebal"; value: string }
  | { t: "miring"; value: string }
  | { t: "tautan"; value: string; href: string };

const RE_GAMBAR = /^!\[(.*?)\]\((.*?)\)\s*$/;
const RE_HEADING = /^#{1,6}\s+(.*)$/;
const RE_BULLET = /^[-*]\s+(.*)$/;
const RE_ORDERED = /^\d+\.\s+(.*)$/;

/** Ubah Markdown menjadi daftar blok. */
export function parseRichText(md: string | null | undefined): Blok[] {
  if (!md) return [];

  const blok: Blok[] = [];
  let paragraf: string[] = [];
  let list: { ordered: boolean; item: string[] } | null = null;

  const tutupParagraf = () => {
    if (paragraf.length > 0) {
      blok.push({ tipe: "paragraf", isi: paragraf.join("\n") });
      paragraf = [];
    }
  };
  const tutupList = () => {
    if (list) {
      blok.push({ tipe: "list", ordered: list.ordered, item: list.item });
      list = null;
    }
  };

  for (const barisMentah of md.replace(/\r\n/g, "\n").split("\n")) {
    const baris = barisMentah.trimEnd();

    if (baris.trim() === "") {
      tutupParagraf();
      tutupList();
      continue;
    }

    const gambar = baris.match(RE_GAMBAR);
    if (gambar) {
      tutupParagraf();
      tutupList();
      const src = gambar[2].trim();
      if (isUrlAman(src)) {
        blok.push({ tipe: "gambar", src, caption: gambar[1].trim() });
      }
      continue;
    }

    const heading = baris.match(RE_HEADING);
    if (heading) {
      tutupParagraf();
      tutupList();
      blok.push({ tipe: "heading", isi: heading[1].trim() });
      continue;
    }

    const bullet = baris.match(RE_BULLET);
    const ordered = baris.match(RE_ORDERED);
    if (bullet || ordered) {
      tutupParagraf();
      const jenis = bullet ? false : true;
      if (!list || list.ordered !== jenis) {
        tutupList();
        list = { ordered: jenis, item: [] };
      }
      list.item.push((bullet ? bullet[1] : ordered![1]).trim());
      continue;
    }

    tutupList();
    paragraf.push(baris);
  }

  tutupParagraf();
  tutupList();

  return blok;
}

/**
 * Pisahkan formatasi inline (tebal/miring/tautan) tanpa menyentuh HTML —
 * teks yang tidak cocok dikembalikan apa adanya dan di-escape oleh renderer.
 */
export function parseInline(teks: string): InlineToken[] {
  const token: InlineToken[] = [];
  const pola = /\[([^\]]+)\]\(([^)\s]+)\)|\*\*([^*]+)\*\*|__([^_]+)__|\*([^*]+)\*|_([^_]+)_/g;

  let terakhir = 0;
  let cocok: RegExpExecArray | null;

  while ((cocok = pola.exec(teks)) !== null) {
    if (cocok.index > terakhir) {
      token.push({ t: "teks", value: teks.slice(terakhir, cocok.index) });
    }

    if (cocok[1] !== undefined) {
      const href = cocok[2];
      if (isUrlAman(href)) {
        token.push({ t: "tautan", value: cocok[1], href });
      } else {
        token.push({ t: "teks", value: cocok[0] });
      }
    } else if (cocok[3] !== undefined || cocok[4] !== undefined) {
      token.push({ t: "tebal", value: cocok[3] ?? cocok[4] });
    } else {
      token.push({ t: "miring", value: cocok[5] ?? cocok[6] });
    }

    terakhir = pola.lastIndex;
  }

  if (terakhir < teks.length) {
    token.push({ t: "teks", value: teks.slice(terakhir) });
  }

  return token;
}

/**
 * Versi teks polos untuk kartu/label satu baris: buang penanda Markdown,
 * tautan jadi teksnya, gambar dibuang, dan baris dilipat jadi satu spasi.
 */
export function keTeksBiasa(md: string | null | undefined): string {
  if (!md) return "";

  return md
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/(\*\*|__)(.*?)\1/g, "$2")
    .replace(/(\*|_)(.*?)\1/g, "$2")
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    .replace(/^\s{0,3}[-*]\s+/gm, "")
    .replace(/^\s{0,3}\d+\.\s+/gm, "")
    .replace(/\s+/g, " ")
    .trim();
}
