'use client'
import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import type { StdWord, StdDomain } from '@/lib/da-types'
import DdlExportDialog from './DdlExportDialog'
import AuditPanel from './AuditPanel'

interface TermRow extends StdWord {
  KEY_DOM_PHY_NM?: string
}

interface ComposedWord {
  DIC_ID: string
  DIC_LOG_NM: string
  DIC_PHY_NM: string
}

const emptyForm = () => ({
  DIC_LOG_NM: '',
  DIC_PHY_NM: '',
  DIC_PHY_FLL_NM: '',
  DOM_ID: '',
  DIC_DESC: '',
})

export default function TermTab() {
  const t = useTranslations('standards')
  const [terms, setTerms] = useState<TermRow[]>([])
  const [words, setWords] = useState<StdWord[]>([])
  const [domains, setDomains] = useState<StdDomain[]>([])
  const [q, setQ] = useState('')
  const [selected, setSelected] = useState<TermRow | null>(null)

  const [composed, setComposed] = useState<ComposedWord[]>([])
  const [domainId, setDomainId] = useState('')
  const [termDesc, setTermDesc] = useState('')
  const [saving, setSaving] = useState(false)
  const [isEdit, setIsEdit] = useState(false)
  const [ddlOpen, setDdlOpen] = useState(false)    // TASK-010
  const [auditOpen, setAuditOpen] = useState(false) // TASK-009

  const loadTerms = useCallback(async () => {
    const r = await fetch(`/api/std-dic?type=0002&q=${encodeURIComponent(q)}`)
    setTerms(await r.json())
  }, [q])

  useEffect(() => { loadTerms() }, [loadTerms])

  useEffect(() => {
    fetch('/api/std-dic?type=0001').then(r => r.json()).then(setWords)
    fetch('/api/std-dom').then(r => r.json()).then(setDomains)
  }, [])

  // 자동 물리명/논리명 생성
  const selectedDomain = domains.find(d => d.DOM_ID === domainId)
  const domainWord = selectedDomain
    ? { DIC_ID: selectedDomain.DIC_ID ?? '', DIC_LOG_NM: selectedDomain.KEY_DOM_NM, DIC_PHY_NM: selectedDomain.KEY_DOM_PHY_NM }
    : null

  const allParts = domainWord ? [...composed, domainWord] : composed
  const autoPhyNm = allParts.map(w => w.DIC_PHY_NM.toLowerCase()).join('_')
  const autoLogNm = allParts.map(w => w.DIC_LOG_NM).join('')

  const addWord = (word: StdWord) => {
    if (composed.find(c => c.DIC_ID === word.DIC_ID)) return
    // 도메인 단어(분류어)는 구성어로 추가 안 함 → 도메인 선택으로 처리
    if (word.DOM_USE_YN === 'Y') return
    setComposed(prev => [...prev, { DIC_ID: word.DIC_ID, DIC_LOG_NM: word.DIC_LOG_NM, DIC_PHY_NM: word.DIC_PHY_NM }])
  }

  const removeWord = (id: string) => setComposed(prev => prev.filter(w => w.DIC_ID !== id))

  const resetForm = () => {
    setComposed([]); setDomainId(''); setTermDesc(''); setIsEdit(false); setSelected(null)
  }

  const loadEdit = async (term: TermRow) => {
    setSelected(term)
    setIsEdit(true)
    setTermDesc(term.DIC_DESC ?? '')
    setDomainId(term.DOM_ID ?? '')
    // STORED_TERM_COMP_IDS로 구성 단어 복원
    if (term.STORED_TERM_COMP_IDS) {
      const ids = term.STORED_TERM_COMP_IDS.split(',').filter(Boolean)
      const domIdSet = new Set(domains.map(d => d.DIC_ID ?? ''))
      const wordMap = new Map(words.map(w => [w.DIC_ID, w]))
      const newComposed: ComposedWord[] = []
      for (const id of ids) {
        if (domIdSet.has(id)) continue  // 도메인 단어는 스킵
        const w = wordMap.get(id)
        if (w) newComposed.push({ DIC_ID: w.DIC_ID, DIC_LOG_NM: w.DIC_LOG_NM, DIC_PHY_NM: w.DIC_PHY_NM })
      }
      setComposed(newComposed)
    } else {
      setComposed([])
    }
  }

  const save = async () => {
    if (composed.length === 0 && !domainId) return alert('구성단어 또는 도메인을 선택하세요.')
    setSaving(true)

    const allIds = [
      ...composed.map(w => w.DIC_ID),
      ...(selectedDomain?.DIC_ID ? [selectedDomain.DIC_ID] : []),
    ]

    const payload = {
      DIC_GBN_CD: '0002',
      DIC_LOG_NM: autoLogNm,
      DIC_PHY_NM: autoPhyNm,
      DIC_PHY_FLL_NM: autoPhyNm.toUpperCase(),
      DIC_DESC: termDesc,
      DOM_ID: domainId || null,
      DOM_USE_YN: domainId ? 'Y' : 'N',
      STORED_TERM_COMP_IDS: allIds.join(','),
      SORTED_TERM_COMP_IDS: [...allIds].sort().join(','),
      wordIds: allIds,
    }

    const url = isEdit && selected ? `/api/std-dic/${selected.DIC_ID}` : '/api/std-dic'
    const method = isEdit && selected ? 'PUT' : 'POST'
    const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    setSaving(false)
    if (r.ok) { resetForm(); loadTerms() }
    else alert('저장 실패')
  }

  const del = async () => {
    if (!selected) return
    if (!confirm(`"${selected.DIC_LOG_NM}" 용어를 삭제하시겠습니까?`)) return
    await fetch(`/api/std-dic/${selected.DIC_ID}`, { method: 'DELETE' })
    resetForm()
    loadTerms()
  }

  // 기본어만 필터링 (구성어 선택용)
  const baseWords = words.filter(w => w.DOM_USE_YN !== 'Y')

  return (
    <div className="flex flex-col h-full">
      {/* 검색 바 */}
      <div className="flex items-center gap-2 p-3 border-b bg-gray-50">
        <span className="text-sm text-gray-600">{t('searchLabel' as any)}</span>
        <input value={q} onChange={e => setQ(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && loadTerms()}
          placeholder={t('placeholder.term' as any)}
          className="border border-gray-300 rounded px-2 py-1 text-sm w-52 focus:outline-none focus:ring-1 focus:ring-blue-400"
        />
        <button onClick={loadTerms} className="px-3 py-1 bg-gray-200 rounded text-sm hover:bg-gray-300">{t('action.query' as any)}</button>
        <div className="ml-auto flex gap-2">
          <button onClick={() => setAuditOpen(true)} disabled={!selected}
            className="px-3 py-1 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-700 disabled:opacity-40">📋 {t('action.history' as any)}</button>
          <button onClick={() => setDdlOpen(true)} disabled={terms.length === 0}
            className="px-3 py-1 bg-emerald-600 text-white rounded text-sm hover:bg-emerald-700 disabled:opacity-40">
            ⬇ {t('action.ddlExport' as any)}
          </button>
          <button onClick={resetForm} className="px-3 py-1 bg-[#1e3a5f] text-white rounded text-sm hover:bg-[#2a4f7f]">{t('action.new' as any)}</button>
          <button onClick={del} disabled={!selected}
            className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600 disabled:opacity-40">{t('action.delete' as any)}</button>
        </div>
      </div>

      {/* TASK-010: DDL Export 다이얼로그 */}
      {ddlOpen && <DdlExportDialog terms={terms} onClose={() => setDdlOpen(false)} />}

      {/* TASK-009: 변경이력 */}
      {auditOpen && selected && (
        <AuditPanel
          entityType="STD_DIC"
          entityId={selected.DIC_ID}
          entityNm={selected.DIC_LOG_NM}
          onClose={() => setAuditOpen(false)}
        />
      )}

      {/* 상단: 용어 리스트 */}
      <div className="flex-1 overflow-auto border-b" style={{ maxHeight: '45%' }}>
        <div className="overflow-x-auto min-h-0">
        <table className="w-full min-w-[600px] text-xs border-collapse">
          <thead className="sticky top-0 bg-[#2c4a6e] text-white">
            <tr>
              {(['field.no','field.logicalTermName','field.physicalTermName','field.domain','field.description'] as const).map(k => (
                <th key={k} className="px-3 py-2 text-left font-medium border-r border-[#3a5a80] last:border-r-0">{t(k as any)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {terms.map((t, i) => (
              <tr key={t.DIC_ID}
                onClick={() => loadEdit(t)}
                className={`cursor-pointer border-b border-gray-200 hover:bg-blue-50
                  ${selected?.DIC_ID === t.DIC_ID ? 'bg-blue-100' : i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
              >
                <td className="px-3 py-1.5 text-gray-400 w-10">{i + 1}</td>
                <td className="px-3 py-1.5 font-medium">{t.DIC_LOG_NM}</td>
                <td className="px-3 py-1.5 font-mono text-blue-700">{t.DIC_PHY_NM}</td>
                <td className="px-3 py-1.5 text-purple-600">{t.DOM_NM ?? '—'}</td>
                <td className="px-3 py-1.5 text-gray-500 max-w-[250px] truncate">{t.DIC_DESC}</td>
              </tr>
            ))}
            {terms.length === 0 && (
              <tr><td colSpan={5} className="text-center py-6 text-gray-400">{t('state.noTerms' as any)}</td></tr>
            )}
          </tbody>
        </table>
        </div>
      </div>

      {/* 하단: 용어 등록 폼 */}
      <div className="p-4 bg-gray-50 border-t text-sm overflow-auto" style={{ minHeight: '55%' }}>
        <h3 className="font-semibold text-gray-700 mb-3 text-xs border-b pb-1">
          {isEdit ? `✏️ ${t('term.editMode' as any)}` : `➕ ${t('term.addMode' as any)}`} — {t('term.infoSection' as any)}
        </h3>

        <div className="grid grid-cols-2 gap-4">
          {/* 좌측: 구성 */}
          <div className="space-y-3">
            <div>
              <div className="text-xs text-gray-500 mb-1 font-medium">{t('term.baseWordSelect' as any)}</div>
              <div className="flex flex-wrap gap-1 border rounded p-2 bg-white min-h-[60px] max-h-[80px] overflow-y-auto">
                {baseWords.map(w => (
                  <button key={w.DIC_ID} onClick={() => addWord(w)}
                    className="px-2 py-0.5 text-[11px] bg-gray-100 hover:bg-blue-100 rounded border border-gray-300 hover:border-blue-400 font-mono">
                    {w.DIC_PHY_NM}
                    <span className="ml-1 text-gray-400">({w.DIC_LOG_NM})</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="text-xs text-gray-500 mb-1 font-medium">{t('term.compositionInfo' as any)}</div>
              <div className="flex flex-wrap gap-1 border rounded p-2 bg-white min-h-[40px]">
                {composed.length === 0 && <span className="text-gray-300 text-xs">{t('term.selectBaseWord' as any)}</span>}
                {composed.map((w, i) => (
                  <span key={w.DIC_ID}
                    className="flex items-center gap-1 px-2 py-0.5 text-[11px] bg-blue-50 border border-blue-300 rounded font-mono">
                    <span className="text-gray-400 text-[10px]">{i + 1}.</span>
                    {w.DIC_PHY_NM}
                    <button onClick={() => removeWord(w.DIC_ID)} className="text-red-400 hover:text-red-600 ml-0.5">×</button>
                  </span>
                ))}
                {domainWord && (
                  <span className="flex items-center gap-1 px-2 py-0.5 text-[11px] bg-purple-50 border border-purple-300 rounded font-mono">
                    <span className="text-purple-400 text-[10px]">도메인</span>
                    {domainWord.DIC_PHY_NM}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-500 w-20 shrink-0">{t('field.domain' as any)} :</label>
              <select value={domainId} onChange={e => setDomainId(e.target.value)}
                className="flex-1 border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400">
                <option value="">{t('term.domainSelectPlaceholder' as any)}</option>
                {domains.map(d => (
                  <option key={d.DOM_ID} value={d.DOM_ID}>{d.DOM_NM} ({d.KEY_DOM_PHY_NM})</option>
                ))}
              </select>
            </div>
          </div>

          {/* 우측: 자동생성 결과 + 설명 */}
          <div className="space-y-3">
            <div>
              <div className="text-xs text-gray-500 mb-1 font-medium">{t('term.autoLogicalName' as any)}</div>
              <input value={autoLogNm} readOnly
                className="w-full border border-gray-300 rounded px-2 py-1 text-xs bg-gray-100 text-gray-700 font-medium" />
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1 font-medium">{t('term.autoPhysicalName' as any)}</div>
              <input value={autoPhyNm} readOnly
                className="w-full border border-gray-300 rounded px-2 py-1 text-xs bg-gray-100 font-mono text-blue-700" />
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1 font-medium">{t('term.termDesc' as any)}</div>
              <textarea value={termDesc} onChange={e => setTermDesc(e.target.value)} rows={4}
                className="w-full border border-gray-300 rounded px-2 py-1 text-xs resize-none focus:outline-none focus:ring-1 focus:ring-blue-400" />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button onClick={resetForm}
                className="px-4 py-1.5 bg-gray-200 border border-gray-300 rounded text-xs hover:bg-gray-300">{t('action.reset' as any)}</button>
              <button onClick={save} disabled={saving}
                className="px-5 py-1.5 bg-[#1e3a5f] text-white rounded text-xs hover:bg-[#2a4f7f] disabled:opacity-50">
                {saving ? t('term.saving' as any) : (isEdit ? t('action.editSave' as any) : t('action.save' as any))}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="px-3 py-1.5 bg-gray-100 border-t text-xs text-gray-500">
        {(t as any)('state.totalTerms', { n: terms.length })}
      </div>
    </div>
  )
}
