import { cookies } from "next/headers";
import { jwtVerify, SignJWT } from "jose";

export const SESSION_COOKIE_NAME = "ikasada_session";

export type SessionPayload = {
  sub: string;
  nama: string;
  email: string;
};

/** Masa berlaku session admin saat "ingat saya" dicentang: 30 hari. */
export const UMUR_INGAT_DETIK = 30 * 24 * 60 * 60;

/** Opsi "ingat saya" untuk penandatanganan token dan penulisan cookie. */
export type OpsiIngatSaya = { ingatSaya?: boolean };

export class UnauthorizedError extends Error {
  constructor(message = "Akses ditolak. Silakan login terlebih dahulu.") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

/**
 * Sesi valid tetapi tidak berhak (role/izin tidak mencukupi, atau akun admin
 * dinonaktifkan). Dibedakan dari `UnauthorizedError` supaya response `403`
 * tidak disalahartikan sebagai "belum login".
 */
export class ForbiddenError extends Error {
  constructor(message = "Anda tidak punya akses ke tindakan ini.") {
    super(message);
    this.name = "ForbiddenError";
  }
}

function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET belum diatur di environment variables");
  }
  return new TextEncoder().encode(secret);
}

function getExpiresInSeconds(): number {
  const raw = process.env.JWT_EXPIRES_IN || "8h";
  const match = raw.match(/^(\d+)([smhd])$/i);
  if (!match) {
    return 8 * 60 * 60; // default 8 jam
  }

  const value = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();

  switch (unit) {
    case "s":
      return value;
    case "m":
      return value * 60;
    case "h":
      return value * 60 * 60;
    case "d":
      return value * 24 * 60 * 60;
    default:
      return 8 * 60 * 60;
  }
}

export async function signToken(
  payload: SessionPayload,
  opsi: OpsiIngatSaya = {}
): Promise<string> {
  const expiresIn = opsi.ingatSaya ? UMUR_INGAT_DETIK : getExpiresInSeconds();
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + expiresIn)
    .sign(getSecret());
}

export async function verifyToken(
  token: string
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify<SessionPayload>(token, getSecret(), {
      algorithms: ["HS256"],
    });

    /*
     * Token alumni (`@/lib/auth-alumni`) ditandatangani dengan JWT_SECRET yang
     * sama, jadi tanda tangan yang valid saja tidak cukup: token itu tidak
     * membawa `nama`/`email`. Tanpa pemeriksaan bentuk di sini, token alumni
     * yang dipasang pada cookie `ikasada_session` akan lolos sebagai session
     * admin. Token admin asli selalu punya ketiga claim ini (lihat login route).
     */
    if (
      typeof payload.sub !== "string" ||
      payload.sub.length === 0 ||
      typeof payload.nama !== "string" ||
      payload.nama.length === 0 ||
      typeof payload.email !== "string" ||
      payload.email.length === 0
    ) {
      return null;
    }

    return {
      sub: payload.sub,
      nama: payload.nama,
      email: payload.email,
    };
  } catch {
    return null;
  }
}

export async function setSessionCookie(
  token: string,
  ingatSaya = false
): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    // Tanpa `maxAge`, cookie jadi session cookie (hilang saat browser ditutup).
    ...(ingatSaya ? { maxAge: UMUR_INGAT_DETIK } : {}),
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function requireAdmin(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) {
    throw new UnauthorizedError();
  }
  return session;
}
