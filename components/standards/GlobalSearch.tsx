'use client'
// TASK-011: 통합 검색 (초성 검색 + 약어 역방향 검색)
import { useState, useRef, useEffect } from 'react'

interface SearchResult {
  words:   { DIC_ID: string; DIC_LOG_NM: string; DIC_PHY_NM: string }[]
  domains: { DOM_ID: string; KEY_DOM_NM: string; KEY_DOM_PHY_NM: string }[]
  terms:   { DIC_ID: string; DIC_LOG_NM: string; DIC_PHY_FLL_NM: string }[]
}

interface Props {
  onNavigate?: (tab: 'word' | 'domain' | 'term') => void
}

export default function GlobalSearch({ onNavigate }: Props) {
  const [q, setQ] = useState('')
  const [result, setResult] = useState<SearchResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!q.trim()) { setResult(null); setOpen(false); return }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      const r = await fetch(`/api/search?q=${encodeURIComponent(q)}`)
      const data = await r.json()
      setResult(data)
      setOpen(true)
      setLoading(false)
    }, 300)
  }, [q])

  const total = result
    ? result.words.length + result.domains.length + result.terms.length
    : 0

  const isChosung = /^[ㄱ-ㅎ]+$/.test(q)

  return (
    <div className="relative">
      <div className="flex items-center gap-1.5 bg-white/10 rounded-lg px-3 py-1.5 border border-white/20">
        <span className="text-white/60 text-sm">🔍</span>
        <input
          ref={inputRef}
          value={q}
          onChange={e => setQ(e.target.value)}
          onFocus={() => result && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 200)}
          placeholder="통합검색 · 초성(ㅅㅇㅈ) · 약어(USR)"
          className="bg-transparent text-white placeholder-white/40 text-xs w-56 focus:outline-none"
        />
        {loading && <span className="text-white/40 text-[10px] animate-pulse">…</span>}
        {q && !loading && (
          <button onClick={() => { setQ(''); setResult(null); setOpen(false) }}
            className="text-white/40 hover:text-white text-xs">✕</button>
        )}
      </div>

      {/* 검색 결과 드롭다운 */}
      {open && result && (
        <div className="absolute top-full right-0 mt-1 w-80 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 overflow-hidden">
          <div className="px-3 py-2 bg-gray-50 border-b flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-600">검색 결과</span>
            <div className="flex items-center gap-1.5">
              {isChosung && <span className="text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded">초성검색</span>}
              <span className="text-[10px] text-gray-400">{total}건</span>
            </div>
          </div>

          {total === 0 ? (
            <div className="py-6 text-center text-xs text-gray-400">검색 결과 없음</div>
          ) : (
            <div className="max-h-72 overflow-auto">
              {/* 표준단어 */}
              {result.words.length > 0 && (
                <div>
                  <div className="px-3 py-1 text-[10px] font-bold text-gray-400 bg-gray-50 sticky top-0">
                    📝 표준단어 ({result.words.length})
                  </div>
                  {result.words.slice(0, 5).map(w => (
                    <button key={w.DIC_ID} type="button"
                      onClick={() => { onNavigate?.('word'); setOpen(false); setQ('') }}
                      className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-blue-50 text-left">
                      <span className="text-xs font-medium text-gray-800">{w.DIC_LOG_NM}</span>
                      <span className="text-[10px] text-gray-400 font-mono">{w.DIC_PHY_NM}</span>
                    </button>
                  ))}
                  {result.words.length > 5 && (
                    <div className="px-3 py-1 text-[10px] text-gray-400">외 {result.words.length - 5}건</div>
                  )}
                </div>
              )}

              {/* 표준도메인 */}
              {result.domains.length > 0 && (
                <div className="border-t">
                  <div className="px-3 py-1 text-[10px] font-bold text-gray-400 bg-gray-50 sticky top-0">
                    🗂️ 표준도메인 ({result.domains.length})
                  </div>
                  {result.domains.slice(0, 5).map(d => (
                    <button key={d.DOM_ID} type="button"
                      onClick={() => { onNavigate?.('domain'); setOpen(false); setQ('') }}
                      className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-blue-50 text-left">
                      <span className="text-xs font-medium text-gray-800">{d.KEY_DOM_NM}</span>
                      <span className="text-[10px] text-gray-400 font-mono">{d.KEY_DOM_PHY_NM}</span>
                    </button>
                  ))}
                  {result.domains.length > 5 && (
                    <div className="px-3 py-1 text-[10px] text-gray-400">외 {result.domains.length - 5}건</div>
                  )}
                </div>
              )}

              {/* 표준용어 */}
              {result.terms.length > 0 && (
                <div className="border-t">
                  <div className="px-3 py-1 text-[10px] font-bold text-gray-400 bg-gray-50 sticky top-0">
                    📋 표준용어 ({result.terms.length})
                  </div>
                  {result.terms.slice(0, 5).map(t => (
                    <button key={t.DIC_ID} type="button"
                      onClick={() => { onNavigate?.('term'); setOpen(false); setQ('') }}
                      className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-blue-50 text-left">
                      <span className="text-xs font-medium text-gray-800">{t.DIC_LOG_NM}</span>
                      <span className="text-[10px] text-gray-400 font-mono">{t.DIC_PHY_FLL_NM}</span>
                    </button>
                  ))}
                  {result.terms.length > 5 && (
                    <div className="px-3 py-1 text-[10px] text-gray-400">외 {result.terms.length - 5}건</div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
