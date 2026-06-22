import {
  Body,
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

interface WelcomeEmailProps {
  name: string
}

const WelcomeEmailTemplate = ({ name }: WelcomeEmailProps) => {
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
      <Preview>Welcome to {BRAND_NAME}. Your account is all set.</Preview>
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
              Welcome aboard, {name}!
            </Heading>
            <Text
              style={{
                margin: '0 0 8px',
                fontSize: '14px',
                lineHeight: '22px',
                color: '#636363',
              }}
            >
              We are thrilled to have you join {BRAND_NAME}. Your account is
              fully set up and ready to go.
            </Text>
            <Text
              style={{
                margin: 0,
                fontSize: '14px',
                lineHeight: '22px',
                color: '#636363',
              }}
            >
              Start exploring everything {BRAND_NAME} has to offer and enjoy a
              seamless workflow built for you.
            </Text>

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
              If you did not create an account with {BRAND_NAME}, you can safely
              ignore this email.
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

export default WelcomeEmailTemplate
