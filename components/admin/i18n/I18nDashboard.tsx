'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'

interface LangStat {
  lang_cd: string
  lang_nm: string
  native_nm: string
  translated: number
  total: number
  pct: number
}

export default function I18nDashboard() {
  const router = useRouter()
  const [stats, setStats] = useState<LangStat[]>([])
  const [totalKeys, setTotalKeys] = useState(0)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState<string | null>(null)   // 동기화 중인 lang_cd
  const [syncResult, setSyncResult] = useState<{ lang: string; cnt: number } | null>(null)

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
    }
    setLoading(false)
  }, [authHeader])

  useEffect(() => { loadStats() }, [loadStats])

  // 단일 언어 DB→JSON 동기화
  const syncLang = async (lang_cd: string) => {
    setSyncing(lang_cd)
    setSyncResult(null)
    const headers = { ...await authHeader(), 'Content-Type': 'application/json' }
    const res = await fetch('/api/i18n/sync', {
      method: 'POST', headers,
      body: JSON.stringify({ lang_cd }),
    })
    if (res.ok) {
      const d = await res.json()
      setSyncResult({ lang: lang_cd, cnt: d.synced?.[lang_cd] ?? 0 })
    }
    setSyncing(null)
  }

  // 번역 편집 페이지로 이동 (해당 언어 컬럼 초점)
  const goToTranslate = (lang_cd: string) => {
    router.push(`/admin/i18n/messages?lang=${lang_cd}`)
  }

  if (loading) return <div className="animate-pulse h-40 bg-gray-100 rounded" />

  return (
    <div className="space-y-6">
      {/* 요약 카드 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-xs text-gray-500 mb-1">지원 언어</p>
          <p className="text-2xl font-bold text-[#1e3a5f]">{stats.length}</p>
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

      {/* 동기화 결과 토스트 */}
      {syncResult && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
          ✅ <strong>{syncResult.lang}.json</strong> 동기화 완료 — {syncResult.cnt}건 반영
          <button onClick={() => setSyncResult(null)} className="ml-auto text-green-400 hover:text-green-600">✕</button>
        </div>
      )}

      {/* 언어별 번역 현황 + 버튼 */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">언어별 번역 현황</h2>
          <p className="text-xs text-gray-400">언어 선택 후 번역 편집 또는 동기화 실행</p>
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

              {/* 액션 버튼 */}
              <div className="shrink-0 flex gap-1.5">
                <button
                  onClick={() => goToTranslate(s.lang_cd)}
                  className="px-2.5 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 transition-colors text-gray-600 whitespace-nowrap"
                >
                  ✏️ 번역 편집
                </button>
                <button
                  onClick={() => syncLang(s.lang_cd)}
                  disabled={syncing === s.lang_cd}
                  className="px-2.5 py-1 text-xs bg-[#1e3a5f] text-white rounded hover:bg-[#16304f] disabled:opacity-50 transition-colors whitespace-nowrap"
                >
                  {syncing === s.lang_cd ? '⏳ 동기화 중...' : '🔄 JSON 동기화'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
