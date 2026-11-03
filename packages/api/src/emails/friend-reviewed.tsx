import { Button, Heading, Text } from '@react-email/components'
import { EmailLayout, button, heading, paragraph } from './layout'

// 給申請人：友鏈審核結果

interface FriendReviewedEmailProps {
  siteName: string
  name: string
  approved: boolean
  friendsPageUrl?: string
  reason?: string | null
}

export function FriendReviewedEmail({ siteName, name, approved, friendsPageUrl, reason }: FriendReviewedEmailProps) {
  return (
    <EmailLayout preview={approved ? '你的友鏈申請已通過' : '你的友鏈申請結果'} siteName={siteName}>
      <Heading style={heading}>{approved ? '友鏈申請已通過' : '友鏈申請結果'}</Heading>
      <Text style={paragraph}>{name} 你好：</Text>
      {approved ? (
        <>
          <Text style={paragraph}>你在 {siteName} 申請的友鏈已經通過了，謝謝你！</Text>
          {friendsPageUrl && (
            <Button href={friendsPageUrl} style={button}>
              看看友鏈頁
            </Button>
          )}
        </>
      ) : (
        <>
          <Text style={paragraph}>很抱歉，你在 {siteName} 申請的友鏈這次沒有通過。</Text>
          {reason && <Text style={paragraph}>原因：{reason}</Text>}
        </>
      )}
    </EmailLayout>
  )
}
