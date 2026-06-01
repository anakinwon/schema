'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'

interface AuditLog {
  LOG_ID:      string
  ENTITY_TYPE: string
  ENTITY_ID:   string
  ENTITY_NM:   string | null
  ACTION_TYPE: 'INSERT' | 'UPDATE' | 'DELETE'
  BEFORE_DATA: string | null
  AFTER_DATA:  string | null
  CHANGED_BY:  string
  CHANGED_AT:  string
}

const ACTION_BADGE: Record<string, string> = {
  INSERT: 'bg-green-100 text-green-700',
  UPDATE: 'bg-amber-100 text-amber-700',
  DELETE: 'bg-red-100 text-red-700',
}
const ACTION_LABEL: Record<string, string> = {
  INSERT: '등록', UPDATE: '수정', DELETE: '삭제',
}
const ENTITY_BADGE: Record<string, string> = {
  STD_DIC: 'bg-blue-50 text-blue-700',
  STD_DOM: 'bg-indigo-50 text-indigo-700',
}

const SKIP_FIELDS = new Set([
  'STD_AREA_ID','AVAL_END_DT','AVAL_ST_DT','STANDARD_YN','FORBID_YN',
  'DOM_NM_USE_YN','TERM_GBN_CD','SECURITY_YN','SORTED_TERM_COMP_IDS',
])

function parseSafe(s: string | null): Record<string, unknown> {
  if (!s) return {}
  try { return JSON.parse(s) } catch { return {} }
}

