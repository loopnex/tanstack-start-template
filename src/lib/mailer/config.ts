import { env } from '#/lib/env'
import nodemailer from 'nodemailer'

export const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_PORT === 465,
  pool: true,
  maxConnections: 5, // Keep in sync with the worker's concurrency
  maxMessages: 100, // messages per socket before it reconnects
  // Omitted when unset, for unauthenticated SMTP
  auth: env.SMTP_USER
    ? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD }
    : undefined,
})

// Brand name shown across all email templates and subjects
export const BRAND_NAME = env.EMAIL_BRAND_NAME

// Email type
type SendEmailOptions = {
  to: string
  subject: string
  html: string
  text: string
}

// Email send method
export async function sendEmail({ to, subject, html, text }: SendEmailOptions) {
  return transporter.sendMail({
    from: env.EMAIL_FROM,
    to,
    subject,
    html,
    text,
  })
}
