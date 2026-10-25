import { useEffect, useState } from "react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@sao-blog/ui/components/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from '@sao-blog/ui/components/avatar'
import { Button } from '@sao-blog/ui/components/button'
import { IconLogout, IconUserBolt } from '@tabler/icons-react'
import { authClient } from "@/lib/auth-client"
import { openLoginDialog } from "@/store/login-dialog-store"
import { m } from '#/paraglide/messages'

const UserButton = () => {
  const { data: session } = authClient.useSession()

  // Avoid hydration mismatch: better-auth's session store can resolve
  // synchronously on the client (from its cookie cache) before hydration
  // even though the server always renders the signed-out branch. Delay
  // switching branches until after mount so the first client render
  // matches the server output.
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted || !session?.user) {
    return (
      <Button
        variant="outline"
        size="icon-lg"
        className="rounded-full size-10"
        aria-label={m.reader_login()}
        title={m.reader_login()}
        onClick={openLoginDialog}
      >
        <IconUserBolt className='size-6' />
      </Button>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="rounded-full">
        <Avatar className="size-10 cursor-pointer">
          <AvatarImage src={session.user.image ?? undefined} alt={session.user.name} />
          <AvatarFallback>{session.user.name?.[0] || "U"}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuGroup>
          <DropdownMenuLabel>{session.user.name}</DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => authClient.signOut()}>
          <IconLogout />
          {m.logout()}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default UserButton
