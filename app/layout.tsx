import { Analytics } from '@vercel/analytics/next'
import { Noto_Sans_KR } from 'next/font/google'
import type { Metadata, Viewport } from 'next'
import './globals.css'

const notoSansKr = Noto_Sans_KR({ subsets: ['latin'], display: 'swap' })

export const metadata: Metadata = {
  title: 'Deadline-Counter | 선인장 공룡 디노와 함께하는 과제 마감 카운터',
  description: '복잡한 과제 일정, 귀여운 선인장 공룡 디노가 꼼꼼하게 챙겨줄게요. Gemini AI 자연어 과제 등록 & 3단계 실행 가이드',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuABxi5LHLA9TVBoqaeQAWPXAFkfqofy9UbYMW4RuiD_xBTlodlYgWKByz0KT72tz6N9izaBrhLJBDs3S7G8jM8lrM2tcV5FfpLySXybygJtG_nx1l0i5hFRwWh-Reom78MpbeK3u9DYuwGS6W19pxrVuB3F2xLph5gTEDEHSS94zwX06HmhzGc-La5G2UfMbLHvRATw-5pKl2FoC9qZf4yqY-7SBPhZbeM7zspZVp_Pwxz6LGlKpTawvQ',
      },
    ],
    apple: 'https://lh3.googleusercontent.com/aida-public/AB6AXuABxi5LHLA9TVBoqaeQAWPXAFkfqofy9UbYMW4RuiD_xBTlodlYgWKByz0KT72tz6N9izaBrhLJBDs3S7G8jM8lrM2tcV5FfpLySXybygJtG_nx1l0i5hFRwWh-Reom78MpbeK3u9DYuwGS6W19pxrVuB3F2xLph5gTEDEHSS94zwX06HmhzGc-La5G2UfMbLHvRATw-5pKl2FoC9qZf4yqY-7SBPhZbeM7zspZVp_Pwxz6LGlKpTawvQ',
  },
}

export const viewport: Viewport = {
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fbf9f8' },
    { media: '(prefers-color-scheme: dark)', color: '#1b1c1c' },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ko" className="bg-background">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;700;800&family=Karla:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased font-karla bg-background text-on-background min-h-screen">
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}

