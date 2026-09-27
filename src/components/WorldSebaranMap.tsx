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

/**
 * Peta sebaran alumni.
 *
 * Copy section ada di kiri; di kanan `WorldMap` menggambar peta dunia bertitik
 * dengan busur yang mengalir dari Indonesia ke tiap benua. Peta memakai latar
 * yang sama dengan band gelap section ini (`#070707`) supaya menyatu, bukan
 * muncul sebagai kotak putih di tengah bidang hitam.
 *
 * Titik asalnya selalu Depok (lihat `KOTA_ASAL`), dan label asal hanya dipasang
 * pada busur pertama — semua busur berangkat dari koordinat yang sama, jadi
 * label berulang hanya akan saling menumpuk.
 */
export default function WorldSebaranMap() {
  const dots = useMemo<BusurPeta[]>(
    () =>
      BENUA.map((benua, i) => ({
        start: {
          lat: KOTA_ASAL.lat,
          lng: KOTA_ASAL.lng,
          label: i === 0 ? LABEL_ASAL : undefined,
        },
        end: { lat: benua.lat, lng: benua.lng, label: benua.nama },
      })),
    []
  );

  return (
    <div className={styles.geo}>
      <div className={styles.geoCopy}>
        <p className={`${styles.geoKicker} section-label section-label--terang`}>
          Sebaran
        </p>
        <h3 className={`${styles.geoTitle} section-title section-title--terang`}>
          geografis
        </h3>
        <p className={styles.geoDescription}>
          Jejaring alumni Sastra Daerah yang tumbuh dari Indonesia hingga lintas
          benua—saling terhubung oleh pengalaman, pengetahuan, dan ikatan yang
          sama.
        </p>
      </div>

      <WorldMap dots={dots} lineColor="#8abaff" />
    </div>
  );
}
