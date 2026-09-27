import { NextResponse } from "next/server";
import { ZodError } from "zod";

export type ErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "TOO_MANY_REQUESTS"
  | "INTERNAL_ERROR";

export type ApiError = {
  code: ErrorCode;
  message: string;
  fields?: Record<string, string>;
};

export type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: ApiError };

export type PaginatedResponse<T> = {
  success: true;
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  } & Record<string, unknown>;
};

export type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export function ok<T>(data: T): NextResponse<ApiResponse<T>> {
  return NextResponse.json({ success: true, data }, { status: 200 });
}

export function created<T>(data: T): NextResponse<ApiResponse<T>> {
  return NextResponse.json({ success: true, data }, { status: 201 });
}

/**
 * Response list standar.
 *
 * `tambahan` adalah kanal resmi untuk metadata yang hanya dimiliki sebagian
 * endpoint list — misalnya jumlah permintaan belum dibaca di daftar koneksi
 * (Task 21). Bentuk amplopnya tidak berubah: `meta` tetap `meta`.
 */
export function okPaginated<T>(
  data: T[],
  meta: Omit<PaginationMeta, "totalPages">,
  tambahan: Record<string, unknown> = {}
): NextResponse<PaginatedResponse<T>> {
  const totalPages = Math.ceil(meta.total / meta.limit);
  return NextResponse.json(
    {
      success: true,
      data,
      meta: { ...meta, totalPages, ...tambahan },
    },
    { status: 200 }
  );
}

export function fail(
  code: ErrorCode,
  message: string,
  status: number,
  fields?: Record<string, string>
): NextResponse<ApiResponse<never>> {
  const error: ApiError = { code, message };
  if (fields && Object.keys(fields).length > 0) {
    error.fields = fields;
  }
  return NextResponse.json({ success: false, error }, { status });
}

export function badRequest(
  message = "Permintaan tidak valid",
  fields?: Record<string, string>
): NextResponse<ApiResponse<never>> {
  return fail("VALIDATION_ERROR", message, 400, fields);
}

export function unauthorized(
  message = "Akses ditolak. Silakan login terlebih dahulu."
): NextResponse<ApiResponse<never>> {
  return fail("UNAUTHORIZED", message, 401);
}

export function notFound(
  message = "Data tidak ditemukan"
): NextResponse<ApiResponse<never>> {
  return fail("NOT_FOUND", message, 404);
}

/**
 * Dipakai penjaga asal permintaan (BE-Planning §7) dan untuk penolakan yang
 * bukan soal identitas: permintaan boleh jadi sudah terautentikasi, tetapi
 * tetap tidak boleh dijalankan dari situs lain.
 */
export function forbidden(
  message = "Permintaan ini tidak diizinkan"
): NextResponse<ApiResponse<never>> {
  return fail("FORBIDDEN", message, 403);
}

export function conflict(
  message = "Data sudah ada",
  fields?: Record<string, string>
): NextResponse<ApiResponse<never>> {
  return fail("CONFLICT", message, 409, fields);
}

export function tooManyRequests(
  message = "Terlalu banyak percobaan. Silakan coba lagi nanti."
): NextResponse<ApiResponse<never>> {
  return fail("TOO_MANY_REQUESTS", message, 429);
}

export function serverError(
  message = "Terjadi kesalahan pada server"
): NextResponse<ApiResponse<never>> {
  return fail("INTERNAL_ERROR", message, 500);
}

export function validationError(
  zodError: ZodError
): NextResponse<ApiResponse<never>> {
  const fields: Record<string, string> = {};

  for (const issue of zodError.issues) {
    const path = issue.path.length > 0 ? issue.path.join(".") : "root";
    // Hanya simpan pesan pertama untuk setiap path agar tidak menimpa.
    if (!fields[path]) {
      fields[path] = issue.message;
    }
  }

  return fail("VALIDATION_ERROR", "Data tidak valid", 400, fields);
}
