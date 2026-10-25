import { useState } from 'react'
import { IconBrandGithub, IconBrandGoogle, IconLoader2 } from '@tabler/icons-react'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@sao-blog/ui/components/dialog'
import { Avatar, AvatarFallback, AvatarImage } from '@sao-blog/ui/components/avatar'
import { Button } from '@sao-blog/ui/components/button'
import { SITE_OWNER } from '@/config/mega-menu'
import { authClient } from '@/lib/auth-client'
import { siteName } from '@/lib/seo'
import { useLoginDialogStore } from '@/store/login-dialog-store'
import { m } from '#/paraglide/messages'

type Provider = 'github' | 'google'

/** 全站唯一的讀者登入對話框（GitHub / Google），由 useLoginDialogStore 控制開關 */
export function LoginDialog() {
  const open = useLoginDialogStore((s) => s.open)
  const setOpen = useLoginDialogStore((s) => s.setOpen)
  const [pending, setPending] = useState<Provider | null>(null)

  const signIn = async (provider: Provider) => {
    setPending(provider)
    try {
      // 登入後回到目前頁面（含 query / hash，例如留言區錨點）
      await authClient.signIn.social({ provider, callbackURL: window.location.href })
    } catch {
      setPending(null)
    }
  }

  const providers = [
    { id: 'github', label: m.login_github(), Icon: IconBrandGithub },
    { id: 'google', label: m.login_google(), Icon: IconBrandGoogle },
  ] as const

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="overflow-visible">
        <Avatar className="absolute -top-7 left-1/2 size-14 -translate-x-1/2 ring-4 ring-popover">
          <AvatarImage src={SITE_OWNER.avatar} />
          <AvatarFallback>{SITE_OWNER.fallback}</AvatarFallback>
        </Avatar>
        <div className="flex flex-col items-center gap-1 pt-8 text-center">
          <DialogTitle className="font-wenkai text-lg">{m.login_dialog_title({ site: siteName() })}</DialogTitle>
          <DialogDescription className="text-xs">{m.login_dialog_description()}</DialogDescription>
        </div>
        <div className="flex justify-center gap-4 pb-2">
          {providers.map(({ id, label, Icon }) => (
            <Button
              key={id}
              variant="outline"
              size="icon-lg"
              className="rounded-full"
              disabled={pending !== null}
              onClick={() => signIn(id)}
              aria-label={label}
              title={label}
            >
              {pending === id ? <IconLoader2 className="size-6 animate-spin" /> : <Icon className="size-6" />}
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
