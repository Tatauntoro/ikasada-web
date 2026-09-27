"use client";

import { useState, FormEvent, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  LockKey,
  Envelope,
  Lock,
  ArrowRight,
  Warning,
  Eye,
  EyeSlash,
} from "@phosphor-icons/react";

function safeRedirect(target: string | null): string {
  if (!target || !target.startsWith("/") || target.startsWith("//")) {
    return "/admin";
  }
  return target;
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = safeRedirect(searchParams.get("redirect"));

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [ingatSaya, setIngatSaya] = useState(false);
  const [tampilkanSandi, setTampilkanSandi] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, ingatSaya }),
      });

      const result = await response.json();

      if (!response.ok) {
        const message =
          result?.error?.message || "Login gagal. Silakan coba lagi.";
        setError(message);
        return;
      }

      router.replace(redirect);
    } catch {
      setError("Terjadi kesalahan jaringan. Silakan coba lagi.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label
          htmlFor="email"
            className="block text-sm font-semibold text-[#0f1012] mb-2"
        >
          Email
        </label>
        <div className="relative">
          <Envelope
            weight="bold"
            className="absolute left-4 top-1/2 -translate-y-1/2 text-[#5e5e5e]"
          />
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@ikasada.id"
            className="w-full pl-11 pr-4 py-3 rounded-xl bg-[#fdfdfd] border border-black/[0.08] text-[#0f1012] placeholder:text-[#8f8f8f] focus:outline-none focus:ring-2 focus:ring-[#0071e3] focus:border-transparent transition-all"
          />
        </div>
      </div>

      <div>
        <label
          htmlFor="password"
          className="block text-sm font-semibold text-[#0f1012] mb-2"
        >
          Kata Sandi
        </label>
        <div className="relative">
          <Lock
            weight="bold"
            className="absolute left-4 top-1/2 -translate-y-1/2 text-[#5e5e5e]"
          />
          <input
            id="password"
            name="password"
            type={tampilkanSandi ? "text" : "password"}
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full pl-11 pr-12 py-3 rounded-xl bg-[#fdfdfd] border border-black/[0.08] text-[#0f1012] placeholder:text-[#8f8f8f] focus:outline-none focus:ring-2 focus:ring-[#0071e3] focus:border-transparent transition-all"
          />
          <button
            type="button"
            onClick={() => setTampilkanSandi((tampil) => !tampil)}
            aria-label={
              tampilkanSandi ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"
            }
            aria-pressed={tampilkanSandi}
            title={tampilkanSandi ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-[#5e5e5e] transition-colors hover:bg-black/5 hover:text-[#0f1012] focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-[#0071e3]"
          >
            {tampilkanSandi ? (
              <EyeSlash weight="bold" aria-hidden="true" />
            ) : (
              <Eye weight="bold" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-[#5e5e5e] cursor-pointer">
        <input
          type="checkbox"
          checked={ingatSaya}
          onChange={(e) => setIngatSaya(e.target.checked)}
          className="h-[18px] w-[18px] accent-[#0071e3]"
        />
        <span>Ingat saya selama 30 hari di perangkat ini</span>
      </label>

      {error && (
        <div className="flex items-start gap-2 rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          <Warning weight="bold" className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={isLoading}
        className="w-full py-3 px-4 rounded-xl bg-[#0071e3] hover:bg-[#005fc1] text-white font-bold disabled:opacity-70 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
      >
        {isLoading ? (
          <>
            <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Masuk...
          </>
        ) : (
          <>
            Masuk
            <ArrowRight weight="bold" />
          </>
        )}
      </button>
    </form>
  );
}

function LoginFormSkeleton() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="h-5 w-16 bg-[#f2f2f4] rounded" />
      <div className="h-12 bg-[#f2f2f4] rounded-xl" />
      <div className="h-5 w-28 bg-[#f2f2f4] rounded" />
      <div className="h-12 bg-[#f2f2f4] rounded-xl" />
      <div className="h-12 bg-[#0071e3]/20 rounded-xl" />
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center overflow-hidden bg-[#f2f2f4] px-4 py-12 text-[#0f1012]">
      <div className="w-full max-w-md">
        <div className="rounded-3xl border border-black/[0.08] bg-[#fdfdfd] p-8 sm:p-10">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-[#0071e3] text-white mx-auto flex items-center justify-center text-3xl mb-5">
              <LockKey weight="bold" />
            </div>
            <h1 className="text-3xl font-normal font-serif text-[#0f1012]">
              Portal Admin
            </h1>
            <p className="text-sm text-[#5e5e5e] mt-2">
              Masuk untuk mengelola data kegiatan dan alumni IKASADA.
            </p>
          </div>

          <Suspense fallback={<LoginFormSkeleton />}>
            <LoginForm />
          </Suspense>

        </div>

        <p className="text-center text-xs text-[#5e5e5e] mt-6">
          Portal khusus pengurus IKASADA FIB UI.
        </p>
      </div>
    </main>
  );
}
