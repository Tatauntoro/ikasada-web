import { Fragment, type ReactNode } from "react";
import {
  parseInline,
  parseRichText,
  type Blok,
  type InlineToken,
} from "@/lib/rich-text";

/**
 * Renderer Markdown ringan (aman, tanpa `dangerouslySetInnerHTML`).
 *
 * Semua teks dari admin di-render sebagai teks React (otomatis di-escape);
 * hanya tag yang komponen ini hasilkan sendiri yang muncul. URL pada
 * tautan/gambar sudah disaring `isUrlAman` di lapisan parser.
 */
function Inline({ teks }: { teks: string }) {
  const token: InlineToken[] = parseInline(teks);

  return (
    <>
      {token.map((t, i) => {
        if (t.t === "tebal") {
          return <strong key={i}>{t.value}</strong>;
        }
        if (t.t === "miring") {
          return <em key={i}>{t.value}</em>;
        }
        if (t.t === "tautan") {
          const luar = /^https?:\/\//i.test(t.href);
          return (
            <a
              key={i}
              href={t.href}
              {...(luar
                ? { target: "_blank", rel: "noopener noreferrer" }
                : {})}
              className="text-[#0071e3] underline underline-offset-4 hover:text-[#005fc1]"
            >
              {t.value}
            </a>
          );
        }
        return <Fragment key={i}>{t.value}</Fragment>;
      })}
    </>
  );
}

function Baris({ isi }: { isi: string }) {
  const baris = isi.split("\n");
  return (
    <>
      {baris.map((b, i) => (
        <Fragment key={i}>
          {i > 0 && <br />}
          <Inline teks={b} />
        </Fragment>
      ))}
    </>
  );
}

function BlokView({ blok }: { blok: Blok }): ReactNode {
  if (blok.tipe === "heading") {
    return (
      <h2 className="text-xl font-semibold tracking-[-0.02em]">
        <Inline teks={blok.isi} />
      </h2>
    );
  }

  if (blok.tipe === "list") {
    const List = blok.ordered ? "ol" : "ul";
    return (
      <List
        className={`ml-5 space-y-1 ${
          blok.ordered ? "list-decimal" : "list-disc"
        }`}
      >
        {blok.item.map((item, i) => (
          <li key={i}>
            <Inline teks={item} />
          </li>
        ))}
      </List>
    );
  }

  if (blok.tipe === "gambar") {
    return (
      <figure className="my-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={blok.src}
          alt={blok.caption || ""}
          loading="lazy"
          className="w-full rounded-2xl border border-black/[0.08] object-cover"
        />
        {blok.caption && (
          <figcaption className="mt-2 text-center text-sm text-[#5e5e5e]">
            {blok.caption}
          </figcaption>
        )}
      </figure>
    );
  }

  return (
    <p>
      <Baris isi={blok.isi} />
    </p>
  );
}

export default function RichText({
  teks,
  className,
}: {
  teks?: string | null;
  className?: string;
}) {
  const blok = parseRichText(teks);
  if (blok.length === 0) return null;

  return (
    <div className={className ?? "space-y-4"}>
      {blok.map((b, i) => (
        <BlokView key={i} blok={b} />
      ))}
    </div>
  );
}
