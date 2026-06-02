'use client'

import { useState, useEffect, useCallback } from 'react'
import { createBrowserClient } from '@supabase/ssr'

interface LangStat {
  lang_cd: string
  lang_nm: string
  native_nm: string
  translated: number
  total: number
  pct: number
}

type WorkResult = { lang: string; cnt: number; skipped?: number; type: 'translate' | 'sync' }

export default function I18nDashboard() {
  const [stats, setStats] = useState<LangStat[]>([])
  const [totalKeys, setTotalKeys] = useState(0)
  const [activeCountries, setActiveCountries] = useState(0)
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState<string | null>(null)   // 작업 중인 lang_cd
  const [workResult, setWorkResult] = useState<WorkResult | null>(null)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  )

  const authHeader = useCallback(async (): Promise<Record<string, string>> => {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}
  }, [supabase])

  const loadStats = useCallback(async () => {
    const headers = await authHeader()
    const res = await fetch('/api/i18n/stats', { headers })
    if (res.ok) {
      const d = await res.json()
      setStats(d.stats ?? [])
      setTotalKeys(d.totalKeys ?? 0)
      setActiveCountries(d.activeCountries ?? 0)
    }
    setLoading(false)
  }, [authHeader])

  useEffect(() => { loadStats() }, [loadStats])

  // 한국어 → 대상 언어 AI 번역 + DB 저장 + JSON 동기화 (원스톱)
  const translateAndSync = async (lang_cd: string, native_nm: string) => {
    const missing = totalKeys - (stats.find(s => s.lang_cd === lang_cd)?.translated ?? 0)
    if (missing === 0) {
      alert(`${native_nm}(${lang_cd}) 번역이 이미 완료되었습니다 (${totalKeys}/${totalKeys}건)`)
      return
    }
    if (!confirm(`${native_nm}(${lang_cd})으로 AI 번역 후 JSON 동기화를 실행합니다.\n미번역 ${missing}건만 번역합니다 (이미 완료된 ${totalKeys - missing}건 제외). 계속하시겠습니까?`)) return
    setWorking(lang_cd)
    setWorkResult(null)
    const headers = { ...await authHeader(), 'Content-Type': 'application/json' }
    const res = await fetch('/api/i18n/translate', {
      method: 'POST', headers,
      body: JSON.stringify({ lang_cd }),
    })
    const d = await res.json()
    if (res.ok) {
      setWorkResult({ lang: lang_cd, cnt: d.translated ?? 0, skipped: d.skipped ?? 0, type: 'translate' })
      await loadStats()   // 완료율 새로고침
    } else {
      alert(`번역 실패: ${d.error ?? '알 수 없는 오류'}`)
    }
    setWorking(null)
  }

  if (loading) return <div className="animate-pulse h-40 bg-gray-100 rounded" />

  return (
    <div className="space-y-6">
      {/* 요약 카드 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-xs text-gray-500 mb-1">활성 국가</p>
          <p className="text-2xl font-bold text-[#1e3a5f]">{activeCountries}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">{stats.length}개 언어 사용</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-xs text-gray-500 mb-1">전체 번역 키</p>
          <p className="text-2xl font-bold text-[#1e3a5f]">{totalKeys}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-xs text-gray-500 mb-1">100% 완료 언어</p>
          <p className="text-2xl font-bold text-green-600">{stats.filter(s => s.pct === 100).length}</p>
        </div>
      </div>

      {/* 결과 토스트 */}
      {workResult && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
          ✅ <strong>{workResult.lang}</strong> 번역 + 동기화 완료 —{' '}
          {workResult.cnt > 0
            ? `${workResult.cnt}건 신규 번역${workResult.skipped ? ` (${workResult.skipped}건 기존 유지)` : ''}`
            : '이미 모두 번역됨'}
          <button onClick={() => setWorkResult(null)} className="ml-auto text-green-400 hover:text-green-600">✕</button>
        </div>
      )}

      {/* 언어별 번역 현황 + 버튼 */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">
            언어별 번역 현황
            <span className="ml-2 text-xs font-normal text-gray-400">{stats.length}개 언어 · 활성 {activeCountries}개국</span>
          </h2>
          <p className="text-xs text-gray-400">🔄 클릭 → 한국어 기준 AI 번역 + JSON 동기화 자동 실행</p>
        </div>
        <div className="divide-y divide-gray-50">
          {stats.map(s => (
            <div key={s.lang_cd} className="px-4 py-3 flex items-center gap-4">
              {/* 언어 코드 + 이름 */}
              <div className="w-28 shrink-0">
                <span className="text-xs font-mono text-gray-400">{s.lang_cd}</span>
                <p className="text-sm font-medium text-gray-800">{s.native_nm}</p>
              </div>

              {/* 프로그레스바 */}
              <div className="flex-1">
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>{s.translated} / {s.total}건</span>
                  <span className={
                    s.pct === 100 ? 'text-green-600 font-medium' :
                    s.pct < 50 ? 'text-red-500' : 'text-yellow-600'
                  }>{s.pct}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      s.pct === 100 ? 'bg-green-500' :
                      s.pct < 50 ? 'bg-red-400' : 'bg-yellow-400'
                    }`}
                    style={{ width: `${s.pct}%` }}
                  />
                </div>
              </div>

              {/* 단일 버튼: AI 번역 + JSON 동기화 (ko 제외) */}
              {s.lang_cd !== 'ko' && (
                <div className="shrink-0">
                  <button
                    onClick={() => translateAndSync(s.lang_cd, s.native_nm)}
                    disabled={working === s.lang_cd}
                    className="px-3 py-1.5 text-xs bg-[#1e3a5f] text-white rounded hover:bg-[#16304f] disabled:opacity-50 transition-colors whitespace-nowrap flex items-center gap-1"
                  >
                    {working === s.lang_cd
                      ? <><span className="animate-spin">⏳</span> 번역 중...</>
                      : '🔄 번역 + 동기화'}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
