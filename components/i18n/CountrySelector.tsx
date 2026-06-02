'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useLocale } from 'next-intl'
import { useRouter, usePathname } from '@/i18n/navigation'
import { CountryFlag } from './CountryFlag'
import type { Locale } from '@/i18n/routing'

interface Country {
  country_cd:     string
  dis_ord_seq:    number
  country_eng_nm: string
  country_mot_nm: string
  currency_cd:    string
  currency_eng_nm: string
  locale_cd:      string | null
  is_active:      boolean
}

const PRIORITY_LIMIT = 11

interface Props {
  triggerClass?: string
}

export default function CountrySelector({ triggerClass }: Props) {
  const locale   = useLocale()
  const router   = useRouter()
  const pathname = usePathname()

  const [countries, setCountries] = useState<Country[]>([])
  const [rates,     setRates]     = useState<Record<string, number>>({})
  const [isOpen,    setIsOpen]    = useState(false)
  const [query,     setQuery]     = useState('')
  const [loading,   setLoading]   = useState(true)
  const containerRef = useRef<HTMLDivElement>(null)

  // 국가 목록 + 환율 동시 로드
  useEffect(() => {
    Promise.all([
      fetch('/api/i18n/countries').then(r => r.json()),
      fetch('/api/i18n/rates').then(r => r.json()).catch(() => ({ rates: {} })),
    ]).then(([cntryData, rateData]) => {
      setCountries(cntryData)
      setRates(rateData.rates ?? {})
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setIsOpen(false); setQuery('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleSelect = useCallback((c: Country) => {
    router.replace(pathname, { locale: (c.locale_cd ?? 'en') as Locale })
    setIsOpen(false); setQuery('')
  }, [router, pathname])

  if (loading) return null

  const current     = countries.find(c => c.locale_cd === locale)
  const baseCurrCd  = current?.currency_cd ?? 'KRW'   // 현재 선택된 통화 기준

  // 통화 기호 간략 매핑
  const CURR_SYM: Record<string, string> = {
    KRW:'₩', USD:'$', EUR:'€', GBP:'£', JPY:'¥', CNY:'¥',
    AUD:'A$', CAD:'C$', CHF:'Fr', HKD:'HK$', SGD:'S$', NZD:'NZ$',
    SEK:'kr', NOK:'kr', DKK:'kr', INR:'₹', THB:'฿', MYR:'RM',
    IDR:'Rp', PHP:'₱', VND:'₫', ZAR:'R', BRL:'R$', MXN:'MX$',
    TRY:'₺', AED:'د.إ', SAR:'﷼', EGP:'£', NGN:'₦', TWD:'NT$',
  }
  const sym = (code: string) => CURR_SYM[code] ?? `${code} `

  // "1 [현재통화] = X [대상통화]" 포맷
  // rates: 1 KRW = rates[code] 외화 (KRW 기준)
  // 1 baseCurr = rates[targetCurr] / rates[baseCurr] targetCurr
  const fmtRate = (targetCurrCd: string): string => {
    if (targetCurrCd === baseCurrCd) return ''
    const baseRate   = rates[baseCurrCd]   // 1 KRW = baseRate baseCurr
    const targetRate = rates[targetCurrCd] // 1 KRW = targetRate targetCurr
    if (!baseRate || !targetRate) return ''

    const rate = targetRate / baseRate  // 1 baseCurr = rate targetCurr
    const s    = sym(targetCurrCd)

    if (rate >= 10000) return `${s}${Math.round(rate).toLocaleString()}`
    if (rate >= 100)   return `${s}${Math.round(rate)}`
    if (rate >= 1)     return `${s}${rate.toFixed(2)}`
    if (rate >= 0.01)  return `${s}${rate.toFixed(3)}`
    // 매우 작은 경우 (예: KRW→USD): 1,000 단위로 표시
    return `1,000${sym(baseCurrCd).trim()}=${s}${(rate * 1000).toFixed(2)}`
  }
  const priority = countries.filter(c => c.dis_ord_seq <= PRIORITY_LIMIT)
  const rest     = countries.filter(c => c.dis_ord_seq >  PRIORITY_LIMIT)

  const filterList = (list: Country[]) => !query.trim() ? list : list.filter(c =>
    c.country_eng_nm.toLowerCase().includes(query.toLowerCase()) ||
    c.country_mot_nm.includes(query) ||
    c.currency_cd.toLowerCase().includes(query.toLowerCase())
  )

  const fp = filterList(priority)
  const fr = filterList(rest)

  const defaultTrigger = 'text-blue-200 border-blue-400/40 hover:text-white hover:bg-white/10 hover:border-white/30'

  return (
    <div ref={containerRef} className="relative">

      {/* ── 트리거 버튼 ── */}
      <button
        onClick={() => setIsOpen(o => !o)}
        className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-sm transition-all ${triggerClass ?? defaultTrigger}`}
        title="국가·언어 선택"
      >
        {/* 국기 (SVG) */}
        {current
          ? <CountryFlag countryCd={current.country_cd} size="lg" />
          : <span className="text-xl leading-none">🌐</span>}
        {/* 통화코드 */}
        <span className="hidden sm:inline text-[11px] font-bold tracking-wide opacity-90">
          {current?.currency_cd ?? '—'}
        </span>
        {/* 화살표 */}
        <svg
          className={`w-3 h-3 opacity-60 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* ── 드롭다운 ── */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden ring-1 ring-black/5">

          {/* 헤더 — 현재 선택 */}
          {current && (
            <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100">
              <CountryFlag countryCd={current.country_cd} size="xl" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-gray-900 truncate">{current.country_mot_nm}</div>
                <div className="text-xs text-gray-500 truncate">
                  {current.country_eng_nm} · <span className="font-medium text-blue-700">{current.currency_cd} (기준통화)</span>
                </div>
              </div>
              <span className="text-xs text-blue-600 font-medium bg-blue-100 px-2 py-0.5 rounded-full">{locale}</span>
            </div>
          )}

          {/* 검색창 */}
          <div className="px-3 py-2 border-b border-gray-100">
            <div className="relative">
              <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                autoFocus
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="국가명 또는 통화코드 검색..."
                className="w-full pl-8 pr-3 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:bg-white text-gray-800 placeholder-gray-400"
              />
            </div>
          </div>

          {/* 목록 */}
          <div className="overflow-y-auto max-h-72">

            {/* 우선 11개국 */}
            {fp.length > 0 && (
              <>
                {!query && (
                  <div className="px-3 pt-2 pb-1">
                    <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">주요 언어</span>
                  </div>
                )}
                {fp.map(c => (
                  <FlagRow key={c.country_cd} country={c} selected={c.locale_cd === locale} onSelect={handleSelect} rateStr={fmtRate(c.currency_cd)} large />
                ))}
              </>
            )}

            {/* 구분선 */}
            {!query && fr.length > 0 && fp.length > 0 && (
              <div className="px-3 pt-3 pb-1 border-t border-gray-100 mt-1">
                <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">전체 국가</span>
              </div>
            )}

            {/* 나머지 176개국 */}
            {fr.map(c => (
              <FlagRow key={c.country_cd} country={c} selected={c.locale_cd === locale} onSelect={handleSelect} rateStr={fmtRate(c.currency_cd)} />
            ))}

            {fp.length === 0 && fr.length === 0 && (
              <div className="py-10 text-center">
                <span className="text-3xl">🔍</span>
                <p className="mt-2 text-sm text-gray-400">검색 결과 없음</p>
              </div>
            )}
          </div>

          {/* 하단 */}
          <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 text-[10px] text-gray-400 text-right">
            {countries.length}개국 지원
          </div>
        </div>
      )}
    </div>
  )
}

function FlagRow({
  country, selected, onSelect, large = false, rateStr = '',
}: {
  country: Country
  selected: boolean
  onSelect: (c: Country) => void
  large?: boolean
  rateStr?: string
}) {
  const inactive = !country.is_active

  return (
    <button
      onClick={() => onSelect(country)}
      className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-all
        ${selected
          ? 'bg-blue-50 border-l-2 border-blue-500'
          : inactive
            ? 'border-l-2 border-transparent cursor-default'
            : 'hover:bg-gray-50 border-l-2 border-transparent'
        }`}
    >
      {/* 국기 (SVG) — 비활성: 회색 처리 */}
      <CountryFlag
        countryCd={country.country_cd}
        size={large ? 'lg' : 'md'}
        grayscale={inactive}
      />

      {/* 국가명 */}
      <div className="flex-1 min-w-0">
        <div className={`text-sm truncate leading-tight ${
          selected  ? 'font-semibold text-blue-700' :
          inactive  ? 'text-gray-300' :
                      'text-gray-800'
        }`}>
          {country.country_mot_nm}
        </div>
        {large && (
          <div className={`text-[11px] truncate leading-tight ${inactive ? 'text-gray-200' : 'text-gray-400'}`}>
            {country.country_eng_nm}
          </div>
        )}
      </div>

      {/* 통화코드 + 환율 */}
      <div className="shrink-0 text-right">
        <div className={`text-[11px] font-mono tabular-nums ${inactive ? 'text-gray-200' : 'text-gray-400'}`}>
          {country.currency_cd}
        </div>
        {rateStr && !inactive && (
          <div className="text-[10px] text-blue-500 tabular-nums leading-tight whitespace-nowrap">
            {rateStr}
          </div>
        )}
      </div>

      {/* 선택 체크 or 번역 없음 뱃지 */}
      {selected ? (
        <svg className="w-4 h-4 text-blue-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      ) : inactive ? (
        <span className="text-[9px] text-gray-300 shrink-0 border border-gray-200 rounded px-1">미지원</span>
      ) : null}
    </button>
  )
}
