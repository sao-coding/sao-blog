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

type EnhancedLinkProps = React.ComponentProps<'a'> & {
  href: string
  data: {
    title: string | null
    description: string | null
    image: string | null
  }
}

const EnhancedLink = ({ href, data, ...props }: EnhancedLinkProps) => {
  return (
    <Glimpse>
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
      <GlimpseContent className={cn(!data.image && 'w-full p-2')}>
        {!data.image && (
          <Link className="sao-link block" href={href}>
            {href}
          </Link>
        )}
        {data.image && (
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
