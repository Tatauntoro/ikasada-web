"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { SignOut } from "@phosphor-icons/react";

/**
 * Tombol keluar dari portal admin.
 *
 * Dua varian karena tempatnya berbeda:
 * - `header` — pil ringkas di header kanan atas, di samping nama admin;
 * - `sidebar` — tombol lebar di dalam drawer mobile (di sana tidak ada header
 *   identitas, jadi tombolnya harus jelas dan mudah dijangkau).
 */
export function LogoutButton({
  variant = "sidebar",
}: {
  variant?: "sidebar" | "header";
}) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  async function handleLogout() {
    setIsLoading(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.replace("/admin/login");
    } catch {
      setIsLoading(false);
    }
  }

  const label = isLoading ? "Keluar..." : "Logout";

  if (variant === "header") {
    return (
      <button
        onClick={handleLogout}
        disabled={isLoading}
        title={label}
        className="inline-flex items-center gap-2 rounded-xl border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:opacity-70"
      >
        <SignOut weight="bold" aria-hidden="true" />
        {label}
      </button>
    );
  }

  return (
    <button
      onClick={handleLogout}
      disabled={isLoading}
      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-red-200 text-red-600 font-semibold text-sm hover:bg-red-50 transition-colors disabled:opacity-70"
    >
      <SignOut weight="bold" />
      {label}
    </button>
  );
}
