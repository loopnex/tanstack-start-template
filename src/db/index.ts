import * as schema from '#/db/schema'
import { drizzle } from 'drizzle-orm/libsql'

import { env } from '#/env.ts'

export const db = drizzle({
  connection: {
    url: env.TURSO_DATABASE_URL,
    authToken: env.TURSO_AUTH_TOKEN,
  },
  schema,
})
