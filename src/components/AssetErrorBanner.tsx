"use client";

import { useEffect, useState } from "react";
import { WarningCircle, X } from "@phosphor-icons/react";
import {
  ASSET_ERROR_EVENT,
  reportAssetError,
  type AssetFailure,
} from "@/lib/asset-error";

const RESOURCE_TAGS = new Set(["IMG", "VIDEO", "SOURCE", "SCRIPT", "LINK"]);

export default function AssetErrorBanner() {
  const [failures, setFailures] = useState<AssetFailure[]>([]);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const onError = (event: Event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      if (!RESOURCE_TAGS.has(target.tagName)) return;
      const el = target as HTMLElement & {
        currentSrc?: string;
        src?: string;
        href?: string;
      };
      const url = el.currentSrc || el.src || el.href || "";
      reportAssetError(url, target.tagName.toLowerCase());
    };

    const onReport = (event: Event) => {
      const detail = (event as CustomEvent<AssetFailure>).detail;
      if (!detail?.url) return;
      setFailures((prev) =>
        prev.some((f) => f.url === detail.url) ? prev : [...prev, detail]
      );
    };

    window.addEventListener("error", onError, true);
    window.addEventListener(ASSET_ERROR_EVENT, onReport);
    return () => {
      window.removeEventListener("error", onError, true);
      window.removeEventListener(ASSET_ERROR_EVENT, onReport);
    };
  }, []);

  if (dismissed || failures.length === 0) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-[90] sm:left-auto sm:right-5 sm:max-w-[360px]">
      <div className="flex items-start gap-3 rounded-[14px] border border-black/20 bg-[#fdfdfd] px-4 py-3">
        <WarningCircle
          weight="bold"
          className="mt-0.5 flex-none text-lg text-neutral-600"
        />
        <div className="flex min-w-0 flex-col gap-1 text-[12.5px] leading-[1.5] text-black/80">
          <span className="font-normal text-[#0f1012]">
            {failures.length} aset gagal dimuat
          </span>
          <span className="truncate text-black/60" title={failures[0].url}>
            {failures[0].url}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Tutup notifikasi"
          className="ml-auto flex-none text-black/45 transition-colors hover:text-black"
        >
          <X weight="bold" />
        </button>
      </div>
    </div>
  );
}
