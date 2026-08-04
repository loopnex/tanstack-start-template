import {
  Body,
  Button,
  Container,
  Font,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from 'react-email'
import { BRAND_NAME } from '../config'

interface PasswordResetEmailProps {
  resetUrl: string
}

const PasswordResetEmailTemplate = ({ resetUrl }: PasswordResetEmailProps) => {
  return (
    <Html lang="en" dir="ltr">
      <Head>
        <Font
          fontFamily="Inter"
          fallbackFontFamily="sans-serif"
          webFont={{
            url: 'https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuI6fAZ9hiJ-Ek-_EeA.woff2',
            format: 'woff2',
          }}
          fontWeight={400}
          fontStyle="normal"
        />
      </Head>
      <Preview>Reset your {BRAND_NAME} password</Preview>
      <Body
        style={{
          backgroundColor: '#f5f5f5',
          margin: 0,
          padding: 0,
          fontFamily: 'Inter, sans-serif',
        }}
      >
        <Container
          style={{ maxWidth: '520px', margin: '48px auto', padding: '0 16px' }}
        >
          {/* Header */}
          <Section
            style={{
              backgroundColor: '#171717',
              padding: '12px 40px',
              textAlign: 'center',
            }}
          >
            <Text
              style={{
                margin: 0,
                color: '#f5f5f5',
                fontSize: '12px',
                fontWeight: 600,
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
              }}
            >
              {BRAND_NAME}
            </Text>
          </Section>

          {/* Body */}
          <Section
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #e5e5e5',
              borderTop: 'none',
              padding: '32px 40px',
              textAlign: 'center',
            }}
          >
            <Heading
              style={{
                margin: '0 0 12px',
                fontSize: '20px',
                fontWeight: 600,
                color: '#171717',
              }}
            >
              Reset your password
            </Heading>
            <Text
              style={{
                margin: '0 0 24px',
                fontSize: '14px',
                lineHeight: '22px',
                color: '#636363',
              }}
            >
              We received a request to reset your {BRAND_NAME} password. Click
              the button below to choose a new password. This link expires in 1
              hour.
            </Text>

            <Button
              href={resetUrl}
              style={{
                backgroundColor: '#171717',
                borderRadius: '6px',
                color: '#ffffff',
                fontSize: '14px',
                fontWeight: 600,
                padding: '12px 28px',
                textDecoration: 'none',
              }}
            >
              Reset Password
            </Button>

            <Hr
              style={{ borderTop: '1px solid #e5e5e5', margin: '24px 0 16px' }}
            />

            <Text
              style={{
                margin: 0,
                fontSize: '11px',
                lineHeight: '18px',
                color: '#a3a3a3',
              }}
            >
              If you did not request a password reset, you can safely ignore
              this email.
            </Text>
          </Section>

          {/* Footer */}
          <Section
            style={{
              backgroundColor: '#f5f5f5',
              border: '1px solid #e5e5e5',
              borderTop: 'none',
              padding: '12px 40px',
              textAlign: 'center',
            }}
          >
            <Text style={{ margin: 0, fontSize: '11px', color: '#a3a3a3' }}>
              {new Date().getFullYear()} {BRAND_NAME}. All rights reserved.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

export default PasswordResetEmailTemplate
