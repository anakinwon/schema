'use client'
import { useState, useEffect } from 'react'
import type { StdDomain } from '@/lib/da-types'
import { DOM_TYPE_OPTIONS, DATA_TYPE_OPTIONS } from '@/lib/da-types'

interface Props {
  open: boolean
  initial?: StdDomain | null
  onClose: () => void
  onSaved: () => void
}

const empty = (): Partial<StdDomain> => ({
  KEY_DOM_PHY_NM: '', KEY_DOM_NM: '', DOM_NM: '',
  DOM_TYPE_CD: '0003', DATA_TYPE_CD: '0003',
  DATA_LEN: undefined, DATA_SCALE: undefined,
  DATA_FORMAT: '', DATA_MIN: '', DATA_MAX: '', DOM_DESC: '',
})

export default function DomainDialog({ open, initial, onClose, onSaved }: Props) {
  const [form, setForm] = useState<Partial<StdDomain>>(empty())
  const [autoName, setAutoName] = useState(false)
  const [dupStatus, setDupStatus] = useState<'idle' | 'ok' | 'dup'>('idle')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setForm(initial ? { ...initial } : empty())
    setAutoName(false)
    setDupStatus('idle')
  }, [initial, open])

  if (!open) return null

  const set = (k: keyof StdDomain, v: unknown) => {
    setForm(f => {
      const next = { ...f, [k]: v }
      if (autoName && k === 'KEY_DOM_NM') {
        next.DOM_NM = String(v) + '도메인'
      }
      return next
    })
  }

  const checkDup = async () => {
    if (!form.DOM_NM) return
    const r = await fetch(
      `/api/check-dup?table=dom&field=DOM_NM&value=${encodeURIComponent(form.DOM_NM)}&excludeId=${initial?.DOM_ID ?? ''}`
    )
    const { duplicate } = await r.json()
    setDupStatus(duplicate ? 'dup' : 'ok')
  }

  const save = async () => {
    if (!form.KEY_DOM_PHY_NM || !form.KEY_DOM_NM || !form.DOM_NM)
      return alert('대표도메인, 논리명, 도메인명은 필수입니다.')
    setSaving(true)
    const url = initial?.DOM_ID ? `/api/std-dom/${initial.DOM_ID}` : '/api/std-dom'
    const method = initial?.DOM_ID ? 'PUT' : 'POST'
    const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    setSaving(false)
    if (r.ok) { onSaved(); onClose() }
    else alert('저장 실패')
  }

  const DataTypeCD = form.DATA_TYPE_CD
  const showLen = DataTypeCD === '0003' || DataTypeCD === '0015'
  const showScale = DataTypeCD === '0015'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded shadow-xl w-[600px] border border-gray-300">
        <div className="flex items-center justify-between bg-[#1e3a5f] text-white px-4 py-2 rounded-t">
          <span className="text-sm font-semibold">📋 도메인 등록</span>
          <button onClick={onClose} className="text-white hover:text-gray-300 text-lg leading-none">×</button>
        </div>

        <div className="p-5 space-y-3 text-sm">
          {/* 자동생성 체크박스 */}
          <div className="flex justify-end">
            <label className="flex items-center gap-1 text-gray-600">
              <input type="checkbox" checked={autoName} onChange={e => setAutoName(e.target.checked)} />
              도메인명 자동생성
            </label>
          </div>

          {/* 표준분류 */}
          <div className="flex items-center gap-3">
            <label className="w-28 text-right text-gray-600 shrink-0">표준분류 :</label>
            <input value="쇼핑몰" readOnly className="flex-1 border border-gray-300 rounded px-2 py-1 bg-gray-50 text-gray-500" />
          </div>

          {/* 대표도메인 + 도메인명 */}
          <div className="flex items-center gap-3">
            <label className="w-28 text-right text-gray-600 shrink-0">대표 도메인 :</label>
            <input
              value={form.KEY_DOM_PHY_NM ?? ''}
              onChange={e => set('KEY_DOM_PHY_NM', e.target.value.toUpperCase())}
              placeholder="예: ADDR"
              className="flex-1 border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400 font-mono"
            />
          </div>
          <div className="flex items-center gap-3">
            <label className="w-28 text-right text-gray-600 shrink-0">논리명(키) :</label>
            <input
              value={form.KEY_DOM_NM ?? ''}
              onChange={e => set('KEY_DOM_NM', e.target.value)}
              placeholder="예: 주소"
              className="flex-1 border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
          </div>
          <div className="flex items-center gap-3">
            <label className="w-28 text-right text-gray-600 shrink-0">도메인명 :</label>
            <input
              value={form.DOM_NM ?? ''}
              onChange={e => { set('DOM_NM', e.target.value); setDupStatus('idle') }}
              placeholder="예: 주소도메인"
              className="flex-1 border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
            <button onClick={checkDup}
              className="px-3 py-1 bg-gray-100 border border-gray-300 rounded hover:bg-gray-200 whitespace-nowrap">
              중복확인
            </button>
            {dupStatus === 'ok' && <span className="text-green-600 text-xs">사용가능</span>}
            {dupStatus === 'dup' && <span className="text-red-500 text-xs">중복됨!</span>}
          </div>

          {/* 도메인유형 + 도메인그룹 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2">
              <label className="w-28 text-right text-gray-600 shrink-0">도메인유형 :</label>
              <select
                value={form.DOM_TYPE_CD ?? ''}
                onChange={e => set('DOM_TYPE_CD', e.target.value)}
                className="flex-1 border border-gray-300 rounded px-2 py-1 focus:outline-none"
              >
                {DOM_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-gray-600 shrink-0">도메인그룹 :</label>
              <input value="" readOnly placeholder="(미사용)" className="flex-1 border border-gray-300 rounded px-2 py-1 bg-gray-50 text-gray-400" />
            </div>
          </div>

          {/* 논리 데이터타입 + 데이터길이 */}
          <div className="flex items-center gap-3">
            <label className="w-28 text-right text-gray-600 shrink-0">논리 데이터타입 :</label>
            <select
              value={form.DATA_TYPE_CD ?? ''}
              onChange={e => set('DATA_TYPE_CD', e.target.value)}
              className="flex-1 border border-gray-300 rounded px-2 py-1 focus:outline-none"
            >
              {DATA_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            {showLen && (
              <>
                <label className="text-gray-600 shrink-0">데이터길이 :</label>
                <input
                  type="number" value={form.DATA_LEN ?? ''}
                  onChange={e => set('DATA_LEN', e.target.value ? +e.target.value : null)}
                  className="w-20 border border-gray-300 rounded px-2 py-1 focus:outline-none"
                />
                {showScale && (
                  <>
                    <span className="text-gray-400">.</span>
                    <input
                      type="number" value={form.DATA_SCALE ?? ''}
                      onChange={e => set('DATA_SCALE', e.target.value ? +e.target.value : null)}
                      className="w-16 border border-gray-300 rounded px-2 py-1 focus:outline-none"
                    />
                  </>
                )}
              </>
            )}
          </div>

          {/* 데이터범위 + 포맷 */}
          <div className="flex items-center gap-3">
            <label className="w-28 text-right text-gray-600 shrink-0">데이터 범위 :</label>
            <input type="text" value={form.DATA_MIN ?? ''} onChange={e => set('DATA_MIN', e.target.value)}
              className="w-24 border border-gray-300 rounded px-2 py-1 focus:outline-none" />
            <span className="text-gray-400">~</span>
            <input type="text" value={form.DATA_MAX ?? ''} onChange={e => set('DATA_MAX', e.target.value)}
              className="w-24 border border-gray-300 rounded px-2 py-1 focus:outline-none" />
            <label className="text-gray-600 shrink-0 ml-2">데이터 포맷 :</label>
            <input value={form.DATA_FORMAT ?? ''} onChange={e => set('DATA_FORMAT', e.target.value)}
              className="flex-1 border border-gray-300 rounded px-2 py-1 focus:outline-none" />
          </div>

          {/* 설명 */}
          <div className="flex items-start gap-3">
            <label className="w-28 text-right text-gray-600 shrink-0 pt-1">설 명 :</label>
            <textarea
              value={form.DOM_DESC ?? ''}
              onChange={e => set('DOM_DESC', e.target.value)}
              rows={4}
              className="flex-1 border border-gray-300 rounded px-2 py-1 resize-none focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 px-5 pb-4">
          <button onClick={save} disabled={saving}
            className="px-5 py-1.5 bg-[#1e3a5f] text-white rounded hover:bg-[#2a4f7f] disabled:opacity-50 text-sm">
            {saving ? '저장중…' : '등록'}
          </button>
          <button onClick={onClose}
            className="px-5 py-1.5 bg-gray-100 border border-gray-300 rounded hover:bg-gray-200 text-sm">
            닫기
          </button>
        </div>
      </div>
    </div>
  )
}
