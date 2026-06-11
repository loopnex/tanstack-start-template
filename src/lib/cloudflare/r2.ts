import { env } from 'cloudflare:workers'

const bucket = () => env.STARTER_BUCKET

export interface UploadedPart {
  partNumber: number
  etag: string
}

// Stream a body straight to R2; returns the stored object's size.
export async function putObject(
  key: string,
  body: ReadableStream | ArrayBuffer,
  contentType: string,
) {
  const obj = await bucket().put(key, body, { httpMetadata: { contentType } })
  return { size: obj?.size ?? 0 }
}

// Fetch an object (with body + metadata) for serving, or null if missing.
export function getObject(key: string) {
  return bucket().get(key)
}

// Remove an object.
export async function deleteObject(key: string) {
  await bucket().delete(key)
}

// Begin a multipart upload; returns the id used by every subsequent part.
export async function createMultipartUpload(key: string, contentType: string) {
  const mpu = await bucket().createMultipartUpload(key, {
    httpMetadata: { contentType },
  })
  return { key: mpu.key, uploadId: mpu.uploadId }
}

// Upload one part (each stateless request rebuilds the handle from key+uploadId).
export async function uploadPart(
  key: string,
  uploadId: string,
  partNumber: number,
  body: ArrayBuffer,
): Promise<UploadedPart> {
  const part = await bucket()
    .resumeMultipartUpload(key, uploadId)
    .uploadPart(partNumber, body)
  return { partNumber: part.partNumber, etag: part.etag }
}

// Assemble the uploaded parts into the final object.
export async function completeMultipartUpload(
  key: string,
  uploadId: string,
  parts: UploadedPart[],
) {
  await bucket().resumeMultipartUpload(key, uploadId).complete(parts)
}

// Discard an in-progress multipart upload and its parts.
export async function abortMultipartUpload(key: string, uploadId: string) {
  await bucket().resumeMultipartUpload(key, uploadId).abort()
}
