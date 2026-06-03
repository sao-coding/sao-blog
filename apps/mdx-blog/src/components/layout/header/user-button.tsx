"use client"

import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { SITE_OWNER } from '@/config/mega-menu'
import { IconBrandGithub, IconBrandGoogle, IconUserBolt } from '@tabler/icons-react'
import { authClient } from "@/lib/auth-client"


const UserButton = () => {
  const {
    data: session,
    isPending, //loading state
    error, //error object
    refetch //refetch the session
  } = authClient.useSession()

  const signIn = async (provider: string) => {
    const data = await authClient.signIn.social({
      provider,
      callbackURL: `${window.location.origin}`
    })
  }

  return (
    <Dialog>
      {session?.user ? (
        <>
          <DropdownMenu>
            <DropdownMenuTrigger>
              <Avatar className="size-10 cursor-pointer">
                <AvatarImage src={session.user.image as string} />
                <AvatarFallback>{session.user.name?.[0] || "U"}</AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuGroup>
                <DropdownMenuLabel>{session.user.name}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <Button variant="outline" className="w-full" onClick={() => authClient.signOut()}>
                    登出
                  </Button>
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </>
      ) : (
        <>
          <DialogTrigger render={
            <Button variant="outline" size="icon-lg" className="rounded-full size-10">
              <IconUserBolt className='size-6 cursor-pointer' />
            </Button>
          } />
        </>
      )}
      <DialogContent>
        <div className="relative flex justify-center pt-8">
          <Avatar className="size-14 absolute -top-11 left-1/2 -translate-x-1/2">
            <AvatarImage src={SITE_OWNER.avatar} />
            <AvatarFallback>{SITE_OWNER.fallback}</AvatarFallback>
          </Avatar>
          <div className="gap-4 flex flex-col items-center">
            登入到 唯一のBlog
            <div className="flex gap-4">
              <Button variant="outline" size="icon-lg" className="rounded-full" onClick={() => signIn("github")}>
                <IconBrandGithub className='size-6' />
              </Button>
              <Button variant="outline" size="icon-lg" className="rounded-full" onClick={() => signIn("google")}>
                <IconBrandGoogle className='size-6' />
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default UserButton