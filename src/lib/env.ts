import * as z from 'zod'

/**
 * Server environment, validated once at startup. Server-only.
 */
const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),

  // Better Auth
  BETTER_AUTH_URL: z.url('Must be a full URL, e.g. http://localhost:3000'),
  BETTER_AUTH_SECRET: z
    .string()
    .nonempty('Generate one with: npx -y @better-auth/cli secret'),

  // Postgres
  DATABASE_URL: z.string().nonempty('DATABASE_URL is required'),

  // Redis
  REDIS_URL: z.string().default('redis://localhost:6379'),

  // Email
  EMAIL_BRAND_NAME: z.string().nonempty('EMAIL_BRAND_NAME is required'),
  EMAIL_FROM: z.string().nonempty('EMAIL_FROM is required'),
  SMTP_HOST: z.string().nonempty('SMTP_HOST is required'),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),

  // S3-compatible storage
  S3_REGION: z.string().default('auto'),
  S3_BUCKET: z.string().nonempty('S3_BUCKET is required'),
  S3_ACCESS_KEY_ID: z.string().nonempty('S3_ACCESS_KEY_ID is required'),
  S3_SECRET_ACCESS_KEY: z.string().nonempty('S3_SECRET_ACCESS_KEY is required'),
  // Unset for AWS S3, set for MinIO, Cloudflare R2, …
  S3_ENDPOINT: z.string().optional(),
  S3_FORCE_PATH_STYLE: z
    .string()
    .optional()
    .transform((v) => v === 'true'),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  const lines = parsed.error.issues.map(
    (issue) => `  ${issue.path.join('.')}: ${issue.message}`,
  )
  throw new Error(
    `Invalid environment variables:\n${lines.join('\n')}\n\nSee .env.example.`,
  )
}

export const env = parsed.data
