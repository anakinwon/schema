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
  title: '스키마 프로그램',
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
      {/* afterInteractive: React 19는 <head> 외부에 sync 스크립트 금지.
          window.Pi 접근은 useEffect 이후이므로 afterInteractive로 충분함.
          SDK 로드 전 인증 시도는 pi-auth-provider의 waitForPiSdk()가 대기함. */}
      <Script src="https://sdk.minepi.com/pi-sdk.js" strategy="afterInteractive" />
      <body suppressHydrationWarning className="min-h-full flex flex-col">
        <PiAuthProvider>
          {children}
        </PiAuthProvider>
      </body>
    </html>
  )
}
