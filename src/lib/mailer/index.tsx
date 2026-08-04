import { render, toPlainText } from 'react-email'
import { BRAND_NAME, sendEmail } from './config'
import PasswordResetEmailTemplate from './templates/password-reset'
import WelcomeEmailTemplate from './templates/welcome'

// Send welcome email on account creation
export async function sendWelcomeEmail(to: string, name: string) {
  const html = await render(<WelcomeEmailTemplate name={name} />)
  const text = toPlainText(html)
  return sendEmail({
    to,
    subject: `Welcome to ${BRAND_NAME}`,
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
    subject: `Reset your ${BRAND_NAME} password`,
    html,
    text,
  })
}
