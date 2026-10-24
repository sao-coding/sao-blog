import { Heading, Text } from '@react-email/components'
import { EmailLayout, heading, paragraph } from './layout'

// 後台「寄測試信」

export function TestMailEmail({ siteName }: { siteName: string }) {
  return (
    <EmailLayout preview="SMTP 設定測試成功" siteName={siteName}>
      <Heading style={heading}>測試信</Heading>
      <Text style={paragraph}>收到這封信，代表後台的 SMTP 設定可以正常寄信。</Text>
    </EmailLayout>
  )
}
