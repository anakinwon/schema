'use client'

import { useState, useEffect, useCallback } from 'react'
import { createBrowserClient } from '@supabase/ssr'

interface Lang {
  lang_cd: string
  lang_nm: string
  native_nm: string
  sort_ord: number
  use_yn: 'Y' | 'N'
}

export default function LangManager() {
  const [langs, setLangs] = useState<Lang[]>([])
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState<string | null>(null)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  )

  const authHeader = useCallback(async (): Promise<Record<string, string>> => {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}
  }, [supabase])

  const load = useCallback(async () => {
    const headers: Record<string, string> = await authHeader()
    const res = await fetch('/api/i18n/langs', { headers })
    if (res.ok) setLangs(await res.json())
    setLoading(false)
  }, [authHeader])

  useEffect(() => { load() }, [load])

  const toggleUseYn = async (lang_cd: string, current: 'Y' | 'N') => {
    setToggling(lang_cd)
    const headers = { ...await authHeader(), 'Content-Type': 'application/json' }
    await fetch(`/api/i18n/langs/${lang_cd}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ use_yn: current === 'Y' ? 'N' : 'Y' }),
    })
    await load()
    setToggling(null)
  }

  if (loading) return <div className="animate-pulse h-40 bg-gray-100 rounded" />

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-700">지원 언어 목록</h2>
        <span className="text-xs text-gray-400">{langs.filter(l => l.use_yn === 'Y').length}개 활성</span>
      </div>
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="px-4 py-2.5 text-left font-medium text-gray-600 w-16">코드</th>
            <th className="px-4 py-2.5 text-left font-medium text-gray-600">언어명</th>
            <th className="px-4 py-2.5 text-left font-medium text-gray-600">자국어명</th>
            <th className="px-4 py-2.5 text-center font-medium text-gray-600 w-20">순서</th>
            <th className="px-4 py-2.5 text-center font-medium text-gray-600 w-20">사용여부</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {langs.map(l => (
            <tr key={l.lang_cd} className={l.use_yn === 'N' ? 'opacity-50' : ''}>
              <td className="px-4 py-2.5 font-mono text-xs text-gray-500">{l.lang_cd}</td>
              <td className="px-4 py-2.5 text-gray-800">{l.lang_nm}</td>
              <td className="px-4 py-2.5 text-gray-600">{l.native_nm}</td>
              <td className="px-4 py-2.5 text-center text-gray-400 text-xs">{l.sort_ord}</td>
              <td className="px-4 py-2.5 text-center">
                <button
                  onClick={() => toggleUseYn(l.lang_cd, l.use_yn)}
                  disabled={toggling === l.lang_cd}
                  className={`px-2.5 py-0.5 rounded text-xs font-medium transition-colors disabled:opacity-50 ${
                    l.use_yn === 'Y'
                      ? 'bg-green-100 text-green-700 hover:bg-green-200'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  {toggling === l.lang_cd ? '...' : l.use_yn === 'Y' ? '활성' : '비활성'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
