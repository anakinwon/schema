'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useLocale } from 'next-intl'
import { useRouter, usePathname } from '@/i18n/navigation'
import { countryToFlag } from '@/lib/i18n/countryToFlag'
import type { Locale } from '@/i18n/routing'

interface Country {
  country_cd: string
  dis_ord_seq: number
  country_eng_nm: string
  country_mot_nm: string
  currency_cd: string
  currency_eng_nm: string
  locale_cd: string | null
}

// dis_ord_seq 1~11 이 우선 표시 국가
const PRIORITY_LIMIT = 11

interface Props {
  /** 트리거 버튼에 적용할 Tailwind 클래스 (헤더 테마별로 다르게 전달) */
  triggerClass?: string
}

export default function CountrySelector({ triggerClass }: Props) {
  const locale    = useLocale()
  const router    = useRouter()
  const pathname  = usePathname()

  const [countries, setCountries] = useState<Country[]>([])
  const [isOpen,    setIsOpen]    = useState(false)
  const [query,     setQuery]     = useState('')
  const [loading,   setLoading]   = useState(true)
  const containerRef = useRef<HTMLDivElement>(null)

  // 국가 목록 로드 (5분 캐싱 API)
  useEffect(() => {
    fetch('/api/i18n/countries')
      .then(r => r.json())
      .then((data: Country[]) => { setCountries(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  // 컨테이너 외부 클릭 → 닫기
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setIsOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // 국가 선택 → locale 전환
  const handleSelect = useCallback((country: Country) => {
    const newLocale = (country.locale_cd ?? 'en') as Locale
    router.replace(pathname, { locale: newLocale })
    setIsOpen(false)
    setQuery('')
  }, [router, pathname])

  if (loading) return null

  const currentCountry = countries.find(c => c.locale_cd === locale)
  const priority = countries.filter(c => c.dis_ord_seq <= PRIORITY_LIMIT)
  const rest     = countries.filter(c => c.dis_ord_seq >  PRIORITY_LIMIT)

  const filterList = (list: Country[]) =>
    query.trim()
      ? list.filter(c =>
          c.country_eng_nm.toLowerCase().includes(query.toLowerCase()) ||
          c.country_mot_nm.includes(query) ||
          c.currency_cd.toLowerCase().includes(query.toLowerCase())
        )
      : list

  const filteredPriority = filterList(priority)
  const filteredRest     = filterList(rest)
  const hasResult        = filteredPriority.length > 0 || filteredRest.length > 0

  const defaultTriggerClass =
    'text-blue-200 border-blue-400/40 hover:text-white hover:bg-white/10 hover:border-white/30'

  return (
    <div ref={containerRef} className="relative">
      {/* 트리거 버튼 */}
      <button
        onClick={() => setIsOpen(o => !o)}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded border text-sm transition-colors ${triggerClass ?? defaultTriggerClass}`}
        title="국가·언어 선택"
      >
        <span className="text-base leading-none">
          {currentCountry ? countryToFlag(currentCountry.country_cd) : '🌐'}
        </span>
        <span className="hidden sm:inline text-xs font-medium">
          {currentCountry?.currency_cd ?? ''}
        </span>
        <span className="text-[9px] opacity-50">▼</span>
      </button>

      {/* 드롭다운 */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-1 w-72 bg-white rounded-lg shadow-2xl border border-gray-200 z-50 overflow-hidden">
          {/* 검색 */}
          <div className="p-2 border-b border-gray-100">
            <input
              autoFocus
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="국가명·통화 검색"
              className="w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-400 text-gray-800"
            />
          </div>

          <div className="overflow-y-auto max-h-64">
            {/* 우선 11개국 */}
            {filteredPriority.map(c => (
              <CountryRow
                key={c.country_cd}
                country={c}
                selected={c.locale_cd === locale}
                onSelect={handleSelect}
              />
            ))}

            {/* 구분선 — 검색 없을 때 + 나머지 있을 때만 */}
            {!query && filteredRest.length > 0 && filteredPriority.length > 0 && (
              <div className="mx-3 my-1 border-t border-gray-100" />
            )}

            {/* 나머지 176개국 */}
            {filteredRest.map(c => (
              <CountryRow
                key={c.country_cd}
                country={c}
                selected={c.locale_cd === locale}
                onSelect={handleSelect}
              />
            ))}

            {!hasResult && (
              <p className="py-6 text-center text-sm text-gray-400">검색 결과 없음</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function CountryRow({
  country, selected, onSelect,
}: {
  country: Country
  selected: boolean
  onSelect: (c: Country) => void
}) {
  return (
    <button
      onClick={() => onSelect(country)}
      className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left transition-colors
        ${selected ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
    >
      <span className="text-base shrink-0 leading-none">
        {countryToFlag(country.country_cd)}
      </span>
      <span className={`flex-1 truncate ${selected ? 'font-semibold text-blue-700' : 'text-gray-800'}`}>
        {country.country_mot_nm}
      </span>
      <span className="text-xs text-gray-400 shrink-0 font-mono">
        {country.currency_cd}
      </span>
    </button>
  )
}
