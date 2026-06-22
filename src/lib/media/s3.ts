import {
  AbortMultipartUploadCommand,
  CompleteMultipartUploadCommand,
  CreateMultipartUploadCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
  UploadPartCommand,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const BUCKET = process.env.S3_BUCKET!
const SIGN_EXPIRES = 60 * 60 // presigned URLs valid for 1 hour

/*
Lazily-built, memoized client so importing this module is side-effect-free — a
missing/invalid S3 config only errors when storage is actually used, not when an
unrelated route imports a helper from here. `endpoint` + `forcePathStyle` let
this target any S3-compatible provider (R2, MinIO, Backblaze, DO Spaces); leave
them unset for AWS S3.
 */
let client: S3Client | undefined
function s3() {
  client ??= new S3Client({
    // 'auto' is the convention for S3-compatible providers (R2 etc.); set a real
    // region (e.g. us-east-1) for AWS. The SDK throws at construction if unset.
    region: process.env.S3_REGION || 'auto',
    endpoint: process.env.S3_ENDPOINT || undefined,
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID!,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
    },
  })
  return client
}

export interface UploadedPart {
  partNumber: number
  etag: string
}

export interface SignedPart {
  partNumber: number
  url: string
}

// Presigned PUT for a small single-shot upload — the browser PUTs the file here.
export function signPut(key: string, contentType: string) {
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: contentType,
  })
  return getSignedUrl(s3(), command, { expiresIn: SIGN_EXPIRES })
}

// Begin a multipart upload; returns the id used by every subsequent part.
export async function createMultipartUpload(key: string, contentType: string) {
  const out = await s3().send(
    new CreateMultipartUploadCommand({
      Bucket: BUCKET,
      Key: key,
      ContentType: contentType,
    }),
  )
  return { key, uploadId: out.UploadId! }
}

/*
Presigned PUT URLs for the given parts — signed on demand so each URL's expiry starts when the client is about to upload it, not at the start of the upload.
*/
export function signParts(
  key: string,
  uploadId: string,
  partNumbers: number[],
): Promise<SignedPart[]> {
  return Promise.all(
    partNumbers.map(async (partNumber) => {
      const command = new UploadPartCommand({
        Bucket: BUCKET,
        Key: key,
        UploadId: uploadId,
        PartNumber: partNumber,
      })
      return {
        partNumber,
        url: await getSignedUrl(s3(), command, { expiresIn: SIGN_EXPIRES }),
      }
    }),
  )
}

// Assemble the uploaded parts into the final object.
export async function completeMultipartUpload(
  key: string,
  uploadId: string,
  parts: UploadedPart[],
) {
  await s3().send(
    new CompleteMultipartUploadCommand({
      Bucket: BUCKET,
      Key: key,
      UploadId: uploadId,
      MultipartUpload: {
        Parts: parts.map((p) => ({ PartNumber: p.partNumber, ETag: p.etag })),
      },
    }),
  )
}

// Discard an in-progress multipart upload and its parts.
export async function abortMultipartUpload(key: string, uploadId: string) {
  await s3().send(
    new AbortMultipartUploadCommand({
      Bucket: BUCKET,
      Key: key,
      UploadId: uploadId,
    }),
  )
}

// Authoritative size/content-type straight from storage (don't trust the client).
export async function headObject(key: string) {
  const out = await s3().send(
    new HeadObjectCommand({ Bucket: BUCKET, Key: key }),
  )
  return {
    size: out.ContentLength ?? 0,
    contentType: out.ContentType || 'application/octet-stream',
  }
}

// Fetch an object for serving; returns the raw command output (Body + metadata).
export function getObject(key: string) {
  return s3().send(new GetObjectCommand({ Bucket: BUCKET, Key: key }))
}

// Remove an object.
export async function deleteObject(key: string) {
  await s3().send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }))
}
