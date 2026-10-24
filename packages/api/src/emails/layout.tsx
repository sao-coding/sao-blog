import type { ReactNode } from 'react'
import { Body, Container, Head, Hr, Html, Preview, Section, Text } from '@react-email/components'

// 所有信件共用的外框：宣紙底色、朱紅細線，呼應前台的信箋風格

interface EmailLayoutProps {
  preview: string
  siteName: string
  children: ReactNode
}

export function EmailLayout({ preview, siteName, children }: EmailLayoutProps) {
  return (
    <Html lang="zh-Hant">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={body}>
        <Container style={container}>
          <Section style={accent} />
          <Section style={content}>{children}</Section>
          <Hr style={hr} />
          <Text style={footer}>{siteName}・這封信由系統自動寄出</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const heading = { fontSize: '20px', fontWeight: 600, color: '#2b2622', margin: '0 0 16px' }
export const paragraph = { fontSize: '15px', lineHeight: '26px', color: '#3d3732', margin: '0 0 12px' }
export const muted = { fontSize: '13px', lineHeight: '22px', color: '#8a8178', margin: '0 0 6px' }
export const button = {
  display: 'inline-block',
  backgroundColor: '#b23a2e',
  color: '#fffaf2',
  fontSize: '14px',
  padding: '10px 18px',
  borderRadius: '6px',
  textDecoration: 'none',
}

const body = { backgroundColor: '#f4efe6', fontFamily: '"Noto Serif TC", "Songti TC", serif', padding: '24px 0' }
const container = { backgroundColor: '#fffaf2', maxWidth: '560px', margin: '0 auto', borderRadius: '8px', overflow: 'hidden' }
const accent = { backgroundColor: '#b23a2e', height: '4px' }
const content = { padding: '28px 32px 8px' }
const hr = { borderColor: '#e6dccd', margin: '16px 32px' }
const footer = { fontSize: '12px', color: '#a39886', padding: '0 32px 20px', margin: 0 }
