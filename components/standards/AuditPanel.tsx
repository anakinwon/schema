'use client'
// TASK-009: Audit Trail — 변경 이력 조회 + diff UI
import { useEffect, useState } from 'react'

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

interface Props {
  entityType: 'STD_DIC' | 'STD_DOM'
  entityId:   string
  entityNm:   string
  onClose:    () => void
}

const ACTION_BADGE: Record<string, string> = {
  INSERT: 'bg-green-100 text-green-700',
  UPDATE: 'bg-amber-100 text-amber-700',
  DELETE: 'bg-red-100 text-red-700',
}

const ACTION_LABEL: Record<string, string> = {
  INSERT: '등록', UPDATE: '수정', DELETE: '삭제',
}

// 내부 시스템 컬럼 제외 (diff에 불필요한 필드)
const SKIP_FIELDS = new Set([
  'STD_AREA_ID','AVAL_END_DT','AVAL_ST_DT','STANDARD_YN','FORBID_YN',
  'DOM_NM_USE_YN','TERM_GBN_CD','SECURITY_YN','SORTED_TERM_COMP_IDS',
])

function parseSafe(s: string | null): Record<string, unknown> {
  if (!s) return {}
  try { return JSON.parse(s) } catch { return {} }
}

function DiffTable({ before, after }: { before: Record<string, unknown>; after: Record<string, unknown> }) {
  const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])]
    .filter(k => !SKIP_FIELDS.has(k))

  const changed = keys.filter(k => String(before[k] ?? '') !== String(after[k] ?? ''))
  const unchanged = keys.filter(k => !changed.includes(k))
  const display = [...changed, ...unchanged]

  if (display.length === 0) return <p className="text-xs text-gray-400 px-2">비교할 데이터가 없습니다</p>

  return (
    <table className="w-full text-xs border-collapse">
      <thead className="sticky top-0 bg-gray-100">
        <tr>
          <th className="px-3 py-1.5 text-left text-gray-500 font-medium border-b w-36">필드</th>
          <th className="px-3 py-1.5 text-left text-gray-500 font-medium border-b">이전 값</th>
          <th className="px-3 py-1.5 text-left text-gray-500 font-medium border-b">이후 값</th>
        </tr>
      </thead>
      <tbody>
        {display.map(k => {
          const isChanged = changed.includes(k)
          const bv = before[k] == null ? '—' : String(before[k])
          const av = after[k]  == null ? '—' : String(after[k])
          return (
            <tr key={k} className={isChanged ? 'bg-amber-50' : ''}>
              <td className={`px-3 py-1 font-mono border-b border-gray-100 ${isChanged ? 'font-semibold text-amber-700' : 'text-gray-400'}`}>
                {k}
              </td>
              <td className={`px-3 py-1 border-b border-gray-100 ${isChanged ? 'text-red-600 line-through opacity-70' : 'text-gray-500'}`}>
                {bv}
              </td>
              <td className={`px-3 py-1 border-b border-gray-100 ${isChanged ? 'text-green-700 font-medium' : 'text-gray-500'}`}>
                {av}
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

export default function AuditPanel({ entityType, entityId, entityNm, onClose }: Props) {
  const [logs, setLogs]         = useState<AuditLog[]>([])
  const [selected, setSelected] = useState<AuditLog | null>(null)
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/audit?entity=${entityType}&id=${entityId}&limit=50`)
      .then(r => r.json())
      .then(data => { setLogs(Array.isArray(data) ? data : []); setLoading(false) })
  }, [entityType, entityId])

  const before = selected ? parseSafe(selected.BEFORE_DATA) : {}
  const after  = selected ? parseSafe(selected.AFTER_DATA)  : {}

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col">

        {/* 헤더 */}
        <div className="px-6 py-4 border-b flex items-center gap-3 shrink-0">
          <span className="text-lg">📋</span>
          <div>
            <h2 className="text-base font-bold text-gray-800">변경 이력</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              <span className="font-mono text-gray-600">{entityNm}</span>
              &nbsp;·&nbsp;{entityType}&nbsp;·&nbsp;{logs.length}건
            </p>
          </div>
          <button onClick={onClose} className="ml-auto text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* 좌측: 이력 목록 */}
          <div className="w-72 border-r flex flex-col shrink-0">
            <div className="px-3 py-2 bg-gray-50 border-b text-[11px] font-semibold text-gray-500 sticky top-0">
              이력 목록
            </div>
            <div className="flex-1 overflow-auto">
              {loading ? (
                <div className="py-8 text-center text-xs text-gray-400 animate-pulse">로딩 중…</div>
              ) : logs.length === 0 ? (
                <div className="py-8 text-center text-xs text-gray-400">
                  변경 이력이 없습니다<br />
                  <span className="text-[10px]">등록·수정·삭제 후 이력이 쌓입니다</span>
                </div>
              ) : (
                logs.map(log => (
                  <button key={log.LOG_ID} type="button"
                    onClick={() => setSelected(log)}
                    className={`w-full text-left px-3 py-2.5 border-b border-gray-100 hover:bg-blue-50 transition-colors
                      ${selected?.LOG_ID === log.LOG_ID ? 'bg-blue-50 border-l-2 border-l-blue-400' : ''}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${ACTION_BADGE[log.ACTION_TYPE]}`}>
                        {ACTION_LABEL[log.ACTION_TYPE]}
                      </span>
                      <span className="text-[10px] text-gray-400">{log.CHANGED_BY}</span>
                    </div>
                    <div className="text-[11px] text-gray-600 font-mono">{log.CHANGED_AT}</div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* 우측: diff 뷰 */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {!selected ? (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-2">
                <span className="text-3xl">👈</span>
                <p className="text-sm">좌측 이력을 선택하면 변경 내용을 확인합니다</p>
              </div>
            ) : (
              <>
                <div className="px-4 py-2.5 border-b bg-gray-50 flex items-center gap-2 shrink-0">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${ACTION_BADGE[selected.ACTION_TYPE]}`}>
                    {ACTION_LABEL[selected.ACTION_TYPE]}
                  </span>
                  <span className="text-xs text-gray-600">{selected.CHANGED_AT}</span>
                  <span className="text-xs text-gray-400">by {selected.CHANGED_BY}</span>
                  {selected.ACTION_TYPE === 'UPDATE' && (
                    <span className="ml-auto text-[10px] text-amber-600">
                      ● 노란 배경 = 변경된 필드
                    </span>
                  )}
                </div>

                <div className="flex-1 overflow-auto">
                  {selected.ACTION_TYPE === 'INSERT' && (
                    <DiffTable before={{}} after={after} />
                  )}
                  {selected.ACTION_TYPE === 'UPDATE' && (
                    <DiffTable before={before} after={after} />
                  )}
                  {selected.ACTION_TYPE === 'DELETE' && (
                    <DiffTable before={before} after={{}} />
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
