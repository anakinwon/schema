'use client'
// TASK-013: Supabase 동기화 관리 페이지
import { useState, useEffect } from 'react'

interface SyncLog {
  id:           number
  entity_type:  string
  synced_count: number
  status:       string
  error_msg:    string | null
  synced_at:    string
}

interface SyncResult {
  entity:      string
  inserted:    number
  updated:     number
  errors:      number
  elapsed_ms:  number
}

export default function SyncPage() {
  const [logs, setLogs]         = useState<SyncLog[]>([])
  const [syncing, setSyncing]   = useState(false)
  const [results, setResults]   = useState<SyncResult[] | null>(null)
  const [toast, setToast]       = useState('')
  const [loading, setLoading]   = useState(true)

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 4000) }

  const loadLogs = async () => {
    const r = await fetch('/api/sync')
    const data = await r.json()
    setLogs(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  useEffect(() => { loadLogs() }, [])

  const runSync = async () => {
    setSyncing(true); setResults(null)
    const r = await fetch('/api/sync', { method: 'POST' })
    const data = await r.json()
    setSyncing(false)
    if (r.ok) {
      setResults(data.results)
      showToast(`✅ 동기화 완료 — 총 ${data.totalSynced}건`)
      loadLogs()
    } else {
      showToast(`❌ 동기화 실패: ${data.error}`)
    }
  }

  const lastSync = logs[0]

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <span className="text-2xl">🔄</span>
        <div>
          <h1 className="text-xl font-bold text-gray-800">Supabase 동기화</h1>
          <p className="text-xs text-gray-400 mt-0.5">SQLite(로컬 메타 DB) → Supabase PostgreSQL 단방향 동기화</p>
        </div>
        {toast && <span className="ml-auto text-sm font-medium text-green-600">{toast}</span>}
      </div>

      {/* 현황 카드 */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border p-4">
          <div className="text-xs text-gray-400 mb-1">최근 동기화</div>
          <div className="text-sm font-semibold text-gray-700">
            {lastSync ? lastSync.synced_at.slice(0, 16) : '없음'}
          </div>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <div className="text-xs text-gray-400 mb-1">최근 상태</div>
          <div className={`text-sm font-bold ${lastSync?.status === 'SUCCESS' ? 'text-green-600' : 'text-amber-600'}`}>
            {lastSync?.status ?? '—'}
          </div>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <div className="text-xs text-gray-400 mb-1">누적 이력</div>
          <div className="text-sm font-semibold text-gray-700">{logs.length}건</div>
        </div>
      </div>

      {/* 동기화 실행 */}
      <div className="bg-white rounded-xl border p-6 mb-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">전체 동기화 실행</h2>
        <p className="text-xs text-gray-500 mb-4">
          STD_DIC(표준단어·용어)와 STD_DOM(표준도메인) 전체를 Supabase의
          <code className="mx-1 px-1 bg-gray-100 rounded text-[11px]">std_dic_sync</code>,
          <code className="mx-1 px-1 bg-gray-100 rounded text-[11px]">std_dom_sync</code> 테이블로 upsert합니다.
        </p>
        <button onClick={runSync} disabled={syncing}
          className="px-6 py-2.5 bg-[#1e3a5f] text-white rounded-lg text-sm font-medium hover:bg-[#2a4f7f] disabled:opacity-60 flex items-center gap-2">
          {syncing ? (
            <><span className="animate-spin">⟳</span> 동기화 중…</>
          ) : '🔄 지금 동기화'}
        </button>

        {/* 실행 결과 */}
        {results && (
          <div className="mt-4 space-y-2">
            {results.map(r => (
              <div key={r.entity} className={`flex items-center gap-3 px-4 py-2.5 rounded-lg border ${r.errors === 0 ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
                <span className="text-sm font-mono font-bold text-gray-600">{r.entity}</span>
                <span className="text-xs text-gray-500">동기화 {r.inserted + r.updated}건</span>
                {r.errors > 0 && <span className="text-xs text-red-600">오류 {r.errors}건</span>}
                <span className="ml-auto text-xs text-gray-400">{r.elapsed_ms}ms</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 동기화 이력 */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="px-4 py-3 border-b bg-gray-50 flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-700">동기화 이력</span>
          <span className="text-xs text-gray-400">최근 20건</span>
        </div>
        {loading ? (
          <div className="py-8 text-center text-xs text-gray-400 animate-pulse">로딩 중…</div>
        ) : (
          <table className="w-full text-xs border-collapse">
            <thead className="bg-gray-50 border-b">
              <tr>
                {['일시', '대상', '건수', '상태', '오류'].map(h => (
                  <th key={h} className="px-4 py-2 text-left font-medium text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logs.map(log => (
                <tr key={log.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-2 font-mono text-gray-500">{log.synced_at.slice(0, 16)}</td>
                  <td className="px-4 py-2 font-medium">{log.entity_type}</td>
                  <td className="px-4 py-2 text-gray-600">{log.synced_count}건</td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${log.status === 'SUCCESS' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                      {log.status}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-red-500">{log.error_msg ?? '—'}</td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr><td colSpan={5} className="py-6 text-center text-gray-400">동기화 이력 없음</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
