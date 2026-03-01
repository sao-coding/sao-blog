import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/sonner'
import { ThemeProvider } from 'next-themes'
import Providers from './providers'
import Script from 'next/script'
import Header from '@/components/layout/header/nav'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: '唯一のBlog - 這雖然是遊戲，但可不是鬧著玩的',
  description: '唯一のBlog',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="zh-Hant-TW" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <Providers>
          {children}
          <Toaster richColors />
        </Providers>
        </ThemeProvider>
        {/* <canvas
          id="universe"
          className="pointer-events-none fixed left-0 top-0 z-[1] m-0 block h-full w-full border-0 p-0 outline-0"
        />
        <Script src="/js/universe.js" async defer strategy="afterInteractive" /> */}
      </body>
    </html>
  )
}
