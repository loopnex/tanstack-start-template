import { env } from '#/lib/env'
import { Redis } from 'ioredis'

/**
 * Redis connection for BullMQ (Producer + Worker) and any other Redis use
 * maxRetriesPerRequest: null is required by BullMQ worker's blocking commands
 */
export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
})

// Error listener — connection failures are AggregateErrors with no message
redis.on('error', (err: Error & { code?: string }) =>
  console.error('[redis]', err.message || err.code || err.name),
)
