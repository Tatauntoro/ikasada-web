/** Panel mengikuti posisi empat dokumen terbaru, bukan ID dokumen. */
export const WARNA_PANEL_ARSIP_BAWAAN = ["#f2f2f4", "#eaf4ff", "#f2f2f4", "#eaf4ff"] as const;

export function bacaWarnaPanelArsip(konfigurasi: Record<string, unknown> | null | undefined): string[] {
  const nilai = konfigurasi?.warnaPanel;
  return WARNA_PANEL_ARSIP_BAWAAN.map((_, index) =>
    Array.isArray(nilai) && typeof nilai[index] === "string" ? nilai[index] : ""
  );
}

export function tintaPanelArsip(warna: string): string {
  let hex = warna.replace(/^#/, "");
  if (hex.length === 3) hex = [...hex].map(c => c + c).join("");
  if (!/^[\da-f]{6}$/i.test(hex)) return "#0f1012";
  const rgb = [0, 2, 4].map(i => parseInt(hex.slice(i, i + 2), 16) / 255);
  const linear = (v: number) => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4;
  const luminance = rgb.reduce((total, v, i) => total + linear(v) * [.2126, .7152, .0722][i], 0);
  return luminance > .179 ? "#0f1012" : "#ffffff";
}
