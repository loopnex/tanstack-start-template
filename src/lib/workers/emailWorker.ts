import { sendPasswordResetEmail, sendWelcomeEmail } from '#/lib/mailer'
import { EMAIL_QUEUE } from '#/lib/queues/emailQueue'
import { redis } from '#/lib/redis'
import { Worker } from 'bullmq'

const worker = new Worker(
  EMAIL_QUEUE,
  async (job) => {
    switch (job.name) {
      case 'welcome':
        return sendWelcomeEmail(job.data.to, job.data.name)
      case 'password-reset':
        return sendPasswordResetEmail(job.data.to, job.data.url)
      default:
        throw new Error(`Unknown email job: ${job.name}`)
    }
  },
  { connection: redis, concurrency: 5 }, // Concurrency matches the nodemailer pool's maxConnections.
)

worker.on('ready', () => console.log('[email] worker ready'))
worker.on('error', (err) => console.error('[email]', err))
worker.on('failed', (job, err) =>
  console.error(`[email] ${job?.name} (job id#${job?.id}) failed:`, err),
)

export default worker
