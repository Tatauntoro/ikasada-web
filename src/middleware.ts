import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { SESSION_COOKIE_NAME, SessionPayload } from "@/lib/auth";
import { unauthorized, serverError } from "@/lib/response";

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};

function getJwtSecret(): Uint8Array | null {
  const secret = process.env.JWT_SECRET;
  if (!secret) return null;
  return new TextEncoder().encode(secret);
}

/*
 * Salinan pengecekan `verifyToken` dari `@/lib/auth` — middleware berjalan di
 * edge runtime dan sengaja tidak mengimpor modul itu karena ia memakai
 * `next/headers`. Bentuk claim tetap harus diperiksa sama ketatnya: token
 * alumni memakai JWT_SECRET yang sama dan tidak punya `nama`/`email`, jadi
 * tanpa pemeriksaan ini ia lolos sebagai session admin di `/api/admin/*`.
 */
async function verifySessionToken(
  token: string,
  secret: Uint8Array
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify<SessionPayload>(token, secret, {
      algorithms: ["HS256"],
    });

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

function isLoginPage(pathname: string): boolean {
  return pathname === "/admin/login" || pathname.startsWith("/admin/login/");
}

function isApiRoute(pathname: string): boolean {
  return pathname.startsWith("/api/admin/");
}

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;

  // Izinkan akses halaman login agar tidak redirect loop
  if (isLoginPage(pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return handleUnauthorized(request);
  }

  const secret = getJwtSecret();
  if (!secret) {
    return handleServerError();
  }

  const session = await verifySessionToken(token, secret);

  if (!session) {
    return handleUnauthorized(request);
  }

  // Opsional: bawa info session ke request header untuk downstream
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-admin-id", session.sub);
  requestHeaders.set("x-admin-email", session.email);
  requestHeaders.set("x-admin-nama", session.nama);
  /*
   * Pathname diteruskan supaya `(admin)/layout.tsx` bisa menegakkan izin
   * per-modul dari satu titik (server component tidak punya akses langsung ke
   * URL request).
   */
  requestHeaders.set("x-pathname", pathname);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

function handleUnauthorized(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;

  if (isApiRoute(pathname)) {
    return unauthorized();
  }

  const loginUrl = new URL("/admin/login", request.url);
  loginUrl.searchParams.set("redirect", pathname);
  return NextResponse.redirect(loginUrl);
}

function handleServerError(): NextResponse {
  return serverError("Konfigurasi autentikasi tidak lengkap");
}
