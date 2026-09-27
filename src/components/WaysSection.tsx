import styles from "./WaysSection.module.css";

type Way = {
  number: string;
  title: string;
  headline: string;
};

const ways: Way[] = [
  {
    number: "01",
    title: "Ruang Terhubung",
    headline:
      "IKASADA membuka ruang bagi alumni lintas angkatan untuk bertemu, berbagi cerita, dan kembali terhubung.",
  },
  {
    number: "02",
    title: "Koneksi Jadi Kolaborasi",
    headline:
      "Koneksi antaralumni bisa berkembang menjadi ruang berbagi gagasan dan kerja sama.",
  },
  {
    number: "03",
    title: "Kegiatan yang Terus Tumbuh",
    headline:
      "Ragam kegiatan IKASADA terus berkembang mengikuti semangat dan kebutuhan komunitas.",
  },
  {
    number: "04",
    title: "Ruang Tumbuh Bersama",
    headline:
      "Mahasiswa aktif, terutama tingkat akhir, bertemu alumni, bertukar pengalaman, dan mencari bekal untuk langkah setelah kampus.",
  },
  {
    number: "05",
    title: "Dosen dan Prodi Terhubung",
    headline:
      "Dosen yang juga alumni berdialog dan berkolaborasi dengan IKASADA melalui dukungan Prodi.",
  },
];

export default function WaysSection() {
  return (
    <section
      id="tiga-cara"
      className={`${styles.manifesto} reveal-section`}
      aria-labelledby="ways-title"
    >
      <div className={styles.manifestoInner}>
        <header className={styles.manifestoHeader}>
          <p className={styles.manifestoKicker}>Jejaring Alumni FIB UI</p>
          <h2 id="ways-title" className={styles.manifestoTitle}>
            Lima cara kami <span>menyambung.</span>
          </h2>
        </header>

        <ol className={styles.manifestoList}>
          {ways.map((way) => (
            <li key={way.number} className={styles.manifestoItem}>
              <div className={styles.manifestoMeta}>
                <span>{way.number}</span>
                <span>{way.title}</span>
              </div>
              <p className={styles.manifestoHeadline}>{way.headline}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
