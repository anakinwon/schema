'use client'
import { useState, useEffect, useCallback } from 'react'
import type { StdDomain } from '@/lib/da-types'
import { DOM_TYPE_OPTIONS, DATA_TYPE_LABEL } from '@/lib/da-types'
import DomainDialog from './DomainDialog'

export default function DomainTab() {
  const [rows, setRows] = useState<StdDomain[]>([])
  const [q, setQ] = useState('')
  const [selected, setSelected] = useState<StdDomain | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<StdDomain | null>(null)

  const load = useCallback(async () => {
    const r = await fetch(`/api/std-dom?q=${encodeURIComponent(q)}`)
    setRows(await r.json())
  }, [q])

  useEffect(() => { load() }, [load])

  const del = async () => {
    if (!selected) return
    if (!confirm(`"${selected.DOM_NM}" 도메인을 삭제하시겠습니까?`)) return
    await fetch(`/api/std-dom/${selected.DOM_ID}`, { method: 'DELETE' })
    setSelected(null)
    load()
  }

  const typeLabel = (cd?: string | null) =>
    DOM_TYPE_OPTIONS.find(o => o.value === cd)?.label ?? cd ?? '—'

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 p-3 border-b bg-gray-50">
        <span className="text-sm text-gray-600">검색:</span>
        <input
          value={q} onChange={e => setQ(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && load()}
          placeholder="도메인명 / 대표도메인"
          className="border border-gray-300 rounded px-2 py-1 text-sm w-52 focus:outline-none focus:ring-1 focus:ring-blue-400"
        />
        <button onClick={load} className="px-3 py-1 bg-gray-200 rounded text-sm hover:bg-gray-300">조회</button>
        <div className="ml-auto flex gap-2">
          <button onClick={() => { setEditTarget(null); setDialogOpen(true) }}
            className="px-3 py-1 bg-[#1e3a5f] text-white rounded text-sm hover:bg-[#2a4f7f]">+ 추가</button>
          <button onClick={() => { if (selected) { setEditTarget(selected); setDialogOpen(true) } }} disabled={!selected}
            className="px-3 py-1 bg-amber-500 text-white rounded text-sm hover:bg-amber-600 disabled:opacity-40">수정</button>
          <button onClick={del} disabled={!selected}
            className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600 disabled:opacity-40">삭제</button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-auto border-r">
          <table className="w-full text-xs border-collapse">
            <thead className="sticky top-0 bg-[#2c4a6e] text-white">
              <tr>
                {['번호','대표도메인','논리명','도메인명','도메인유형','논리타입','길이','물리타입(설명)'].map(h => (
                  <th key={h} className="px-3 py-2 text-left font-medium border-r border-[#3a5a80] last:border-r-0">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((d, i) => (
                <tr key={d.DOM_ID}
                  onClick={() => setSelected(d)}
                  className={`cursor-pointer border-b border-gray-200 hover:bg-blue-50
                    ${selected?.DOM_ID === d.DOM_ID ? 'bg-blue-100' : i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                >
                  <td className="px-3 py-1.5 text-gray-400 w-10">{i + 1}</td>
                  <td className="px-3 py-1.5 font-mono text-blue-700 font-semibold">{d.KEY_DOM_PHY_NM}</td>
                  <td className="px-3 py-1.5">{d.KEY_DOM_NM}</td>
                  <td className="px-3 py-1.5 font-medium text-gray-800">{d.DOM_NM}</td>
                  <td className="px-3 py-1.5">
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-indigo-100 text-indigo-700">
                      {typeLabel(d.DOM_TYPE_CD)}
                    </span>
                  </td>
                  <td className="px-3 py-1.5 font-mono text-purple-700">{DATA_TYPE_LABEL[d.DATA_TYPE_CD ?? ''] ?? d.DATA_TYPE_CD ?? '—'}</td>
                  <td className="px-3 py-1.5 text-center">
                    {d.DATA_LEN != null ? `${d.DATA_LEN}${d.DATA_SCALE != null ? `,${d.DATA_SCALE}` : ''}` : '—'}
                  </td>
                  <td className="px-3 py-1.5 text-gray-500 max-w-[200px] truncate text-[11px]">
                    {d.DOM_DESC?.replace('[물리타입] ', '') ?? '—'}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={8} className="text-center py-8 text-gray-400">데이터가 없습니다</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="w-64 p-4 bg-gray-50 text-xs overflow-auto">
          {selected ? (
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-700 border-b pb-1">도메인 상세정보</h3>
              {[
                ['대표도메인(물리)', selected.KEY_DOM_PHY_NM],
                ['논리명(키)', selected.KEY_DOM_NM],
                ['도메인명', selected.DOM_NM],
                ['도메인유형', typeLabel(selected.DOM_TYPE_CD)],
                ['논리 데이터타입', DATA_TYPE_LABEL[selected.DATA_TYPE_CD ?? ''] ?? selected.DATA_TYPE_CD ?? '—'],
                ['데이터길이', selected.DATA_LEN != null ? `${selected.DATA_LEN}${selected.DATA_SCALE != null ? `.${selected.DATA_SCALE}` : ''}` : '—'],
                ['데이터 포맷', selected.DATA_FORMAT ?? '—'],
                ['범위', selected.DATA_MIN || selected.DATA_MAX ? `${selected.DATA_MIN ?? ''} ~ ${selected.DATA_MAX ?? ''}` : '—'],
              ].map(([k, v]) => (
                <div key={k as string}>
                  <div className="text-gray-400 text-[10px]">{k}</div>
                  <div className="text-gray-700 font-medium">{v}</div>
                </div>
              ))}
              <div>
                <div className="text-gray-400 text-[10px]">설명(물리타입)</div>
                <div className="text-gray-600 text-[11px] leading-relaxed">
                  {selected.DOM_DESC?.replace('[물리타입] ', '') ?? '—'}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-gray-400 text-center mt-8">항목을 선택하세요</div>
          )}
        </div>
      </div>

      <div className="px-3 py-1.5 bg-gray-100 border-t text-xs text-gray-500">
        총 {rows.length}개 도메인
      </div>

      <DomainDialog
        open={dialogOpen}
        initial={editTarget}
        onClose={() => setDialogOpen(false)}
        onSaved={load}
      />
    </div>
  )
}
