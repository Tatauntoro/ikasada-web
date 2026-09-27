import { AksiAudit, Prisma } from "@/generated/prisma/client";

type FieldChange = {
  dari: Prisma.InputJsonValue | null;
  ke: Prisma.InputJsonValue | null;
};

export type DetailPerubahan = Record<string, FieldChange>;

/*
 * Actor audit: tepat satu dari `adminId` atau `alumniAccountId`.
 *
 * Aksi alumni tidak boleh memalsukan `adminId` (BE-Planning §2.5), jadi
 * pemanggil wajib memilih salah satu. Baris audit admin lama tetap punya
 * `adminId`, jadi tipe ini backward-compatible.
 */
export type AuditActor =
  | { adminId: string; alumniAccountId?: never }
  | { alumniAccountId: string; adminId?: never };

export type AuditPayload = AuditActor & {
  aksi: AksiAudit;
  entitas: string;
  entitasId: string;
  detailPerubahan?: DetailPerubahan | null;
};

function toJsonValue(value: unknown): Prisma.InputJsonValue | null {
  if (value === undefined) return null;
  if (value === null) return null;
  if (value instanceof Date) return value.toISOString();
  return value as Prisma.InputJsonValue;
}

function isEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;

  if (a instanceof Date && b instanceof Date) {
    return a.getTime() === b.getTime();
  }

  if (
    typeof a === "object" &&
    a !== null &&
    typeof b === "object" &&
    b !== null
  ) {
    return JSON.stringify(a) === JSON.stringify(b);
  }

  return false;
}

export function diffPerubahan<T extends Record<string, unknown>>(
  dataLama: T,
  dataBaru: T
): DetailPerubahan {
  const perubahan: DetailPerubahan = {};

  const semuaKey = new Set([
    ...Object.keys(dataLama),
    ...Object.keys(dataBaru),
  ]);

  for (const key of semuaKey) {
    const nilaiLama = dataLama[key];
    const nilaiBaru = dataBaru[key];

    if (!isEqual(nilaiLama, nilaiBaru)) {
      perubahan[key] = {
        dari: toJsonValue(nilaiLama),
        ke: toJsonValue(nilaiBaru),
      };
    }
  }

  return perubahan;
}

export async function catatAudit(
  tx: Prisma.TransactionClient,
  payload: AuditPayload
): Promise<void> {
  const data: Parameters<typeof tx.auditLog.create>[0]["data"] = {
    adminId: payload.adminId ?? null,
    alumniAccountId: payload.alumniAccountId ?? null,
    aksi: payload.aksi,
    entitas: payload.entitas,
    entitasId: payload.entitasId,
  };

  if (payload.detailPerubahan !== undefined && payload.detailPerubahan !== null) {
    data.detailPerubahan = payload.detailPerubahan as Prisma.InputJsonObject;
  }

  await tx.auditLog.create({ data });
}
