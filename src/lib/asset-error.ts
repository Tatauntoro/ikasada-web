export const ASSET_ERROR_EVENT = "ikasada:asset-error";

export type AssetFailure = {
  url: string;
  kind: string;
};

const reported = new Set<string>();

export function reportAssetError(url: string, kind = "resource"): void {
  if (typeof window === "undefined") return;
  if (!url || reported.has(url)) return;
  reported.add(url);
  window.dispatchEvent(
    new CustomEvent<AssetFailure>(ASSET_ERROR_EVENT, {
      detail: { url, kind },
    })
  );
}
