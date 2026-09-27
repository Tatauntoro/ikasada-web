const VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;

export function ekstrakVideoId(url: string): string | null {
  if (!url || typeof url !== "string") return null;

  try {
    const parsed = new URL(url);

    // Format: youtube.com/watch?v=VIDEO_ID
    if (
      parsed.hostname === "www.youtube.com" ||
      parsed.hostname === "youtube.com" ||
      parsed.hostname === "m.youtube.com"
    ) {
      if (parsed.pathname === "/watch") {
        const id = parsed.searchParams.get("v");
        if (id && VIDEO_ID_PATTERN.test(id)) return id;
      }

      // Format: /embed/VIDEO_ID
      const embedMatch = parsed.pathname.match(/^\/embed\/([A-Za-z0-9_-]{11})$/);
      if (embedMatch) return embedMatch[1];

      // Format: /shorts/VIDEO_ID
      const shortsMatch = parsed.pathname.match(
        /^\/shorts\/([A-Za-z0-9_-]{11})$/
      );
      if (shortsMatch) return shortsMatch[1];
    }

    // Format: youtu.be/VIDEO_ID
    if (parsed.hostname === "youtu.be") {
      const pathMatch = parsed.pathname.match(/^\/([A-Za-z0-9_-]{11})$/);
      if (pathMatch) return pathMatch[1];
    }

    return null;
  } catch {
    return null;
  }
}

export function urlEmbed(videoId: string): string {
  return `https://www.youtube.com/embed/${videoId}`;
}

export function urlEmbedNoCookie(videoId: string): string {
  return `https://www.youtube-nocookie.com/embed/${videoId}`;
}

export function urlThumbnail(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}

export function isValidYoutubeUrl(url: string): boolean {
  return ekstrakVideoId(url) !== null;
}
