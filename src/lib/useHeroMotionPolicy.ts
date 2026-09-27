"use client";

import { useSyncExternalStore } from "react";

type Connection = EventTarget & { saveData?: boolean };
type NavigatorHints = Navigator & { connection?: Connection; deviceMemory?: number };

function subscribe(onChange: () => void) {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  const connection = (navigator as NavigatorHints).connection;
  reduced.addEventListener("change", onChange);

  /*
   * `connection?.` hanya melindungi terhadap connection yang TIDAK ADA. Kalau
   * connection ada tapi bukan EventTarget — shim, extension privasi, atau
   * harness tes yang meniru API ini — memanggil addEventListener di sini
   * melempar TypeError di dalam useSyncExternalStore, dan itu menggagalkan
   * render SELURUH aplikasi (halaman error), bukan sekadar mematikan efeknya.
   *
   * Di browser arus utama cabang ini tidak pernah diambil: `navigator.connection`
   * adalah NetworkInformation yang turunan EventTarget, dan Safari tidak
   * menyediakannya sama sekali.
   */
  if (typeof connection?.addEventListener === "function") {
    connection.addEventListener("change", onChange);
    return () => {
      reduced.removeEventListener("change", onChange);
      connection.removeEventListener("change", onChange);
    };
  }

  return () => reduced.removeEventListener("change", onChange);
}

function getSnapshot(): "full" | "reduced" | "economy" {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return "reduced";
  const hints = navigator as NavigatorHints;
  // Conservative capability hints; browsers without them keep the normal path.
  if (
    hints.connection?.saveData ||
    (hints.deviceMemory !== undefined && hints.deviceMemory <= 4) ||
    (hints.hardwareConcurrency > 0 && hints.hardwareConcurrency <= 4)
  ) return "economy";
  return "full";
}

export function useHeroMotionPolicy() {
  return useSyncExternalStore(subscribe, getSnapshot, () => "full" as const);
}
