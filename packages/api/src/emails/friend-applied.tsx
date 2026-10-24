import { Button, Heading, Link, Section, Text } from '@react-email/components'
import { EmailLayout, button, heading, muted, paragraph } from './layout'

// 給站長：有新的友鏈申請

interface FriendAppliedEmailProps {
  siteName: string
  name: string
  url: string
  email: string
  description: string
  reviewUrl?: string
}

export function FriendAppliedEmail({ siteName, name, url, email, description, reviewUrl }: FriendAppliedEmailProps) {
  return (
    <EmailLayout preview={`${name} 申請了友鏈`} siteName={siteName}>
      <Heading style={heading}>新的友鏈申請</Heading>
      <Text style={paragraph}>
        <strong>{name}</strong> 申請了友鏈。
      </Text>
      <Section style={{ margin: '0 0 16px' }}>
        <Text style={muted}>
          網址：<Link href={url}>{url}</Link>
        </Text>
        <Text style={muted}>介紹：{description}</Text>
        <Text style={muted}>Email：{email}</Text>
      </Section>
      {reviewUrl && (
        <Button href={reviewUrl} style={button}>
          前往審核
        </Button>
      )}
    </EmailLayout>
  )
}
