'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Glimpse,
  GlimpseContent,
  GlimpseDescription,
  GlimpseImage,
  GlimpseTitle,
  GlimpseTrigger,
} from '@/components/kibo-ui/glimpse'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { SiGithub } from '@icons-pack/react-simple-icons'
import { orpc } from '@/lib/orpc'

type EnhancedLinkProps = React.ComponentProps<'a'> & {
  href: string
}

const EnhancedLink = ({ href, ...props }: EnhancedLinkProps) => {
  const [enabled, setEnabled] = useState(false)

  const { data } = useQuery({
    ...orpc.linkPreview.getLinkPreview.queryOptions({ url: href }),
    enabled,
    staleTime: 24 * 60 * 60 * 1000,
  })

  return (
    <Glimpse onOpenChange={(open) => { if (open) setEnabled(true) }}>
      <GlimpseTrigger delay={0} closeDelay={100} render={
        <span className="inline-flex items-center align-top [&_svg]:size-4">
          {href.includes('https://github.com') && (
            <span className="inline-flex items-center mx-1">
              <SiGithub />
            </span>
          )}
          <Link className="sao-link" href={href} {...props} />
        </span>
      }>
      </GlimpseTrigger>
      <GlimpseContent className={cn(!data?.image && 'w-full p-2')}>
        {!data?.image && (
          <Link className="sao-link block" href={href}>
            {href}
          </Link>
        )}
        {data?.image && (
          <>
            <GlimpseImage src={data.image} alt={data.title ?? ''} />
            <GlimpseTitle>{data.title}</GlimpseTitle>
            <GlimpseDescription>{data.description}</GlimpseDescription>
          </>
        )}
      </GlimpseContent>
    </Glimpse>
  )
}
export default EnhancedLink
