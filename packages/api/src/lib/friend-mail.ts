import { createElement } from 'react'
import { getMailSettings, getSiteSettings } from '@sao-blog/db/site-settings'
import { FriendAppliedEmail } from '../emails/friend-applied'
import { FriendReviewedEmail } from '../emails/friend-reviewed'
import { mailReady, sendMailInBackground } from './mailer'

// 友鏈相關通知信

interface FriendInfo {
  name: string
  url: string
  email: string | null
  description?: string | null
  reviewNote?: string | null
}

const trimSlash = (url: string) => url.replace(/\/+$/, '')

/** 申請人會不會收到審核結果（決定申請成功的提示要不要說「會以 email 通知」） */
export async function friendMailEnabled() {
  const s = await getMailSettings()
  return mailReady(s) && s.notifyApplicantOnReview
}

export async function notifyOwnerFriendApplied(friend: FriendInfo) {
  const [mail, site] = await Promise.all([getMailSettings(), getSiteSettings()])
  if (!mail.notifyOwnerOnFriendApply || !site.ownerEmail) return
  const siteName = site.name || '部落格'
  sendMailInBackground({
    to: site.ownerEmail,
    subject: `[${siteName}] 新的友鏈申請：${friend.name}`,
    react: createElement(FriendAppliedEmail, {
      siteName,
      name: friend.name,
      url: friend.url,
      email: friend.email ?? '',
      description: friend.description ?? '',
      reviewUrl: site.adminUrl ? `${trimSlash(site.adminUrl)}/friends?status=pending` : undefined,
    }),
  })
}

export async function notifyApplicantReviewed(friend: FriendInfo, status: 'approved' | 'rejected') {
  if (!friend.email) return
  const [mail, site] = await Promise.all([getMailSettings(), getSiteSettings()])
  if (!mail.notifyApplicantOnReview) return
  const siteName = site.name || '本站'
  const approved = status === 'approved'
  sendMailInBackground({
    to: friend.email,
    subject: approved ? `[${siteName}] 友鏈申請已通過` : `[${siteName}] 友鏈申請結果`,
    react: createElement(FriendReviewedEmail, {
      siteName,
      name: friend.name,
      approved,
      friendsPageUrl: site.url ? `${trimSlash(site.url)}/friends` : undefined,
      reason: friend.reviewNote,
    }),
  })
}
