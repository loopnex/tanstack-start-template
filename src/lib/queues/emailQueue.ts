import { redis } from '#/lib/redis'
import { Queue } from 'bullmq'

export const EMAIL_QUEUE = 'email'
export const emailQueue = new Queue(EMAIL_QUEUE, {
  connection: redis,
  defaultJobOptions: {
    attempts: 3, // initial try + 2 retries
    backoff: { type: 'exponential', delay: 10000 }, // retries at 10s, 20s
    removeOnComplete: { age: 86_400, count: 500 }, // keep 1 day / last 500
    removeOnFail: { age: 3 * 24 * 3600 }, // keep failures 3 days for inspection
  },
})
