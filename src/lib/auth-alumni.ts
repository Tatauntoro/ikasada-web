import { cookies } from "next/headers";
import { jwtVerify, SignJWT } from "jose";
import { StatusAlumniAccount } from "@/generated/prisma/enums";

/**
 * Session alumni, terpisah dari session admin (`@/lib/auth`).
 *
 * Cookie dan claim sengaja berbeda supaya kedua identitas tidak bisa saling
 * tertukar. JWT_SECRET tetap satu karena project ini monolith; pemisahnya
 * adalah claim `type` yang wajib diperiksa di setiap verifikasi alumni, dan
 * sebaliknya verifikasi admin menolak token yang tidak punya claim admin.
 */
export const ALUMNI_SESSION_COOKIE_NAME = "ikasada_alumni_session";

/** Nilai `type` yang wajib ada di setiap token alumni. */
export const ALUMNI_TOKEN_TYPE = "alumni" as const;

/**
 * Session alumni untuk **semua akun yang boleh login**.
 *
 * Master planning §6 mengizinkan akun `PENDING` login — bukan untuk memakai
 * fitur jejaring, melainkan untuk melihat status verifikasinya. Jadi `status`
 * di sini adalah status akun yang sebenarnya, dan `alumniId` hanya terisi
 * setelah pengurus mencocokkan akun dengan record `Alumni`.
 *
 * Endpoint privat (profil, koneksi) tetap wajib `ACTIVE` lewat
 * `requireAlumni()`; `requireAlumniSession()` hanya menuntut session valid.
 */
export type AlumniSessionPayload = {
  /** `AlumniAccount.id` — actor untuk audit dan pemilik data. */
  sub: string;
  /** `Alumni.id` yang sudah dicocokkan pengurus. Tidak boleh datang dari body. */
  alumniId: string | null;
  type: typeof ALUMNI_TOKEN_TYPE;
  status: StatusAlumniAccount;
};

/** Status akun yang boleh memegang session alumni. */
const STATUS_BOLEH_LOGIN: StatusAlumniAccount[] = [
  StatusAlumniAccount.PENDING,
  StatusAlumniAccount.ACTIVE,
];

function statusValid(value: unknown): value is StatusAlumniAccount {
  return (
    typeof value === "string" &&
    (Object.values(StatusAlumniAccount) as string[]).includes(value)
  );
}

export class AlumniUnauthorizedError extends Error {
  constructor(message = "Sesi alumni tidak valid. Silakan login kembali.") {
    super(message);
    this.name = "AlumniUnauthorizedError";
  }
}

/** Masa berlaku session alumni tanpa "ingat saya": 8 jam (BE-Planning §3.1). */
export const UMUR_SESSION_DETIK = 8 * 60 * 60;

/** Masa berlaku session alumni saat "ingat saya" dicentang: 30 hari. */
export const UMUR_INGAT_DETIK = 30 * 24 * 60 * 60;

/** Opsi "ingat saya" untuk penandatanganan token dan penulisan cookie. */
export type OpsiIngatSaya = { ingatSaya?: boolean };

function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET belum diatur di environment variables");
  }
  return new TextEncoder().encode(secret);
}

export async function signAlumniToken(
  payload: AlumniSessionPayload,
  opsi: OpsiIngatSaya = {}
): Promise<string> {
  const umurDetik = opsi.ingatSaya ? UMUR_INGAT_DETIK : UMUR_SESSION_DETIK;
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + umurDetik)
    .sign(getSecret());
}

/**
 * Verifikasi token alumni.
 *
 * Ketat dengan sengaja: selain tanda tangan dan masa berlaku, `type` harus
 * `"alumni"`, `sub` harus ada, dan `status` harus salah satu status yang boleh
 * login. Token admin — yang tidak punya `type` — karena itu ditolak di sini.
 */
export async function verifyAlumniToken(
  token: string
): Promise<AlumniSessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret(), {
      algorithms: ["HS256"],
    });

    if (
      payload.type !== ALUMNI_TOKEN_TYPE ||
      typeof payload.sub !== "string" ||
      payload.sub.length === 0 ||
      !statusValid(payload.status) ||
      !STATUS_BOLEH_LOGIN.includes(payload.status)
    ) {
      return null;
    }

    /*
     * `alumniId` wajib ada tepat saat `ACTIVE`, dan wajib kosong saat masih
     * `PENDING` — akun pending belum dicocokkan pengurus, jadi tokennya tidak
     * boleh membawa id alumni mana pun.
     */
    const alumniId = payload.alumniId;
    const alumniIdValid =
      payload.status === StatusAlumniAccount.ACTIVE
        ? typeof alumniId === "string" && alumniId.length > 0
        : alumniId === null || alumniId === undefined || alumniId === "";

    if (!alumniIdValid) {
      return null;
    }

    return {
      sub: payload.sub,
      alumniId:
        payload.status === StatusAlumniAccount.ACTIVE
          ? (alumniId as string)
          : null,
      type: ALUMNI_TOKEN_TYPE,
      status: payload.status,
    };
  } catch {
    return null;
  }
}

/**
 * Opsi cookie alumni. Dipisah dari penulisannya supaya kontraknya (nama, flag
 * keamanan, masa berlaku) bisa diperiksa tanpa perlu request context.
 *
 * Tanpa `maxAge`, cookie berlaku sebagai **session cookie**: hilang begitu
 * browser ditutup. "Ingat saya" menaikkannya menjadi cookie persistent 30 hari.
 */
export function alumniCookieOptions(ingatSaya = false) {
  return {
    httpOnly: true as const,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/" as const,
    ...(ingatSaya ? { maxAge: UMUR_INGAT_DETIK } : {}),
  };
}

export async function setAlumniSessionCookie(
  token: string,
  ingatSaya = false
): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(
    ALUMNI_SESSION_COOKIE_NAME,
    token,
    alumniCookieOptions(ingatSaya)
  );
}

/** Logout alumni: cookie dikosongkan dengan opsi yang sama agar pasti terhapus. */
export async function clearAlumniSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(ALUMNI_SESSION_COOKIE_NAME, "", {
    ...alumniCookieOptions(),
    maxAge: 0,
  });
}

export async function getAlumniSession(): Promise<AlumniSessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ALUMNI_SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyAlumniToken(token);
}

/** Session alumni valid, apa pun statusnya. Dipakai endpoint status akun (`/me`). */
export async function requireAlumniSession(): Promise<AlumniSessionPayload> {
  const session = await getAlumniSession();
  if (!session) {
    throw new AlumniUnauthorizedError();
  }
  return session;
}
