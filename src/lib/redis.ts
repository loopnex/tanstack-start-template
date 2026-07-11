import { Redis } from 'ioredis'

/**
 * Redis connection for BullMQ (Producer + Worker) and any other Redis use
 * maxRetriesPerRequest: null is required by BullMQ worker's blocking commands
 */
export const redis = new Redis(
  process.env.REDIS_URL ?? 'redis://localhost:6379',
  {
    maxRetriesPerRequest: null,
  },
)

// Error listener
redis.on('error', (err) => console.error('[redis]', err.message))
