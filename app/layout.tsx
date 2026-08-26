import { Analytics } from '@vercel/analytics/next'
import { Noto_Sans_KR } from 'next/font/google'
import type { Metadata, Viewport } from 'next'
import './globals.css'

const notoSansKr = Noto_Sans_KR({ subsets: ['latin'], display: 'swap' })

export const metadata: Metadata = {
  title: '과제 마감 카운터',
  description: '대학생을 위한 간단하고 직관적인 과제 마감일 카운터',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: 'white' },
    { media: '(prefers-color-scheme: dark)', color: 'black' },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ko" className="bg-background">
      <body className={`${notoSansKr.className} antialiased`}>
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
