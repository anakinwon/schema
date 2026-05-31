'use client'
// TASK-010: DDL Export 다이얼로그
import { useState } from 'react'
import type { StdWord } from '@/lib/da-types'

interface Props {
  terms: StdWord[]
  onClose: () => void
}

type Dbms = 'postgresql' | 'mysql'

export default function DdlExportDialog({ terms, onClose }: Props) {
  const [tableName, setTableName] = useState('')
  const [dbms, setDbms] = useState<Dbms>('postgresql')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(terms.map(t => t.DIC_ID)))
  const [ddl, setDdl] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  const toggleTerm = (id: string) =>
    setSelectedIds(prev => {
      const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next
    })

  const generate = async () => {
    if (!tableName.trim()) return setError('테이블명을 입력하세요')
    if (selectedIds.size === 0) return setError('용어를 1개 이상 선택하세요')
    setError(''); setLoading(true)
    const r = await fetch('/api/ddl/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tableName: tableName.trim(), termIds: [...selectedIds], dbms }),
    })
    const data = await r.json()
    if (!r.ok) { setError(data.error); setLoading(false); return }
    setDdl(data.ddl); setLoading(false)
  }

  const copy = async () => {
    await navigator.clipboard.writeText(ddl)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  const download = () => {
    const ext = dbms === 'postgresql' ? 'pgsql' : 'sql'
    const blob = new Blob([ddl], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url
    a.download = `${tableName}_${dbms}.${ext}`; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">

        {/* 헤더 */}
        <div className="px-6 py-4 border-b flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-base font-bold text-gray-800">DDL Export</h2>
            <p className="text-xs text-gray-400 mt-0.5">선택한 용어를 기반으로 CREATE TABLE 스크립트를 생성합니다</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* 좌측: 설정 + 용어 선택 */}
          <div className="w-72 border-r flex flex-col shrink-0">
            <div className="p-4 space-y-3 border-b">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">테이블명</label>
                <input value={tableName} onChange={e => setTableName(e.target.value)}
                  placeholder="예: USER_INFO"
                  className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-blue-400" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">DBMS</label>
                <div className="flex gap-2">
                  {(['postgresql', 'mysql'] as Dbms[]).map(d => (
                    <button key={d} type="button" onClick={() => setDbms(d)}
                      className={`flex-1 py-1.5 rounded text-xs font-medium border transition-colors
                        ${dbms === d ? 'bg-[#1e3a5f] text-white border-[#1e3a5f]' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}>
                      {d === 'postgresql' ? 'PostgreSQL' : 'MySQL'}
                    </button>
                  ))}
                </div>
              </div>
              <button onClick={generate} disabled={loading}
                className="w-full py-2 bg-[#1e3a5f] text-white rounded text-sm font-medium hover:bg-[#2a4f7f] disabled:opacity-60">
                {loading ? '생성 중…' : '🛠 DDL 생성'}
              </button>
              {error && <p className="text-xs text-red-500">{error}</p>}
            </div>

            {/* 용어 선택 목록 */}
            <div className="flex-1 overflow-auto">
              <div className="px-3 py-2 bg-gray-50 border-b flex items-center justify-between sticky top-0">
                <span className="text-[11px] font-semibold text-gray-500">용어 선택</span>
                <span className="text-[10px] text-gray-400">{selectedIds.size}/{terms.length}</span>
              </div>
              {terms.map((t, i) => (
                <label key={t.DIC_ID}
                  className={`flex items-start gap-2 px-3 py-2 cursor-pointer border-b border-gray-100
                    ${selectedIds.has(t.DIC_ID) ? 'bg-blue-50' : i % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50`}>
                  <input type="checkbox" checked={selectedIds.has(t.DIC_ID)}
                    onChange={() => toggleTerm(t.DIC_ID)}
                    className="mt-0.5 accent-blue-600" />
                  <div className="min-w-0">
                    <div className="text-xs font-medium text-gray-800 truncate">{t.DIC_LOG_NM}</div>
                    <div className="text-[10px] text-gray-400 font-mono truncate">{t.DIC_PHY_FLL_NM}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* 우측: DDL 미리보기 */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="px-4 py-2.5 border-b bg-gray-50 flex items-center gap-2 shrink-0">
              <span className="text-xs font-semibold text-gray-600">DDL 미리보기</span>
              {ddl && (
                <>
                  <button onClick={copy}
                    className={`ml-auto px-3 py-1 text-xs rounded border transition-colors
                      ${copied ? 'bg-green-100 text-green-700 border-green-300' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}>
                    {copied ? '✓ 복사됨' : '📋 복사'}
                  </button>
                  <button onClick={download}
                    className="px-3 py-1 text-xs rounded border bg-white text-gray-600 border-gray-300 hover:bg-gray-50">
                    ⬇ 다운로드
                  </button>
                </>
              )}
            </div>
            <div className="flex-1 overflow-auto p-4">
              {ddl ? (
                <pre className="text-[12px] font-mono text-gray-700 leading-relaxed whitespace-pre-wrap bg-gray-50 rounded-lg p-4 border border-gray-200">
                  {ddl}
                </pre>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-2">
                  <span className="text-3xl">📄</span>
                  <p className="text-sm">좌측에서 설정 후 "DDL 생성" 버튼을 클릭하세요</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
