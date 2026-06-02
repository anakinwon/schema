'use client'

import { useState, useEffect, useCallback } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { CountryFlag } from '@/components/i18n/CountryFlag'

interface CountryRow {
  country_cd: string
  dis_ord_seq: number
  country_eng_nm: string
  country_mot_nm: string
  currency_cd: string
  flag_emoji: string | null
  locale_cd: string | null
  registered: boolean
  use_yn: 'Y' | 'N' | null
  lang_nm: string | null
  native_nm: string | null
  sort_ord: number
}

export default function LangManager() {
  const [rows, setRows]         = useState<CountryRow[]>([])
  const [loading, setLoading]   = useState(true)
  const [working, setWorking]   = useState<string | null>(null)
  const [q, setQ]               = useState('')
  const [filter, setFilter]     = useState<'all' | 'active' | 'inactive'>('all')

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  )

  const authHeader = useCallback(async (): Promise<Record<string, string>> => {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}
  }, [supabase])

  const load = useCallback(async () => {
    const headers = await authHeader()
    const res = await fetch('/api/i18n/langs?view=all', { headers })
    if (res.ok) setRows(await res.json())
    setLoading(false)
  }, [authHeader])

  useEffect(() => { load() }, [load])

  // use_yn 토글 (이미 등록된 언어)
  const toggleUseYn = async (lang_cd: string, current: 'Y' | 'N') => {
    setWorking(lang_cd)
    const headers = { ...await authHeader(), 'Content-Type': 'application/json' }
    await fetch(`/api/i18n/langs/${lang_cd}`, {
      method: 'PUT', headers,
      body: JSON.stringify({ use_yn: current === 'Y' ? 'N' : 'Y' }),
    })
    await load()
    setWorking(null)
  }

  // 미등록 언어 → i18n_lang_mst에 추가 후 활성화
  const activateLang = async (row: CountryRow) => {
    if (!row.locale_cd) return
    setWorking(row.country_cd)
    const headers = { ...await authHeader(), 'Content-Type': 'application/json' }
    const res = await fetch('/api/i18n/langs', {
      method: 'POST', headers,
      body: JSON.stringify({
        lang_cd:   row.locale_cd,
        lang_nm:   row.country_eng_nm,
        native_nm: row.native_nm ?? row.country_mot_nm,
        country_cd: row.country_cd,
      }),
    })
    if (!res.ok) {
      const d = await res.json()
      alert(`추가 실패: ${d.error}`)
    }
    await load()
    setWorking(null)
  }

  // 필터 + 검색
  const filtered = rows.filter(r => {
    if (filter === 'active'   && !(r.registered && r.use_yn === 'Y')) return false
    if (filter === 'inactive' && r.registered)  return false
    if (q.trim()) {
      const kw = q.toLowerCase()
      return r.country_eng_nm.toLowerCase().includes(kw) ||
             (r.country_mot_nm ?? '').includes(kw) ||
             (r.locale_cd ?? '').toLowerCase().includes(kw) ||
             (r.currency_cd ?? '').toLowerCase().includes(kw)
    }
    return true
  })

  const activeCount   = rows.filter(r => r.registered && r.use_yn === 'Y').length
  const addableCount  = rows.filter(r => !r.registered && r.locale_cd).length

  if (loading) return <div className="animate-pulse h-40 bg-gray-100 rounded" />

  return (
    <div className="space-y-3">
      {/* 요약 + 컨트롤 */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1">
          {(['all', 'active', 'inactive'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-xs rounded border transition-colors ${
                filter === f
                  ? 'bg-[#1e3a5f] text-white border-[#1e3a5f]'
                  : 'border-gray-300 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {f === 'all' ? `전체 (${rows.length})` : f === 'active' ? `활성 (${activeCount})` : `추가 가능 (${addableCount})`}
            </button>
          ))}
        </div>
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="국가명·언어코드·통화 검색"
          className="px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-400 w-52"
        />
        <span className="text-xs text-gray-400">{filtered.length}개 표시</span>
      </div>

      {/* 목록 */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm table-fixed">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="w-10 px-3 py-2 text-center text-xs font-medium text-gray-500">#</th>
              <th className="w-12 px-2 py-2 text-center text-xs font-medium text-gray-500">국기</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">국가 / 언어</th>
              <th className="w-20 px-3 py-2 text-left text-xs font-medium text-gray-500 whitespace-nowrap">언어코드</th>
              <th className="w-16 px-3 py-2 text-left text-xs font-medium text-gray-500">통화</th>
              <th className="w-28 px-3 py-2 text-center text-xs font-medium text-gray-500">상태</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map(row => {
              const isBusy = working === row.country_cd || working === row.locale_cd
              return (
                <tr key={row.country_cd} className={`transition-colors ${row.registered && row.use_yn === 'Y' ? '' : 'opacity-70'}`}>
                  <td className="px-3 py-2 text-center text-xs text-gray-400">{row.dis_ord_seq}</td>
                  <td className="px-2 py-2">
                    <div className="flex justify-center">
                      <CountryFlag
                        countryCd={row.country_cd}
                        size="md"
                        grayscale={!(row.registered && row.use_yn === 'Y')}
                      />
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <div className="text-sm font-medium text-gray-800 truncate">{row.country_eng_nm}</div>
                    <div className="text-xs text-gray-400 truncate">{row.country_mot_nm}</div>
                  </td>
                  <td className="px-3 py-2">
                    {row.locale_cd
                      ? <span className="font-mono text-xs text-blue-600">{row.locale_cd}</span>
                      : <span className="text-xs text-gray-300">—</span>}
                  </td>
                  <td className="px-3 py-2 text-xs text-gray-500 font-mono">{row.currency_cd}</td>
                  <td className="px-3 py-2 text-center">
                    {row.registered ? (
                      /* 등록됨: 활성/비활성 토글 */
                      <button
                        onClick={() => toggleUseYn(row.locale_cd!, row.use_yn as 'Y' | 'N')}
                        disabled={isBusy}
                        className={`px-2.5 py-1 rounded text-xs font-medium transition-colors disabled:opacity-50 ${
                          row.use_yn === 'Y'
                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}
                      >
                        {isBusy ? '...' : row.use_yn === 'Y' ? '✅ 활성' : '⏸ 비활성'}
                      </button>
                    ) : row.locale_cd ? (
                      /* 미등록 + 언어코드 있음: 추가 버튼 */
                      <button
                        onClick={() => activateLang(row)}
                        disabled={isBusy}
                        className="px-2.5 py-1 rounded text-xs font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-colors disabled:opacity-50"
                      >
                        {isBusy ? '추가 중...' : '+ 언어 추가'}
                      </button>
                    ) : (
                      /* 언어코드 없음: 지원 불가 */
                      <span className="text-xs text-gray-300">지원 불가</span>
                    )}
                  </td>
                </tr>
              )
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="py-10 text-center text-sm text-gray-400">
                  검색 결과가 없습니다
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
