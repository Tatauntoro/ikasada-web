"use client";

import { useMemo } from "react";
import { KOTA_ASAL } from "@/data/kota-alumni";
import benuaData from "@/data/benua.json";
import { WorldMap, type BusurPeta } from "./WorldMap";

const BENUA = benuaData.benua as {
  id: string;
  nama: string;
  lat: number;
  lng: number;
}[];

const LABEL_ASAL = "Indonesia";

export type TitikPetaSebaran = { nama: string; lat: number; lng: number };

/** Menampilkan peta dan busur dari titik asal ke wilayah yang dikelola admin. */
export default function WorldSebaranMap({
  titik,
  asal,
}: {
  titik?: TitikPetaSebaran[];
  asal?: TitikPetaSebaran | null;
}) {
  const asalLat = asal?.lat ?? KOTA_ASAL.lat;
  const asalLng = asal?.lng ?? KOTA_ASAL.lng;
  const asalLabel = asal?.nama?.trim() || LABEL_ASAL;

  const daftarWilayah = useMemo(
    () =>
      titik && titik.length > 0
        ? titik
        : BENUA.map(({ id, nama, lat, lng }) => ({ id, nama, lat, lng })),
    [titik]
  );

  const busur = useMemo<BusurPeta[]>(
    () =>
      daftarWilayah.map((wilayah, index) => ({
        start: {
          lat: asalLat,
          lng: asalLng,
          label: index === 0 ? asalLabel : undefined,
        },
        end: {
          lat: wilayah.lat,
          lng: wilayah.lng,
          label: wilayah.nama,
        },
      })),
    [daftarWilayah, asalLat, asalLng, asalLabel]
  );

  return (
    <WorldMap
      dots={busur}
      dotColor="#0071e3"
      originColor="#28a745"
      className="world-map-frame"
      showLabels
    />
  );
}
