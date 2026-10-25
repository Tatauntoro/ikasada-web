import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/**
 * Klien object storage Cloudflare R2 (API-nya kompatibel S3). Dipakai untuk
 * semua berkas upload: gambar sampul, media galeri arsip, dokumen arsip.
 *
 * Bucket-nya SENGAJA tidak perlu akses publik: satu-satunya jalan baca adalah
 * lewat server ini (route API kita) memakai kredensial API, jadi bucket boleh
 * privat sepenuhnya — sama seperti pola "authenticated" yang sebelumnya
 * dipakai Cloudinary untuk media/berkas arsip.
 */

let client: S3Client | null = null;

/** Semua variabel R2 terisi? Dipakai juga oleh preflight boot (`scripts/preflight.mjs`). */
export function isR2Configured(): boolean {
  return !!(
    process.env.R2_ACCOUNT_ID &&
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY &&
    process.env.R2_BUCKET_NAME
  );
}

function getClient(): S3Client {
  if (client) return client;

  client = new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });

  return client;
}

function bucketName(): string {
  const bucket = process.env.R2_BUCKET_NAME;
  if (!bucket) throw new Error("R2_BUCKET_NAME belum diisi");
  return bucket;
}

export async function unggahKeR2(
  key: string,
  buffer: Buffer,
  contentType: string
): Promise<void> {
  await getClient().send(
    new PutObjectCommand({
      Bucket: bucketName(),
      Key: key,
      Body: buffer,
      ContentType: contentType,
    })
  );
}

export async function urlUnggahBertandaTanganR2(
  key: string,
  contentType: string
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: bucketName(),
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(getClient(), command, { expiresIn: 300 });
}

export async function infoObjekR2(
  key: string
): Promise<{ ukuran: number; contentType: string | null } | null> {
  try {
    const hasil = await getClient().send(
      new HeadObjectCommand({ Bucket: bucketName(), Key: key })
    );
    return {
      ukuran: hasil.ContentLength ?? 0,
      contentType: hasil.ContentType ?? null,
    };
  } catch (error) {
    const kode =
      (error as { name?: string } | null)?.name ??
      (error as { Code?: string } | null)?.Code;
    if (kode === "NoSuchKey" || kode === "NotFound") return null;
    throw error;
  }
}

export async function bacaObjekR2(
  key: string,
  range?: string
): Promise<{
  stream: ReadableStream<Uint8Array> | null;
  ukuran: number;
  contentType: string | null;
  contentRange: string | null;
} | null> {
  try {
    const hasil = await getClient().send(
      new GetObjectCommand({
        Bucket: bucketName(),
        Key: key,
        ...(range ? { Range: range } : {}),
      })
    );
    return {
      stream: hasil.Body?.transformToWebStream() ?? null,
      ukuran: hasil.ContentLength ?? 0,
      contentType: hasil.ContentType ?? null,
      contentRange: hasil.ContentRange ?? null,
    };
  } catch (error) {
    const kode =
      (error as { name?: string } | null)?.name ??
      (error as { Code?: string } | null)?.Code;
    if (kode === "NoSuchKey" || kode === "NotFound") return null;
    throw error;
  }
}

/**
 * `null` kalau objeknya tidak ada di bucket — pemanggil menerjemahkannya jadi
 * 404, bukan 500 (bukan salah permintaan, tapi admin perlu tahu berkasnya
 * harus diunggah ulang).
 */
export async function bacaDariR2(key: string): Promise<Buffer | null> {
  try {
    const hasil = await getClient().send(
      new GetObjectCommand({ Bucket: bucketName(), Key: key })
    );
    const bytes = await hasil.Body?.transformToByteArray();
    return bytes ? Buffer.from(bytes) : null;
  } catch (error) {
    const kode =
      (error as { name?: string } | null)?.name ??
      (error as { Code?: string } | null)?.Code;
    if (kode === "NoSuchKey" || kode === "NotFound") return null;
    throw error;
  }
}

/**
 * Cek keberadaan objek tanpa mengunduh isinya (`HeadObject`). Dipakai skrip
 * backfill/verifikasi untuk menetapkan backend berkas lama tanpa menarik
 * seluruh byte-nya.
 */
export async function adaDiR2(key: string): Promise<boolean> {
  try {
    await getClient().send(
      new HeadObjectCommand({ Bucket: bucketName(), Key: key })
    );
    return true;
  } catch (error) {
    const kode =
      (error as { name?: string } | null)?.name ??
      (error as { Code?: string } | null)?.Code;
    if (kode === "NotFound" || kode === "NoSuchKey") return false;
    throw error;
  }
}

export async function hapusDariR2(key: string): Promise<void> {
  await getClient().send(
    new DeleteObjectCommand({ Bucket: bucketName(), Key: key })
  );
}
