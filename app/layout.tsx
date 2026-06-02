import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { ALL_FONT_VARS } from '@/lib/fonts'
import { cn } from '@/lib/utils'
import './globals.css'

export const metadata: Metadata = {
  title: '표준데이터 관리 프로그램',
  description: 'DA Standard Data Management',
}

// [locale]/layout.tsx 가 LocaleHtmlUpdater 로 lang + activeFont 를 클라이언트에서 갱신
// suppressHydrationWarning: 서버(ko 기본) ↔ 클라이언트(실제 locale) 불일치 경고 억제
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      suppressHydrationWarning
      className={cn('h-full antialiased', ...ALL_FONT_VARS)}
    >
      <body suppressHydrationWarning className="min-h-full flex flex-col">
        {children}
      </body>
    </html>
  )
}
