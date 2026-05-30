'use client'
import { useState, useEffect, useCallback } from 'react'
import type { StdWord } from '@/lib/da-types'
import WordDialog from './WordDialog'

export default function WordTab() {
  const [rows, setRows] = useState<StdWord[]>([])
  const [q, setQ] = useState('')
  const [selected, setSelected] = useState<StdWord | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<StdWord | null>(null)

  const load = useCallback(async () => {
    const r = await fetch(`/api/std-dic?type=0001&q=${encodeURIComponent(q)}`)
    setRows(await r.json())
  }, [q])

  useEffect(() => { load() }, [load])

  const del = async () => {
    if (!selected) return
    if (!confirm(`"${selected.DIC_LOG_NM}" 단어를 삭제하시겠습니까?`)) return
    await fetch(`/api/std-dic/${selected.DIC_ID}`, { method: 'DELETE' })
    setSelected(null)
    load()
  }

  const openAdd = () => { setEditTarget(null); setDialogOpen(true) }
  const openEdit = () => { if (selected) { setEditTarget(selected); setDialogOpen(true) } }

  const typeLabel = (w: StdWord) => {
    if (w.ENT_CLSS_YN === 'Y' && w.ATTR_CLSS_YN === 'Y') return '엔터티/속성'
    if (w.ENT_CLSS_YN === 'Y') return '엔터티'
    if (w.ATTR_CLSS_YN === 'Y') return '속성(분류어)'
    return '기본어'
  }

  return (
    <div className="flex flex-col h-full">
      {/* 검색 바 */}
      <div className="flex items-center gap-2 p-3 border-b bg-gray-50">
        <span className="text-sm text-gray-600">검색:</span>
        <input
          value={q} onChange={e => setQ(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && load()}
          placeholder="논리명 / 물리명"
          className="border border-gray-300 rounded px-2 py-1 text-sm w-52 focus:outline-none focus:ring-1 focus:ring-blue-400"
        />
        <button onClick={load} className="px-3 py-1 bg-gray-200 rounded text-sm hover:bg-gray-300">조회</button>
        <div className="ml-auto flex gap-2">
          <button onClick={openAdd}
            className="px-3 py-1 bg-[#1e3a5f] text-white rounded text-sm hover:bg-[#2a4f7f]">+ 추가</button>
          <button onClick={openEdit} disabled={!selected}
            className="px-3 py-1 bg-amber-500 text-white rounded text-sm hover:bg-amber-600 disabled:opacity-40">수정</button>
          <button onClick={del} disabled={!selected}
            className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600 disabled:opacity-40">삭제</button>
        </div>
      </div>

      {/* 분할 레이아웃 */}
      <div className="flex flex-1 overflow-hidden">
        {/* 좌측: 리스트 */}
        <div className="flex-1 overflow-auto border-r">
          <table className="w-full text-xs border-collapse">
            <thead className="sticky top-0 bg-[#2c4a6e] text-white">
              <tr>
                {['번호','논리명','물리명','영문풀네임','분류','물리타입','설명'].map(h => (
                  <th key={h} className="px-3 py-2 text-left font-medium border-r border-[#3a5a80] last:border-r-0">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((w, i) => (
                <tr key={w.DIC_ID}
                  onClick={() => setSelected(w)}
                  className={`cursor-pointer border-b border-gray-200 hover:bg-blue-50
                    ${selected?.DIC_ID === w.DIC_ID ? 'bg-blue-100' : i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                >
                  <td className="px-3 py-1.5 text-gray-400 w-10">{i + 1}</td>
                  <td className="px-3 py-1.5 font-medium text-gray-800">{w.DIC_LOG_NM}</td>
                  <td className="px-3 py-1.5 font-mono text-blue-700">{w.DIC_PHY_NM}</td>
                  <td className="px-3 py-1.5 text-gray-500">{w.DIC_PHY_FLL_NM}</td>
                  <td className="px-3 py-1.5">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                      w.ATTR_CLSS_YN === 'Y' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                    }`}>{typeLabel(w)}</span>
                  </td>
                  <td className="px-3 py-1.5 font-mono text-purple-700 text-[11px]">
                    {w.DATA_TYPE ? `${w.DATA_TYPE}${w.DATA_LEN ? `(${w.DATA_LEN}${w.DATA_SCALE ? `,${w.DATA_SCALE}` : ''})` : ''}` : '—'}
                  </td>
                  <td className="px-3 py-1.5 text-gray-500 max-w-[200px] truncate">{w.DIC_DESC}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={7} className="text-center py-8 text-gray-400">데이터가 없습니다</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 우측: 상세 패널 */}
        <div className="w-64 p-4 bg-gray-50 text-xs overflow-auto">
          {selected ? (
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-700 border-b pb-1">단어 상세정보</h3>
              {[
                ['논리명', selected.DIC_LOG_NM],
                ['물리명', selected.DIC_PHY_NM],
                ['영문풀네임', selected.DIC_PHY_FLL_NM],
                ['분류', typeLabel(selected)],
                ['물리타입', selected.DATA_TYPE ?? '—'],
                ['길이', selected.DATA_LEN != null ? `${selected.DATA_LEN}${selected.DATA_SCALE != null ? `.${selected.DATA_SCALE}` : ''}` : '—'],
                ['도메인연결', selected.DOM_NM ?? (selected.DOM_USE_YN === 'Y' ? '연결됨' : '—')],
              ].map(([k, v]) => (
                <div key={k as string}>
                  <div className="text-gray-400 text-[10px]">{k}</div>
                  <div className="text-gray-700 font-medium">{v}</div>
                </div>
              ))}
              <div>
                <div className="text-gray-400 text-[10px]">설명</div>
                <div className="text-gray-600 text-[11px] leading-relaxed">{selected.DIC_DESC || '—'}</div>
              </div>
            </div>
          ) : (
            <div className="text-gray-400 text-center mt-8">항목을 선택하세요</div>
          )}
        </div>
      </div>

      <div className="px-3 py-1.5 bg-gray-100 border-t text-xs text-gray-500">
        총 {rows.length}개 단어
      </div>

      <WordDialog
        open={dialogOpen}
        initial={editTarget}
        onClose={() => setDialogOpen(false)}
        onSaved={load}
      />
    </div>
  )
}
