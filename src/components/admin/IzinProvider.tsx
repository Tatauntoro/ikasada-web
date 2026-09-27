"use client";

import { createContext, useContext, type ReactNode } from "react";
import {
  boleh as bolehIzin,
  type AksiSlug,
  type Izin,
  type ModulSlug,
} from "@/lib/permission";

/**
 * Izin efektif admin yang sedang login, dibagikan ke komponen klien.
 *
 * Dipakai untuk **menyembunyikan** menu/tombol yang tidak berhak. Ini murni UX:
 * penegakan sebenarnya ada di server (`requirePermission`) — menyembunyikan
 * tombol tidak pernah menjadi pengganti otorisasi.
 */

type NilaiIzin = {
  superadmin: boolean;
  boleh: (modul: ModulSlug, aksi: AksiSlug) => boolean;
};

const Konteks = createContext<NilaiIzin>({
  superadmin: false,
  boleh: () => false,
});

export function useIzin(): NilaiIzin {
  return useContext(Konteks);
}

export function IzinProvider({
  role,
  permissions,
  children,
}: {
  role: string;
  permissions: Izin;
  children: ReactNode;
}) {
  const superadmin = role === "SUPERADMIN";

  return (
    <Konteks.Provider
      value={{
        superadmin,
        boleh: (modul, aksi) => superadmin || bolehIzin(permissions, modul, aksi),
      }}
    >
      {children}
    </Konteks.Provider>
  );
}
