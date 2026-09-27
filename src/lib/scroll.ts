export function scrollToSection(id: string, focusId?: string) {
  const el = document.getElementById(id);
  if (el) {
    document.getElementById(focusId ?? "")?.focus({ preventScroll: true });
    el.scrollIntoView({ behavior: "smooth" });
  } else {
    /*
     * Section-nya tidak ada di halaman aktif. Dulu di sini `window.location.hash
     * = id`, yang hanya menyetel hash di halaman SEKARANG (tidak membawa ke
     * mana-mana) sekaligus menambah entri riwayat. Sekarang diarahkan ke
     * beranda tempat section itu tinggal.
     *
     * Navigasi penuh memang disengaja: util ini fungsi biasa, bukan komponen,
     * jadi tidak punya akses `useRouter()`. Cabang ini pun jarang tersentuh —
     * Navbar (satu-satunya pemanggil rutin) hanya dirender di beranda, tempat
     * section-nya memang ada.
     *
     * `hero` tidak punya anchor tersendiri lagi: beranda cukup lewat `/`.
     */
    window.location.href = id === "hero" ? "/" : `/#${id}`;
  }
}
