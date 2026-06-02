'use client'

import { useState, useEffect, useCallback } from 'react'
import { createBrowserClient } from '@supabase/ssr'

interface Msg { msg_id: string; ns_cd: string; msg_key: string; lang_cd: string; msg_val: string }
interface Lang { lang_cd: string; native_nm: string; sort_ord: number }

const NS_LIST = ['common','auth','board','admin','profile','validation','languageSwitcher']

export default function MessageMatrix() {
  const [langs,    setLangs]    = useState<Lang[]>([])
  const [messages, setMessages] = useState<Msg[]>([])
  const [ns,       setNs]       = useState('board')
  const [loading,  setLoading]  = useState(true)
  const [editCell, setEditCell] = useState<string | null>(null)  // `${key}|${lang}`
  const [editVal,  setEditVal]  = useState('')
  const [saving,   setSaving]   = useState(false)
  const [q,        setQ]        = useState('')

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  )

  const authHeader = useCallback(async (): Promise<Record<string, string>> => {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}
  }, [supabase])

  const loadData = useCallback(async () => {
    setLoading(true)
    const headers = await authHeader()
    const [langRes, msgRes] = await Promise.all([
      fetch('/api/i18n/langs', { headers }),
      fetch(`/api/i18n/messages?ns_cd=${ns}`, { headers }),
    ])
    if (langRes.ok) setLangs(await langRes.json())
    if (msgRes.ok)  setMessages(await msgRes.json())
    setLoading(false)
  }, [authHeader, ns])

  useEffect(() => { loadData() }, [loadData])

  // 키 목록 (ko 기준 또는 전체)
  const allKeys = [...new Set(messages.map(m => m.msg_key))].sort()
  const filteredKeys = q ? allKeys.filter(k => k.includes(q)) : allKeys

  const getValue = (key: string, lang: string) =>
    messages.find(m => m.msg_key === key && m.lang_cd === lang)

  const startEdit = (key: string, lang: string) => {
    const msg = getValue(key, lang)
    setEditCell(`${key}|${lang}`)
    setEditVal(msg?.msg_val ?? '')
  }

  const saveEdit = async (key: string, lang: string) => {
    setSaving(true)
    const existing = getValue(key, lang)
    const headers = { ...await authHeader(), 'Content-Type': 'application/json' }

    if (existing) {
      await fetch(`/api/i18n/messages/${existing.msg_id}`, {
        method: 'PUT', headers, body: JSON.stringify({ msg_val: editVal }),
      })
    } else {
      await fetch('/api/i18n/messages', {
        method: 'POST', headers,
        body: JSON.stringify({ ns_cd: ns, msg_key: key, lang_cd: lang, msg_val: editVal }),
      })
    }
    setEditCell(null)
    setSaving(false)
    await loadData()
  }

  const activeLangs = langs.filter(l => l.lang_cd !== 'ko').sort((a, b) => a.sort_ord - b.sort_ord)

  return (
    <div className="space-y-3">
      {/* 컨트롤 */}
      <div className="flex flex-wrap gap-2 items-center">
        <select
          value={ns}
          onChange={e => { setNs(e.target.value); setQ('') }}
          className="px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-400"
        >
          {NS_LIST.map(n => <option key={n} value={n}>{n}</option>)}
        </select>
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="키 검색"
          className="px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-400 w-48"
        />
        <span className="text-xs text-gray-400">{filteredKeys.length}개 키</span>
      </div>

      {/* 매트릭스 */}
      <div className="overflow-x-auto rounded border border-gray-200 bg-white">
        {loading ? (
          <div className="p-8 text-center text-sm text-gray-400">로딩 중...</div>
        ) : (
          <table className="w-full text-xs table-fixed">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-gray-600 w-52 whitespace-nowrap">키</th>
                <th className="px-3 py-2 text-left font-medium text-gray-600 w-40 whitespace-nowrap">
                  ko (기준)
                </th>
                {activeLangs.map(l => (
                  <th key={l.lang_cd} className="px-3 py-2 text-left font-medium text-gray-600 w-36 whitespace-nowrap">
                    {l.lang_cd}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredKeys.map(key => {
                const koMsg = getValue(key, 'ko')
                return (
                  <tr key={key} className="hover:bg-gray-50/50">
                    <td className="px-3 py-2 font-mono text-gray-500 truncate">{key}</td>
                    <td className="px-3 py-2 text-gray-700 truncate">{koMsg?.msg_val ?? ''}</td>
                    {activeLangs.map(l => {
                      const msg = getValue(key, l.lang_cd)
                      const cellId = `${key}|${l.lang_cd}`
                      const isEditing = editCell === cellId
                      const missing = !msg?.msg_val

                      return (
                        <td
                          key={l.lang_cd}
                          className={`px-3 py-1.5 ${missing ? 'bg-red-50' : ''}`}
                        >
                          {isEditing ? (
                            <div className="flex gap-1">
                              <input
                                autoFocus
                                value={editVal}
                                onChange={e => setEditVal(e.target.value)}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') saveEdit(key, l.lang_cd)
                                  if (e.key === 'Escape') setEditCell(null)
                                }}
                                className="flex-1 px-1.5 py-0.5 border border-blue-400 rounded text-xs focus:outline-none"
                              />
                              <button
                                onClick={() => saveEdit(key, l.lang_cd)}
                                disabled={saving}
                                className="px-1.5 py-0.5 bg-blue-600 text-white rounded text-[10px] disabled:opacity-50"
                              >
                                {saving ? '...' : '저장'}
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => startEdit(key, l.lang_cd)}
                              className={`w-full text-left truncate text-xs rounded px-1 py-0.5 hover:bg-blue-50 transition-colors ${missing ? 'text-red-400 italic' : 'text-gray-700'}`}
                            >
                              {msg?.msg_val || '❌ 미번역'}
                            </button>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
              {filteredKeys.length === 0 && (
                <tr><td colSpan={activeLangs.length + 2} className="px-4 py-8 text-center text-gray-400">데이터 없음</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
