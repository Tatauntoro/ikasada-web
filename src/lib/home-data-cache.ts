// Cache pendek untuk render ulang Beranda saat kembali dari halaman lain.
// Data tetap diperbarui pada kunjungan berikutnya setelah lima menit.
const cache = new Map<string, { value: unknown; expires: number }>();
export function bacaDataBeranda<T>(key: string): T | undefined {
  if (typeof window === "undefined") return undefined;
  const entry = cache.get(key);
  return entry && entry.expires > Date.now() ? entry.value as T : undefined;
}
export function simpanDataBeranda<T>(key: string, value: T): void {
  cache.set(key, { value, expires: Date.now() + 5 * 60_000 });
}
