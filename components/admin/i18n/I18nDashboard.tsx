'use client'

import { useState, useEffect } from 'react'
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
  const [stats, setStats] = useState<LangStat[]>([])
  const [totalKeys, setTotalKeys] = useState(0)
  const [loading, setLoading] = useState(true)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  )

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const headers: Record<string, string> = session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}
      const res = await fetch('/api/i18n/stats', { headers })
      if (res.ok) {
        const d = await res.json()
        setStats(d.stats ?? [])
        setTotalKeys(d.totalKeys ?? 0)
      }
      setLoading(false)
    }
    load()
  }, [supabase])

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

      {/* 언어별 번역 완료율 */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
          <h2 className="text-sm font-semibold text-gray-700">언어별 번역 현황</h2>
        </div>
        <div className="divide-y divide-gray-50">
          {stats.map(s => (
            <div key={s.lang_cd} className="px-4 py-3 flex items-center gap-4">
              <div className="w-20 shrink-0">
                <span className="text-xs font-mono text-gray-500">{s.lang_cd}</span>
                <p className="text-sm font-medium text-gray-800">{s.native_nm}</p>
              </div>
              <div className="flex-1">
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>{s.translated} / {s.total}건</span>
                  <span className={s.pct === 100 ? 'text-green-600 font-medium' : s.pct < 50 ? 'text-red-500' : 'text-yellow-600'}>
                    {s.pct}%
                  </span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${s.pct === 100 ? 'bg-green-500' : s.pct < 50 ? 'bg-red-400' : 'bg-yellow-400'}`}
                    style={{ width: `${s.pct}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
