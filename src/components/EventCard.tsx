import Link from "next/link";
import type { PublicKegiatan } from "@/lib/types";
import { formatTanggalWIB } from "@/lib/format";
import { rekamAsalMorphDari } from "./motion/ImageMorph";
import styles from "./AllEventsGrid.module.css";

export default function EventCard({
  item,
  headingLevel = 3,
}: {
  item: PublicKegiatan;
  headingLevel?: 2 | 3;
}) {
  const Heading = headingLevel === 2 ? "h2" : "h3";

  return (
    <article className={styles.event}>
      <Link
        href={`/kegiatan/${item.slug}`}
        onClick={(event) => rekamAsalMorphDari(event.currentTarget)}
      >
        <span className={styles.image}>
          {item.gambarThumbnailUrl && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={item.gambarThumbnailUrl} alt={item.judul} />
          )}
        </span>
        <Heading className={styles.eventTitle}>{item.judul}</Heading>
        <p className={styles.meta}>
          <time dateTime={item.tanggalMulai}>
            {formatTanggalWIB(item.tanggalMulai)}
          </time>
          {item.lokasi && <> · {item.lokasi}</>}
        </p>
      </Link>
    </article>
  );
}
