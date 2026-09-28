import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";

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

export async function hapusDariR2(key: string): Promise<void> {
  await getClient().send(
    new DeleteObjectCommand({ Bucket: bucketName(), Key: key })
  );
}
