import { NextRequest } from "next/server";
import { badRequest, forbidden, serverError, unauthorized } from "./response";
import { ForbiddenError, UnauthorizedError } from "./auth";
import { AlumniUnauthorizedError } from "./auth-alumni";
import { catatRequestId, logPeristiwa } from "./log";

export type RouteContext<
  TParams extends Record<string, string> = Record<string, never>,
> = {
  params: Promise<TParams>;
};

export type RouteHandler<
  TParams extends Record<string, string> = Record<string, never>,
> = (req: NextRequest, ctx: RouteContext<TParams>) => Promise<Response> | Response;

export class BadRequestError extends Error {
  fields?: Record<string, string>;

  constructor(message = "Permintaan tidak valid", fields?: Record<string, string>) {
    super(message);
    this.name = "BadRequestError";
    this.fields = fields;
  }
}

export async function readJsonBody(req: NextRequest): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    throw new BadRequestError("Body request harus berupa JSON yang valid");
  }
}

/** Metode yang mengubah data — hanya ini yang diperiksa asalnya. */
const METODE_MUTASI = new Set(["POST", "PATCH", "PUT", "DELETE"]);

/**
 * Lapisan kedua anti-CSRF: tolak mutation yang datang dari origin lain
 * (BE-Planning §7, master planning §9).
 *
 * Lapisan pertamanya adalah cookie `SameSite=lax`, yang sudah membuat browser
 * tidak mengirim cookie pada permintaan lintas situs. Pemeriksaan ini menutup
 * kasus yang tidak dijangkau SameSite — permintaan **satu situs** tetapi beda
 * origin, mis. dari subdomain lain — dan membuat aturannya eksplisit alih-alih
 * bergantung pada satu perilaku browser.
 *
 * Permintaan tanpa header `Origin` (curl, Postman, skrip verifikasi) tetap
 * diizinkan: itu bukan permintaan browser, dan memblokirnya akan memutus alur
 * pengujian manual yang dipakai project ini. `Origin: null` (iframe
 * ter-sandbox) ditolak karena tidak bisa dicocokkan dengan host mana pun.
 */
function periksaAsalPermintaan(req: NextRequest): Response | null {
  if (!METODE_MUTASI.has(req.method)) return null;

  const asal = req.headers.get("origin");
  if (!asal) return null;

  const host = req.headers.get("host");

  let cocok = false;
  try {
    cocok = host !== null && new URL(asal).host === host;
  } catch {
    // Termasuk `Origin: null` dan nilai yang bukan URL.
    cocok = false;
  }

  return cocok ? null : forbidden("Permintaan lintas situs ditolak");
}

function handleError(error: unknown): Response {
  if (error instanceof UnauthorizedError) {
    return unauthorized(error.message);
  }

  if (error instanceof ForbiddenError) {
    return forbidden(error.message);
  }

  if (error instanceof AlumniUnauthorizedError) {
    return unauthorized(error.message);
  }

  if (error instanceof BadRequestError) {
    return badRequest(error.message, error.fields);
  }

  if (error instanceof Response) {
    return error;
  }

  console.error("[API Error]", error);
  return serverError();
}

export function apiHandler<
  TParams extends Record<string, string> = Record<string, never>,
>(handler: RouteHandler<TParams>): RouteHandler<TParams> {
  return async (req, ctx) => {
    /*
     * Satu request id per permintaan (Task 22): dipakai untuk mengkorelasikan
     * baris access log dengan peristiwa lain, dan dikirim balik di header
     * `x-request-id` supaya keluhan user bisa ditelusuri ke satu baris log.
     */
    const requestId = crypto.randomUUID();
    catatRequestId(req, requestId);
    const mulai = Date.now();

    let res: Response;

    try {
      const ditolak = periksaAsalPermintaan(req);
      res = ditolak ?? (await handler(req, ctx));
    } catch (error) {
      res = handleError(error);
    }

    try {
      res.headers.set("x-request-id", requestId);
    } catch {
      // Response dari sumber lain bisa punya header yang tidak bisa diubah;
      // log tetap ditulis supaya requestnya tidak hilang dari jejak.
    }

    logPeristiwa("akses", {
      requestId,
      method: req.method,
      // Sengaja hanya path, tanpa query string: query bisa memuat nama/email.
      path: req.nextUrl.pathname,
      status: res.status,
      ms: Date.now() - mulai,
    });

    return res;
  };
}

export function apiHandlerWithoutParams(
  handler: (req: NextRequest) => Promise<Response> | Response
): (req: NextRequest) => Promise<Response> {
  const wrapped = apiHandler((req: NextRequest) => handler(req));
  return async (req) => wrapped(req, { params: Promise.resolve({}) });
}
