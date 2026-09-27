export function normalisasiWhatsapp(input: string | null | undefined): string | null {
  if (!input) return null;

  // Hapus semua karakter selain angka
  const digits = input.replace(/\D/g, "");

  // Terima 08xxx, 628xxx, +628xxx
  let normalized = digits;
  if (normalized.startsWith("0")) {
    normalized = "62" + normalized.slice(1);
  }
  if (normalized.startsWith("8")) {
    normalized = "62" + normalized;
  }

  // Validasi panjang 9-15 digit setelah 62
  if (normalized.length < 9 || normalized.length > 15) {
    return null;
  }

  return normalized;
}

export function normalisasiInstagram(input: string | null | undefined): string | null {
  if (!input) return null;

  const trimmed = input.trim();
  if (!trimmed) return null;

  // Jika sudah URL penuh, kembalikan apa adanya
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }

  // Bersihkan @ di depan username
  const username = trimmed.replace(/^@/, "");
  return `https://instagram.com/${username}`;
}

export function normalisasiTiktok(input: string | null | undefined): string | null {
  if (!input) return null;

  const trimmed = input.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }

  const username = trimmed.replace(/^@/, "");
  if (!username) return null;

  return `https://tiktok.com/@${username}`;
}
