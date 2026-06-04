import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import Script from 'next/script'
import { ALL_FONT_VARS } from '@/lib/fonts'
import { cn } from '@/lib/utils'
import { PiAuthProvider } from '@/components/pi-auth-provider'
import './globals.css'
import 'flag-icons/css/flag-icons.min.css'
import { Oxanium } from "next/font/google";

const oxanium = Oxanium({subsets:['latin'],variable:'--font-sans'});

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
      className={cn('h-full antialiased', ...ALL_FONT_VARS, "font-sans", oxanium.variable)}
    >
      {/* beforeInteractive: Pi SDK가 hydration 전에 window.Pi를 등록하도록 보장 */}
      <Script src="https://sdk.minepi.com/pi-sdk.js" strategy="beforeInteractive" />
      <body suppressHydrationWarning className="min-h-full flex flex-col">
        <PiAuthProvider>
          {children}
        </PiAuthProvider>
      </body>
    </html>
  )
}
