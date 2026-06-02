'use client'
import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import type { StdWord } from '@/lib/da-types'
import WordDialog from './WordDialog'
import AuditPanel from './AuditPanel'

export default function WordTab() {
  const t = useTranslations('standards')
  const [rows, setRows] = useState<StdWord[]>([])
  const [q, setQ] = useState('')
  const [selected, setSelected] = useState<StdWord | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [auditOpen, setAuditOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<StdWord | null>(null)

  const load = useCallback(async () => {
    const r = await fetch(`/api/std-dic?type=0001&q=${encodeURIComponent(q)}`)
    setRows(await r.json())
  }, [q])

  useEffect(() => { load() }, [load])

  const del = async () => {
    if (!selected) return
    if (!confirm(`"${selected.DIC_LOG_NM}" 단어를 삭제하시겠습니까?`)) return
    const r = await fetch(`/api/std-dic/${selected.DIC_ID}`, { method: 'DELETE' })
    if (r.status === 409) {
      // TASK-012: 참조 용어 경고 (AC5)
      const data = await r.json()
      const termList = (data.usedBy as { DIC_LOG_NM: string }[])
        .map(t => `• ${t.DIC_LOG_NM}`).join('\n')
      alert(`${data.error}\n\n사용 용어 목록:\n${termList}`)
      return
    }
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
        <span className="text-sm text-gray-600">{t('searchLabel' as any)}</span>
        <input
          value={q} onChange={e => setQ(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && load()}
          placeholder={t('placeholder.word' as any)}
          className="border border-gray-300 rounded px-2 py-1 text-sm w-52 focus:outline-none focus:ring-1 focus:ring-blue-400"
        />
        <button onClick={load} className="px-3 py-1 bg-gray-200 rounded text-sm hover:bg-gray-300">{t('action.query' as any)}</button>
        <div className="ml-auto flex gap-2">
          <button onClick={() => setAuditOpen(true)} disabled={!selected}
            className="px-3 py-1 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-700 disabled:opacity-40">📋 {t('action.history' as any)}</button>
          <button onClick={openAdd}
            className="px-3 py-1 bg-[#1e3a5f] text-white rounded text-sm hover:bg-[#2a4f7f]">{t('action.add' as any)}</button>
          <button onClick={openEdit} disabled={!selected}
            className="px-3 py-1 bg-amber-500 text-white rounded text-sm hover:bg-amber-600 disabled:opacity-40">{t('action.edit' as any)}</button>
          <button onClick={del} disabled={!selected}
            className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600 disabled:opacity-40">{t('action.delete' as any)}</button>
        </div>
      </div>

      {/* 분할 레이아웃 */}
      <div className="flex flex-1 overflow-hidden">
        {/* 좌측: 리스트 */}
        <div className="flex-1 overflow-auto border-r">
          <div className="overflow-x-auto min-h-0">
          <table className="w-full min-w-[680px] text-xs border-collapse">
            <thead className="sticky top-0 bg-[#2c4a6e] text-white">
              <tr>
                {(['field.no','field.logicalName','field.physicalName','field.physicalFullName','field.category','field.physicalType','field.description'] as const).map(k => (
                  <th key={k} className="px-3 py-2 text-left font-medium border-r border-[#3a5a80] last:border-r-0">{t(k as any)}</th>
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
        </div>

        {/* 우측: 상세 패널 */}
        <div className="w-64 p-4 bg-gray-50 text-xs overflow-auto">
          {selected ? (
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-700 border-b pb-1">{t('tab.word')}</h3>
              {[
                [t('field.logicalName'), selected.DIC_LOG_NM],
                [t('field.physicalName'), selected.DIC_PHY_NM],
                [t('field.physicalFullName'), selected.DIC_PHY_FLL_NM],
                [t('field.category'), typeLabel(selected)],
                [t('field.physicalType'), selected.DATA_TYPE ?? '—'],
                [t('field.length'), selected.DATA_LEN != null ? `${selected.DATA_LEN}${selected.DATA_SCALE != null ? `.${selected.DATA_SCALE}` : ''}` : '—'],
                [t('field.domainLink'), selected.DOM_NM ?? (selected.DOM_USE_YN === 'Y' ? t('state.linked') : '—')],
              ].map(([k, v]) => (
                <div key={k as string}>
                  <div className="text-gray-400 text-[10px]">{k}</div>
                  <div className="text-gray-700 font-medium">{v}</div>
                </div>
              ))}
              <div>
                <div className="text-gray-400 text-[10px]">{t('field.description' as any)}</div>
                <div className="text-gray-600 text-[11px] leading-relaxed">{selected.DIC_DESC || '—'}</div>
              </div>
            </div>
          ) : (
            <div className="text-gray-400 text-center mt-8">{t('state.select' as any)}</div>
          )}
        </div>
      </div>

      <div className="px-3 py-1.5 bg-gray-100 border-t text-xs text-gray-500">
        {t('state.totalWords' as any, { n: rows.length })}
      </div>

      <WordDialog
        open={dialogOpen}
        initial={editTarget}
        onClose={() => setDialogOpen(false)}
        onSaved={load}
      />

      {auditOpen && selected && (
        <AuditPanel
          entityType="STD_DIC"
          entityId={selected.DIC_ID}
          entityNm={selected.DIC_LOG_NM}
          onClose={() => setAuditOpen(false)}
        />
      )}
    </div>
  )
}
