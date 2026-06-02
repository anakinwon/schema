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

const PAGE_SIZE = 50

const ACTION_BADGE: Record<string, string> = {
  INSERT: 'bg-green-100 text-green-700',
  UPDATE: 'bg-amber-100 text-amber-700',
  DELETE: 'bg-red-100 text-red-700',
}
const ACTION_LABEL: Record<string, string> = {
  INSERT: '등록', UPDATE: '수정', DELETE: '삭제',
}
const ENTITY_BADGE: Record<string, string> = {
  STD_DIC:      'bg-blue-50 text-blue-700',
  STD_DOM:      'bg-indigo-50 text-indigo-700',
  APPROVAL:     'bg-green-50 text-green-700',
  SYS_CODE_GRP: 'bg-orange-50 text-orange-700',
  SYS_CODE_VAL: 'bg-amber-50 text-amber-700',
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
  const [total, setTotal]       = useState(0)
  const [selected, setSelected] = useState<AuditLog | null>(null)
  const [loading, setLoading]   = useState(true)

  // 필터 상태 (변경 시 page 0으로 리셋)
  const [entity,   setEntity]   = useState('')
  const [action,   setAction]   = useState('')
  const [q,        setQ]        = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo,   setDateTo]   = useState('')
  const [page,     setPage]     = useState(0)

  // CSV 내보내기
  const [exporting, setExporting] = useState(false)

  // 보존 정책 (cleanup)
  const [showCleanup,    setShowCleanup]    = useState(false)
  const [retentionDays,  setRetentionDays]  = useState(90)
  const [cleaning,       setCleaning]       = useState(false)
  const [cleanResult,    setCleanResult]    = useState<{ deleted: number; days: number } | null>(null)

  const supabase = useMemo(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  ), [])

  const fetchLogs = useCallback(async (pg: number) => {
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    const headers: HeadersInit = session?.access_token
      ? { Authorization: `Bearer ${session.access_token}` }
      : {}

    const params = new URLSearchParams({
      limit:  String(PAGE_SIZE),
      offset: String(pg * PAGE_SIZE),
    })
    if (entity)       params.set('entity', entity)
    if (action)       params.set('action', action)
    if (q.trim())     params.set('q', q.trim())
    if (dateFrom)     params.set('from', dateFrom)
    if (dateTo)       params.set('to', dateTo)

    const res = await fetch(`/api/audit?${params}`, { headers })
    if (res.ok) {
      const cnt  = parseInt(res.headers.get('X-Total-Count') ?? '0', 10)
      const data = await res.json()
      setTotal(cnt)
      setLogs(Array.isArray(data) ? data : [])
    }
    setLoading(false)
  }, [supabase, entity, action, q, dateFrom, dateTo])

  useEffect(() => { fetchLogs(page) }, [fetchLogs, page])

  // 필터 변경 핸들러 — page를 0으로 리셋
  const changeEntity   = (v: string) => { setEntity(v);   setPage(0) }
  const changeAction   = (v: string) => { setAction(v);   setPage(0) }
  const changeQ        = (v: string) => { setQ(v);        setPage(0) }
  const changeDateFrom = (v: string) => { setDateFrom(v); setPage(0) }
  const changeDateTo   = (v: string) => { setDateTo(v);   setPage(0) }
  const resetFilters   = () => {
    setEntity(''); setAction(''); setQ(''); setDateFrom(''); setDateTo('')
    setPage(0)
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const hasFilter  = entity || action || q || dateFrom || dateTo

  // CSV 다운로드 — 현재 필터 조건 그대로 export API 호출
  const downloadCsv = async () => {
    setExporting(true)
    const { data: { session } } = await supabase.auth.getSession()
    const authHeader: HeadersInit = session?.access_token
      ? { Authorization: `Bearer ${session.access_token}` }
      : {}
    const params = new URLSearchParams()
    if (entity)   params.set('entity', entity)
    if (action)   params.set('action', action)
    if (q.trim()) params.set('q', q.trim())
    if (dateFrom) params.set('from', dateFrom)
    if (dateTo)   params.set('to', dateTo)

    const res = await fetch(`/api/audit/export?${params}`, { headers: authHeader })
    if (res.ok) {
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `audit_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.csv`
      a.click()
      URL.revokeObjectURL(url)
    }
    setExporting(false)
  }

  // 보존 정책 실행 — retentionDays 이전 이력 물리 삭제
  const runCleanup = async () => {
    setCleaning(true)
    setCleanResult(null)
    const res = await fetch(`/api/audit/cleanup?days=${retentionDays}`, { method: 'DELETE' })
    if (res.ok) {
      const data = await res.json()
      setCleanResult(data)
      setPage(0)
      fetchLogs(0)
    }
    setCleaning(false)
  }

  return (
    <div className="flex h-full">

      {/* ════════ 좌측: 필터 + 목록 + 페이지네이션 ════════ */}
      <div className="w-80 shrink-0 border-r flex flex-col">

        {/* 필터 패널 */}
        <div className="px-3 py-2 border-b bg-gray-50 space-y-1.5">
          {/* 엔터티 / 행위 */}
          <div className="flex gap-1.5">
            <select value={entity} onChange={e => changeEntity(e.target.value)}
              className="flex-1 border rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white">
              <option value="">전체 엔터티</option>
              <option value="STD_DIC">STD_DIC (표준단어)</option>
              <option value="STD_DOM">STD_DOM (표준도메인)</option>
              <option value="APPROVAL">APPROVAL (승인결정)</option>
              <option value="SYS_CODE_GRP">SYS_CODE_GRP (코드그룹)</option>
              <option value="SYS_CODE_VAL">SYS_CODE_VAL (코드값)</option>
            </select>
            <select value={action} onChange={e => changeAction(e.target.value)}
              className="w-20 border rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white">
              <option value="">전체</option>
              <option value="INSERT">등록</option>
              <option value="UPDATE">수정</option>
              <option value="DELETE">삭제</option>
            </select>
          </div>

          {/* 날짜 범위 */}
          <div className="flex items-center gap-1">
            <input type="date" value={dateFrom} onChange={e => changeDateFrom(e.target.value)}
              className="flex-1 border rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white" />
            <span className="text-gray-300 text-xs shrink-0">–</span>
            <input type="date" value={dateTo} onChange={e => changeDateTo(e.target.value)}
              className="flex-1 border rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white" />
          </div>

          {/* 검색어 */}
          <input value={q} onChange={e => changeQ(e.target.value)}
            placeholder="이름 / 변경자 / ID 검색"
            className="w-full border rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400" />

          {/* 카운트 + 버튼 */}
          <div className="flex items-center justify-between text-[11px] text-gray-400">
            <span>
              전체 <span className="font-medium text-gray-600">{total}</span>건
              {totalPages > 1 && <span className="ml-1">· {page + 1}/{totalPages}페이지</span>}
            </span>
            <div className="flex items-center gap-2">
              {hasFilter && (
                <button onClick={resetFilters} className="text-gray-400 hover:text-gray-600">
                  초기화
                </button>
              )}
              <button onClick={() => fetchLogs(page)} className="text-blue-500 hover:underline">
                새로고침
              </button>
            </div>
          </div>

          {/* 운영 도구: CSV 내보내기 + 보존 정책 */}
          <div className="flex items-center gap-1.5 pt-0.5 border-t border-gray-200">
            <button
              onClick={downloadCsv}
              disabled={exporting || total === 0}
              className="flex items-center gap-1 px-2 py-1 text-[11px] border border-gray-300 rounded hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              {exporting ? '…' : '↓'} CSV
            </button>
            <button
              onClick={() => { setShowCleanup(s => !s); setCleanResult(null) }}
              className={`flex items-center gap-1 px-2 py-1 text-[11px] border rounded transition-colors ${
                showCleanup
                  ? 'border-red-300 bg-red-50 text-red-600'
                  : 'border-gray-300 hover:bg-white text-gray-500'
              }`}>
              🗑 보존 정책
            </button>
          </div>

          {/* 보존 정책 패널 */}
          {showCleanup && (
            <div className="p-2 bg-red-50 border border-red-200 rounded space-y-1.5">
              <p className="text-[11px] text-red-700 font-medium">⚠ 지정 기간 이전 이력 영구 삭제 (ADMIN 전용)</p>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min={1}
                  value={retentionDays}
                  onChange={e => setRetentionDays(Math.max(1, +e.target.value))}
                  className="w-16 border border-red-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-red-400 bg-white" />
                <span className="text-[11px] text-red-600">일 이전 삭제</span>
                <button
                  onClick={runCleanup}
                  disabled={cleaning}
                  className="ml-auto px-2.5 py-1 text-[11px] bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 transition-colors">
                  {cleaning ? '처리 중…' : '실행'}
                </button>
              </div>
              {cleanResult && (
                <p className={`text-[11px] font-medium ${cleanResult.deleted > 0 ? 'text-green-700' : 'text-gray-500'}`}>
                  {cleanResult.deleted > 0
                    ? `✓ ${cleanResult.deleted}건 삭제 완료 (${cleanResult.days}일 이전)`
                    : `삭제할 이력이 없습니다 (${cleanResult.days}일 이전)`}
                </p>
              )}
            </div>
          )}
        </div>

        {/* 이력 목록 */}
        <div className="flex-1 overflow-auto divide-y divide-gray-100">
          {loading ? (
            <div className="py-10 text-center text-xs text-gray-400 animate-pulse">로딩 중…</div>
          ) : logs.length === 0 ? (
            <div className="py-10 text-center text-xs text-gray-400">이력이 없습니다</div>
          ) : logs.map(log => (
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

        {/* 페이지네이션 */}
        {totalPages > 1 && (
          <div className="px-3 py-2 border-t bg-gray-50 flex items-center justify-between shrink-0">
            <button
              disabled={page === 0}
              onClick={() => setPage(p => p - 1)}
              className="px-2.5 py-1 text-xs border rounded hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              ◀ 이전
            </button>
            <span className="text-[11px] text-gray-500 font-medium">
              {page + 1} / {totalPages}
            </span>
            <button
              disabled={page >= totalPages - 1}
              onClick={() => setPage(p => p + 1)}
              className="px-2.5 py-1 text-xs border rounded hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              다음 ▶
            </button>
          </div>
        )}
      </div>

      {/* ════════ 우측: Diff 뷰 ════════ */}
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
