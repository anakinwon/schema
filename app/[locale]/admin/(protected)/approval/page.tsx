'use client'
// TASK-014: 승인 워크플로우 관리자 페이지
import { useState, useEffect, useCallback } from 'react'

interface ApvItem {
  apv_id:        string
  entity_type:   string
  entity_id:     string
  entity_nm:     string | null
  apv_status:    'PENDING' | 'APPROVED' | 'REJECTED'
  req_data:      Record<string, unknown> | null
  req_by:        string | null
  req_at:        string
  decided_by:    string | null
  decided_at:    string | null
  reject_reason: string | null
}

const STATUS_BADGE: Record<string, string> = {
  PENDING:  'bg-amber-100 text-amber-700 border-amber-200',
  APPROVED: 'bg-green-100 text-green-700 border-green-200',
  REJECTED: 'bg-red-100 text-red-700 border-red-200',
}
const STATUS_LABEL: Record<string, string> = {
  PENDING: '대기', APPROVED: '승인', REJECTED: '반려',
}

export default function ApprovalPage() {
  const [items, setItems]     = useState<ApvItem[]>([])
  const [filter, setFilter]   = useState<'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING')
  const [selected, setSelected] = useState<ApvItem | null>(null)
  const [reason, setReason]   = useState('')
  const [loading, setLoading] = useState(true)
  const [toast, setToast]     = useState('')

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  const load = useCallback(async () => {
    setLoading(true)
    const r = await fetch(`/api/approval?status=${filter}`)
    const data = await r.json()
    setItems(Array.isArray(data) ? data : [])
    setLoading(false)
  }, [filter])

  useEffect(() => { load() }, [load])

  const decide = async (apv_id: string, action: 'APPROVE' | 'REJECT') => {
    if (action === 'REJECT' && !reason.trim()) {
      return alert('반려 시 사유를 입력하세요')
    }
    const r = await fetch(`/api/approval/${apv_id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, reason }),
    })
    if (r.ok) {
      const data = await r.json()
      if (action === 'APPROVE') {
        showToast(data.applied ? '✅ 승인 완료 — DB 반영됨' : '✅ 승인 완료')
      } else {
        showToast('🚫 반려 완료')
      }
      setSelected(null); setReason(''); load()
    } else {
      const e = await r.json(); alert(e.error)
    }
  }

  const remove = async (apv_id: string) => {
    if (!confirm('승인 요청을 삭제하시겠습니까?')) return
    await fetch(`/api/approval/${apv_id}`, { method: 'DELETE' })
    if (selected?.apv_id === apv_id) setSelected(null)
    load()
  }

  return (
    <div className="flex flex-col h-[calc(100vh-56px)]">
      {/* 헤더 */}
      <div className="px-6 py-3 border-b bg-white flex items-center gap-3 shrink-0">
        <span className="text-lg">✅</span>
        <h1 className="text-sm font-bold text-gray-700">승인 워크플로우</h1>
        {toast && <span className="text-xs text-green-600 font-medium">{toast}</span>}

        {/* 상태 필터 탭 */}
        <div className="ml-auto flex gap-1">
          {(['PENDING', 'APPROVED', 'REJECTED'] as const).map(s => (
            <button key={s} onClick={() => setFilter(s)}
              className={`px-3 py-1 rounded text-xs font-medium border transition-colors
                ${filter === s ? STATUS_BADGE[s] : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}>
              {STATUS_LABEL[s]}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* 좌측: 요청 목록 */}
        <div className="w-80 border-r flex flex-col shrink-0">
          <div className="px-3 py-2 bg-gray-50 border-b text-[11px] font-semibold text-gray-500">
            {STATUS_LABEL[filter]} 목록 ({items.length}건)
          </div>
          <div className="flex-1 overflow-auto">
            {loading ? (
              <div className="py-8 text-center text-xs text-gray-400 animate-pulse">로딩 중…</div>
            ) : items.length === 0 ? (
              <div className="py-10 text-center text-xs text-gray-400">
                {STATUS_LABEL[filter]} 항목이 없습니다
              </div>
            ) : (
              items.map(item => (
                <button key={item.apv_id} type="button"
                  onClick={() => { setSelected(item); setReason('') }}
                  className={`w-full text-left px-4 py-3 border-b hover:bg-blue-50 transition-colors
                    ${selected?.apv_id === item.apv_id ? 'bg-blue-50 border-l-2 border-l-blue-500' : ''}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${STATUS_BADGE[item.apv_status]}`}>
                      {item.entity_type}
                    </span>
                    <span className="text-xs font-medium text-gray-800 truncate">{item.entity_nm ?? item.entity_id}</span>
                  </div>
                  <div className="text-[10px] text-gray-400">
                    요청: {item.req_by ?? 'UNKNOWN'} · {item.req_at.slice(0, 16)}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* 우측: 상세 + 결재 */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {!selected ? (
            <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
              좌측에서 항목을 선택하세요
            </div>
          ) : (
            <>
              <div className="px-6 py-4 border-b bg-gray-50 shrink-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${STATUS_BADGE[selected.apv_status]}`}>
                    {STATUS_LABEL[selected.apv_status]}
                  </span>
                  <span className="text-sm font-semibold text-gray-800">{selected.entity_nm ?? selected.entity_id}</span>
                </div>
                <div className="text-xs text-gray-500">
                  {selected.entity_type} · {selected.entity_id} · 요청자: {selected.req_by ?? 'UNKNOWN'}
                </div>
                <div className="text-xs text-gray-400 mt-0.5">요청일시: {selected.req_at}</div>
              </div>

              {/* 요청 데이터 */}
              <div className="flex-1 overflow-auto p-6">
                {selected.req_data && (
                  <div className="mb-6">
                    <h3 className="text-xs font-semibold text-gray-600 mb-2">요청 데이터</h3>
                    <table className="w-full text-xs border-collapse bg-white rounded-lg border border-gray-200 overflow-hidden">
                      <tbody>
                        {Object.entries(selected.req_data).map(([k, v]) => (
                          <tr key={k} className="border-b border-gray-100">
                            <td className="px-3 py-1.5 font-mono text-gray-500 bg-gray-50 w-40">{k}</td>
                            <td className="px-3 py-1.5 text-gray-700">{v == null ? '—' : String(v)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {selected.reject_reason && (
                  <div className="mb-4 px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
                    <div className="text-xs font-medium text-red-700">반려 사유</div>
                    <div className="text-xs text-red-600 mt-0.5">{selected.reject_reason}</div>
                  </div>
                )}

                {/* 결재 영역 (PENDING만) */}
                {selected.apv_status === 'PENDING' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">반려 사유 (반려 시 필수)</label>
                      <textarea
                        value={reason}
                        onChange={e => setReason(e.target.value)}
                        rows={3}
                        placeholder="반려 사유를 입력하세요..."
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs resize-none focus:outline-none focus:ring-1 focus:ring-blue-400"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => decide(selected.apv_id, 'APPROVE')}
                        className="flex-1 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700">
                        ✅ 승인
                      </button>
                      <button
                        onClick={() => decide(selected.apv_id, 'REJECT')}
                        className="flex-1 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600">
                        🚫 반려
                      </button>
                      <button
                        onClick={() => remove(selected.apv_id)}
                        className="px-4 py-2 border border-gray-300 text-gray-600 rounded-lg text-sm hover:bg-gray-50">
                        삭제
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
