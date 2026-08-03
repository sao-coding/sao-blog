import { m } from '#/paraglide/messages'
import { SITE_NAME } from '@/lib/seo'
import { LocaleSwitcher } from '@/components/locale-switcher'

const Footer = () => {
  return (
    <footer className="w-full border-t bg-white text-center dark:bg-gray-900 dark:text-gray-300 py-6 mt-32">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-center gap-3 px-4 sm:flex-row sm:justify-between">
        <p className="text-sm">
          {m.footer_copyright({ year: String(new Date().getFullYear()), siteName: SITE_NAME })}
        </p>
        <LocaleSwitcher />
      </div>
    </footer>
  )
}

export default Footer
