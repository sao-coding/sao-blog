import Header from '@/components/layout/header/header'
import Footer from '@/components/layout/footer'
import { PageScrollInfoProvider } from '@/components/providers/page-scroll-info-provider'
import { FABContainer } from '@/components/fab'

export default function BlogLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <div className="h-full bg-stone-900">
      <PageScrollInfoProvider />
      <Header />
      <div className="pt-[4.5rem] fill-content px-4 md:px-0">
        {/* <div className="fixed z-[-999] inset-0 bg-[url('/img/index.webp')] before:content-[''] bg-cover bg-center bg-no-repeat before:absolute before:inset-0 before:bg-black/50" /> */}

        {children}
      </div>
      <Footer />

      <FABContainer />
    </div>
  )
}
