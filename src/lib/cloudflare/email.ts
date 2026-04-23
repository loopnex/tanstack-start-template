import { env as serverEnv } from '#/env.ts'
import { env } from 'cloudflare:workers'

// Cloudflare email sender
type SendEmailOptions = {
  to: string
  subject: string
  html: string
  text: string
}

export async function sendEmail({ to, subject, html, text }: SendEmailOptions) {
  return env.EMAIL.send({
    to,
    from: `${serverEnv.EMAIL_DISPLAY_NAME} <${serverEnv.EMAIL_FROM}>`,
    subject,
    html,
    text,
  })
}
