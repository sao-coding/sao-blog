import { m } from '#/paraglide/messages'
import { siteName } from '@/lib/seo'
import { LocaleSwitcher } from '@/components/locale-switcher'
import { SeasonSwitcher } from '@/components/season-switcher'
import { ThemeToggle } from '@/components/theme-toggle'
import { siteTime } from '@/lib/site-time'

const Footer = () => {
  return (
    <footer className="relative mt-32 w-full border-t border-rule glass py-6 text-center">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-center gap-4 px-4 md:flex-row md:justify-between">
        <p className="text-sm text-muted-foreground">
          {m.footer_copyright({ year: String(siteTime(new Date()).year()), siteName: siteName() })}
        </p>
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:gap-6">
          <SeasonSwitcher />
          <ThemeToggle />
          <LocaleSwitcher />
        </div>
      </div>
    </footer>
  )
}

export default Footer
