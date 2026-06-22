import nodemailer from 'nodemailer'

export const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT ?? 587),
  secure: process.env.SMTP_PORT === '465',
  pool: true,
  maxConnections: 5, // Keep in sync with the worker's concurrency
  maxMessages: 100, // messages per socket before it reconnects
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
})

// Brand name shown across all email templates and subjects
export const BRAND_NAME = process.env.EMAIL_BRAND_NAME!

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
    from: process.env.EMAIL_FROM,
    to,
    subject,
    html,
    text,
  })
}
