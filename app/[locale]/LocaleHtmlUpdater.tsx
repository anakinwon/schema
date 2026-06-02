'use client'

import { useEffect } from 'react'
import { ALL_FONT_VARS } from '@/lib/fonts'
import { cn } from '@/lib/utils'

interface Props {
  locale: string
  fontClass: string
}

// html 태그의 lang 속성과 font 클래스를 locale에 맞게 클라이언트에서 갱신
// root layout이 suppressHydrationWarning 으로 초기 불일치를 허용하므로
// 하이드레이션 완료 후 즉시 올바른 값으로 업데이트됨
export function LocaleHtmlUpdater({ locale, fontClass }: Props) {
  useEffect(() => {
    const html = document.documentElement
    html.lang = locale
    html.className = cn('h-full antialiased', ...ALL_FONT_VARS, fontClass)
  }, [locale, fontClass])

  return null
}
