import {
  Geist,
  Geist_Mono,
  Noto_Sans,
  Noto_Sans_KR,
  Noto_Sans_SC,
  Noto_Sans_JP,
  Noto_Sans_Thai,
  Noto_Sans_Devanagari,
  Playfair_Display,
} from 'next/font/google'

// 기본 폰트 (Geist, Heading)
const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })
const playfair  = Playfair_Display({ subsets: ['latin'], variable: '--font-heading' })

// 라틴 계열 (en·vi·id·ms·en-ZA·fil)
const latin = Noto_Sans({ subsets: ['latin'], variable: '--font-latin', display: 'swap' })

// CJK 및 특수 문자계열
const kr   = Noto_Sans_KR({ subsets: ['latin'], variable: '--font-kr',   display: 'swap' })
const sc   = Noto_Sans_SC({ subsets: ['latin'], variable: '--font-sc',   display: 'swap' })
const jp   = Noto_Sans_JP({ subsets: ['latin'], variable: '--font-jp',   display: 'swap' })
const thai = Noto_Sans_Thai({ subsets: ['latin', 'thai'], variable: '--font-thai', display: 'swap' })
const deva = Noto_Sans_Devanagari({ subsets: ['latin', 'devanagari'], variable: '--font-deva', display: 'swap' })

// html 태그에 등록할 CSS 변수 전체 목록 (항상 모두 등록, active 폰트만 font-family로 스왑)
export const ALL_FONT_VARS = [
  geistSans.variable,
  geistMono.variable,
  playfair.variable,
  latin.variable,
  kr.variable,
  sc.variable,
  jp.variable,
  thai.variable,
  deva.variable,
]

// locale → Tailwind 유틸리티 클래스 (globals.css에 정의)
const ACTIVE_FONT_CLASS: Record<string, string> = {
  ko: 'font-kr',
  zh: 'font-sc',
  ja: 'font-jp',
  th: 'font-thai',
  hi: 'font-deva',
}

export function getActiveFontClass(locale: string): string {
  return ACTIVE_FONT_CLASS[locale] ?? 'font-latin'
}