function DiffView({ log }: { log: AuditLog }) {
  const before = parseSafe(log.BEFORE_DATA)
  const after  = parseSafe(log.AFTER_DATA)
  const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])]
    .filter(k => !SKIP_FIELDS.has(k))
  const changed   = keys.filter(k => String(before[k] ?? '') !== String(after[k] ?? ''))
  const unchanged = keys.filter(k => !changed.includes(k))

  return (
    <table className="w-full text-xs border-collapse">
      <thead className="bg-gray-100 sticky top-0">
        <tr>
          <th className="px-3 py-1.5 text-left text-gray-500 font-medium border-b w-40">필드</th>
          <th className="px-3 py-1.5 text-left text-gray-500 font-medium border-b">이전 값</th>
          <th className="px-3 py-1.5 text-left text-gray-500 font-medium border-b">이후 값</th>
        </tr>
      </thead>
      <tbody>
        {[...changed, ...unchanged].map(k => {
          const isChanged = changed.includes(k)
          return (
            <tr key={k} className={isChanged ? 'bg-amber-50' : ''}>
              <td className={`px-3 py-1 font-mono border-b border-gray-100 ${isChanged ? 'font-semibold text-amber-700' : 'text-gray-400'}`}>{k}</td>
              <td className={`px-3 py-1 border-b border-gray-100 ${isChanged ? 'text-red-500 line-through opacity-70' : 'text-gray-500'}`}>
                {before[k] == null ? '—' : String(before[k])}
              </td>
              <td className={`px-3 py-1 border-b border-gray-100 ${isChanged ? 'text-green-700 font-medium' : 'text-gray-500'}`}>
                {after[k] == null ? '—' : String(after[k])}
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

export default function AuditLogViewer() {
  const [logs, setLogs]         = useState<AuditLog[]>([])
  const [selected, setSelected] = useState<AuditLog | null>(null)
  const [loading, setLoading]   = useState(true)
  const [entity, setEntity]     = useState<string>('')
  const [action, setAction]     = useState<string>('')
  const [q, setQ]               = useState('')

  const supabase = useMemo(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  ), [])

  const load = useCallback(async () => {
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    const headers: HeadersInit = session?.access_token
      ? { Authorization: `Bearer ${session.access_token}` }
      : {}
    const params = new URLSearchParams({ limit: '200' })
    if (entity) params.set('entity', entity)
    const res = await fetch(`/api/audit?${params}`, { headers })
    if (res.ok) {
      const data = await res.json()
      setLogs(Array.isArray(data) ? data : [])
    }
    setLoading(false)
  }, [supabase, entity])

  useEffect(() => { load() }, [load])

  const filtered = logs.filter(l => {
    if (action && l.ACTION_TYPE !== action) return false
    if (q) {
      const kw = q.toLowerCase()
      return (
        (l.ENTITY_NM ?? '').toLowerCase().includes(kw) ||
        l.CHANGED_BY.toLowerCase().includes(kw) ||
        l.ENTITY_ID.toLowerCase().includes(kw)
      )
    }
    return true
  })

  return (
    <div className="flex h-full">
      {/* 좌측: 이력 목록 */}
      <div className="w-80 shrink-0 border-r flex flex-col">
        {/* 필터 */}
        <div className="px-3 py-2 border-b bg-gray-50 space-y-2">
          <div className="flex gap-2">
            <select value={entity} onChange={e => setEntity(e.target.value)}
              className="flex-1 border rounded px-2 py-1 text-xs focus:outline-none">
              <option value="">전체 엔터티</option>
              <option value="STD_DIC">STD_DIC (표준단어)</option>
              <option value="STD_DOM">STD_DOM (표준도메인)</option>
            </select>
            <select value={action} onChange={e => setAction(e.target.value)}
              className="flex-1 border rounded px-2 py-1 text-xs focus:outline-none">
              <option value="">전체 행위</option>
              <option value="INSERT">등록</option>
              <option value="UPDATE">수정</option>
              <option value="DELETE">삭제</option>
            </select>
          </div>
          <input value={q} onChange={e => setQ(e.target.value)}
            placeholder="이름 / 변경자 / ID 검색"
            className="w-full border rounded px-2 py-1 text-xs focus:outline-none" />
          <div className="flex items-center justify-between text-[11px] text-gray-400">
            <span>전체 {logs.length}건 · 표시 {filtered.length}건</span>
            <button onClick={load} className="text-blue-500 hover:underline">새로고침</button>
          </div>
        </div>

        {/* 목록 */}
        <div className="flex-1 overflow-auto divide-y divide-gray-100">
          {loading ? (
            <div className="py-10 text-center text-xs text-gray-400 animate-pulse">로딩 중…</div>
          ) : filtered.length === 0 ? (
            <div className="py-10 text-center text-xs text-gray-400">이력이 없습니다</div>
          ) : filtered.map(log => (
            <button key={log.LOG_ID} type="button"
              onClick={() => setSelected(log)}
              className={`w-full text-left px-3 py-2.5 hover:bg-blue-50 transition-colors
                ${selected?.LOG_ID === log.LOG_ID ? 'bg-blue-50 border-l-2 border-l-blue-500' : ''}`}>
              <div className="flex items-center gap-1.5 mb-1">
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${ACTION_BADGE[log.ACTION_TYPE]}`}>
                  {ACTION_LABEL[log.ACTION_TYPE]}
                </span>
                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${ENTITY_BADGE[log.ENTITY_TYPE] ?? 'bg-gray-100 text-gray-600'}`}>
                  {log.ENTITY_TYPE}
                </span>
              </div>
              <div className="text-xs font-medium text-gray-800 truncate">
                {log.ENTITY_NM ?? log.ENTITY_ID}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[11px] text-gray-400 font-mono">{log.CHANGED_AT}</span>
                <span className="text-[11px] text-gray-400">·</span>
                <span className="text-[11px] text-gray-500 truncate">{log.CHANGED_BY}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* 우측: diff 뷰 */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {!selected ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-2">
            <span className="text-4xl">📋</span>
            <p className="text-sm">좌측 이력을 선택하면 변경 내용을 확인합니다</p>
          </div>
        ) : (
          <>
            <div className="px-5 py-3 border-b bg-gray-50 flex items-center gap-2 shrink-0">
              <span className={`text-xs font-bold px-2 py-0.5 rounded ${ACTION_BADGE[selected.ACTION_TYPE]}`}>
                {ACTION_LABEL[selected.ACTION_TYPE]}
              </span>
              <span className={`text-xs font-mono px-2 py-0.5 rounded ${ENTITY_BADGE[selected.ENTITY_TYPE] ?? 'bg-gray-100'}`}>
                {selected.ENTITY_TYPE}
              </span>
              <span className="text-sm font-semibold text-gray-800">{selected.ENTITY_NM}</span>
              <div className="ml-auto flex items-center gap-3 text-xs text-gray-400">
                <span>{selected.CHANGED_AT}</span>
                <span>by <strong className="text-gray-600">{selected.CHANGED_BY}</strong></span>
              </div>
            </div>
            <div className="flex-1 overflow-auto">
              {selected.ACTION_TYPE === 'UPDATE' && (
                <div className="px-3 py-1.5 bg-amber-50 text-[11px] text-amber-700 border-b">
                  ● 노란 배경 = 변경된 필드
                </div>
              )}
              <DiffView log={selected} />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
