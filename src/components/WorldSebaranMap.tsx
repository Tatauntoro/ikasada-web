"use client";

import { useMemo } from "react";
import { KOTA_ASAL } from "@/data/kota-alumni";
import benuaData from "@/data/benua.json";
import { WorldMap, type BusurPeta } from "./WorldMap";
import styles from "./Stats.module.css";

const BENUA = benuaData.benua as {
  id: string;
  nama: string;
  lat: number;
  lng: number;
}[];

/*
 * Label titik asal sengaja "Indonesia", bukan `KOTA_ASAL.nama` ("Depok"):
 * peta ini bercerita tentang sebaran lintas wilayah, jadi titik berangkatnya
 * dibaca sebagai negara asalnya. Koordinatnya tetap koordinat Depok.
 */
const LABEL_ASAL = "Indonesia";

export type TitikPetaSebaran = { nama: string; lat: number; lng: number };

/**
 * Peta sebaran alumni.
 *
 * Copy section ada di kiri; di kanan `WorldMap` menggambar peta dunia bertitik
 * dengan busur yang mengalir dari Indonesia ke tiap titik tujuan. Titik tujuan
 * datang dari prop `titik` (Portal Admin); bila kosong, jatuh ke daftar default
 * di `data/benua.json` supaya tampilan lama tetap utuh.
 *
 * Titik asalnya selalu Depok (lihat `KOTA_ASAL`), dan label asal hanya dipasang
 * pada busur pertama — semua busur berangkat dari koordinat yang sama, jadi
 * label berulang hanya akan saling menumpuk.
 */
export default function WorldSebaranMap({
  titik,
  asal,
  eyebrow = "Sebaran",
  judul = "geografis",
  deskripsi = "Jejaring alumni Sastra Daerah yang tumbuh dari Indonesia hingga lintas benua—saling terhubung oleh pengalaman, pengetahuan, dan ikatan yang sama.",
}: {
  titik?: TitikPetaSebaran[];
  /** Titik asal busur (almamater). Default: Depok berlabel "Indonesia". */
  asal?: TitikPetaSebaran | null;
  eyebrow?: string | null;
  judul?: string | null;
  deskripsi?: string | null;
}) {
  const asalLat = asal?.lat ?? KOTA_ASAL.lat;
  const asalLng = asal?.lng ?? KOTA_ASAL.lng;
  const asalLabel = asal?.nama?.trim() ? asal.nama.trim() : LABEL_ASAL;

  const dots = useMemo<BusurPeta[]>(() => {
    const daftar =
      titik && titik.length > 0
        ? titik
        : BENUA.map((b) => ({ nama: b.nama, lat: b.lat, lng: b.lng }));

    return daftar.map((t, i) => ({
      start: {
        lat: asalLat,
        lng: asalLng,
        label: i === 0 ? asalLabel : undefined,
      },
      end: { lat: t.lat, lng: t.lng, label: t.nama },
    }));
  }, [titik, asalLat, asalLng, asalLabel]);

  return (
    <div className={styles.geo}>
      <div className={styles.geoCopy}>
        <p className={`${styles.geoKicker} section-label section-label--terang`}>
          {eyebrow}
        </p>
        <h3 className={`${styles.geoTitle} section-title section-title--terang`}>
          {judul}
        </h3>
        <p className={styles.geoDescription}>{deskripsi}</p>
      </div>

      <WorldMap dots={dots} lineColor="#8abaff" />
    </div>
  );
}
