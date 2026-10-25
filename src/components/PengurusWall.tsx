"use client";

import { useState } from "react";
import { AnimatePresence, m, useReducedMotion } from "framer-motion";
import { CaretLeft, CaretRight, Users } from "@phosphor-icons/react";

export type PengurusItem = {
  id: string;
  nama: string;
  jabatan: string;
  angkatan: string | null;
  ket: string | null;
  fotoUrl: string | null;
};

const rotasiKartu = [-8, 7, -5, 9];

export function PengurusCarousel({ pengurus }: { pengurus: PengurusItem[] }) {
  const [active, setActive] = useState(0);
  const reducedMotion = useReducedMotion();
  const jumlah = pengurus.length;

  if (jumlah === 0) {
    return (
      <p role="status" className="py-16 text-center text-[#5e5e5e]">
        Belum ada pengurus yang ditampilkan.
      </p>
    );
  }

  const indexAktif = active % jumlah;
  const pengurusAktif = pengurus[indexAktif];
  const keterangan = [pengurusAktif.angkatan, pengurusAktif.ket]
    .filter(Boolean)
    .join(" · ");
  const ganti = (arah: number) => {
    setActive((index) => (index + arah + jumlah) % jumlah);
  };

  const tombolClass =
    "group grid h-11 w-11 place-items-center rounded-full bg-[#e6e6e8] text-[#0f1012] transition-colors hover:bg-[#0f1012] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0b5ed7] disabled:cursor-default disabled:opacity-40";

  return (
    <div
      role="group"
      aria-roledescription="carousel"
      aria-label="Dewan pengurus inti"
      tabIndex={jumlah > 1 ? 0 : -1}
      onKeyDown={(event) => {
        if (jumlah < 2) return;
        if (event.key === "ArrowLeft") {
          event.preventDefault();
          ganti(-1);
        }
        if (event.key === "ArrowRight") {
          event.preventDefault();
          ganti(1);
        }
      }}
      className="mx-0 grid max-w-5xl grid-cols-1 items-center gap-8 outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0b5ed7] md:grid-cols-2 md:gap-10 lg:gap-12"
    >
      <div className="relative isolate h-[280px] w-full [perspective:1100px] sm:h-[320px] lg:h-[360px]">
        {pengurus.map((item, index) => {
          const isActive = index === indexAktif;
          const rotate = rotasiKartu[index % rotasiKartu.length];

          return (
            <m.div
              key={item.id}
              aria-hidden={!isActive}
              initial={false}
              animate={
                reducedMotion
                  ? { opacity: isActive ? 1 : 0.65 }
                  : {
                      opacity: isActive ? 1 : 0.65,
                      scale: isActive ? 1 : 0.95,
                      z: isActive ? 0 : -100,
                      rotate: isActive ? 0 : rotate,
                      y: isActive ? [0, -72, 0] : 0,
                    }
              }
              transition={{ duration: 0.4, ease: "easeInOut" }}
              style={{
                zIndex: isActive ? jumlah + 1 : jumlah - index,
                transformOrigin: "center bottom",
              }}
              className="absolute inset-0 overflow-hidden rounded-3xl bg-[#e7e7ec]"
            >
              {item.fotoUrl ? (
                /* Foto pengurus dapat berasal dari upload privat; URL publiknya sudah dilayani route aplikasi. */
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={item.fotoUrl}
                  alt=""
                  draggable={false}
                  className="h-full w-full object-cover object-center"
                />
              ) : (
                <div className="grid h-full w-full place-items-center text-[#5e5e5e]">
                  <Users aria-hidden="true" size={64} weight="thin" />
                </div>
              )}
            </m.div>
          );
        })}
      </div>

      <div className="flex min-h-[220px] flex-col justify-between py-1 md:min-h-[320px] lg:min-h-[360px] lg:py-2">
        <AnimatePresence mode="wait" initial={false}>
          <m.div
            key={pengurusAktif.id}
            aria-live="polite"
            aria-atomic="true"
            initial={reducedMotion ? { opacity: 0 } : { y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={reducedMotion ? { opacity: 0 } : { y: -20, opacity: 0 }}
            transition={{ duration: reducedMotion ? 0.01 : 0.2, ease: "easeInOut" }}
          >
            <h3 className="text-[28px] leading-[1.08] font-medium tracking-[-0.03em] text-[#0f1012] sm:text-[34px]">
              {pengurusAktif.nama}
            </h3>
            <p className="mt-2 text-[15px] leading-normal text-[#5e5e5e]">
              {pengurusAktif.jabatan}
            </p>
            {keterangan && (
              <p className="mt-8 max-w-[470px] text-[18px] leading-relaxed text-[#343331] sm:text-[21px]">
                <span className="sr-only">{keterangan}</span>
                <span aria-hidden="true">
                  {reducedMotion
                    ? keterangan
                    : keterangan.split(/\s+/).map((word, index) => (
                        <m.span
                          key={`${pengurusAktif.id}-${index}`}
                          initial={{ filter: "blur(10px)", opacity: 0, y: 5 }}
                          animate={{ filter: "blur(0px)", opacity: 1, y: 0 }}
                          transition={{ duration: 0.2, ease: "easeInOut", delay: 0.02 * index }}
                          className="inline-block"
                        >
                          {word}&nbsp;
                        </m.span>
                      ))}
                </span>
              </p>
            )}
          </m.div>
        </AnimatePresence>

        <div className="flex items-center gap-3 pt-10">
          <button
            type="button"
            onClick={() => ganti(-1)}
            disabled={jumlah < 2}
            aria-label="Pengurus sebelumnya"
            className={tombolClass}
          >
            <CaretLeft aria-hidden="true" size={21} className="transition-transform duration-300 group-hover:rotate-12" />
          </button>
          <button
            type="button"
            onClick={() => ganti(1)}
            disabled={jumlah < 2}
            aria-label="Pengurus berikutnya"
            className={tombolClass}
          >
            <CaretRight aria-hidden="true" size={21} className="transition-transform duration-300 group-hover:-rotate-12" />
          </button>
          <span aria-hidden="true" className="ml-2 text-[13px] text-[#5e5e5e] tabular-nums">
            <span className="font-medium text-[#0f1012]">{String(indexAktif + 1).padStart(2, "0")}</span>
            {" / "}
            {String(jumlah).padStart(2, "0")}
          </span>
        </div>
      </div>
    </div>
  );
}
