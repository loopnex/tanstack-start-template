import { sendEmail } from '#/lib/cloudflare/email'
import { render, toPlainText } from 'react-email'
import PasswordResetEmailTemplate from './templates/password-reset'
import WelcomeEmailTemplate from './templates/welcome'

// Send welcome email on account creation
export async function sendWelcomeEmail(to: string, name: string) {
  const html = await render(<WelcomeEmailTemplate name={name} />)
  const text = toPlainText(html)
  return sendEmail({
    to,
    subject: 'Welcome to Loopnex',
    html,
    text,
  })
}

// Send password reset email
export async function sendPasswordResetEmail(to: string, resetUrl: string) {
  const html = await render(<PasswordResetEmailTemplate resetUrl={resetUrl} />)
  const text = toPlainText(html)
  return sendEmail({
    to,
    subject: 'Reset your Loopnex password',
    html,
    text,
  })
}
