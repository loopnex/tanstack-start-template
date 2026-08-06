import { env } from '#/lib/env'
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

const BUCKET = env.S3_BUCKET
const SIGN_EXPIRES = 60 * 60 // presigned URLs valid for 1 hour

/**
 * Public URL for a stored key. Dev serves straight from S3, production
 * streams through /files.
 */
export function objectPublicUrl(key: string) {
  // Externally hosted media store an absolute URL as their key
  if (/^https?:\/\//.test(key)) return key
  if (env.NODE_ENV !== 'production') {
    const endpoint = env.S3_ENDPOINT?.replace(/\/+$/, '')
    if (endpoint) return `${endpoint}/${BUCKET}/${key}`
    return `https://${BUCKET}.s3.${env.S3_REGION}.amazonaws.com/${key}`
  }
  return `${env.BETTER_AUTH_URL.replace(/\/+$/, '')}/files/${key}`
}

/**
 * Lazy, memoized client, so bad S3 config only errors when storage is used.
 * endpoint and forcePathStyle stay unset for AWS.
 */
let client: S3Client | undefined
function s3() {
  client ??= new S3Client({
    region: env.S3_REGION,
    endpoint: env.S3_ENDPOINT || undefined,
    forcePathStyle: env.S3_FORCE_PATH_STYLE,
    credentials: {
      accessKeyId: env.S3_ACCESS_KEY_ID,
      secretAccessKey: env.S3_SECRET_ACCESS_KEY,
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
  if (!out.UploadId) throw new Error('S3 did not return an upload id')
  return { key, uploadId: out.UploadId }
}

// Presigned PUT URLs for parts, signed on demand so expiry starts at upload time.
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

// Fetch an object to stream back to the browser (used by the /files route).
export function getObject(key: string) {
  return s3().send(new GetObjectCommand({ Bucket: BUCKET, Key: key }))
}

// Remove an object.
export async function deleteObject(key: string) {
  await s3().send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }))
}
