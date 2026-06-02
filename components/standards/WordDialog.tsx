'use client'
import { useState, useEffect } from 'react'
import type { StdWord } from '@/lib/da-types'

interface Props {
  open: boolean
  initial?: StdWord | null
  onClose: () => void
  onSaved: () => void
}

const empty = (): Partial<StdWord> => ({
  DIC_LOG_NM: '', DIC_PHY_NM: '', DIC_PHY_FLL_NM: '', DIC_DESC: '',
  ENT_CLSS_YN: 'N', ATTR_CLSS_YN: 'N', DATA_TYPE: '', DATA_LEN: undefined, DATA_SCALE: undefined,
  DIC_GBN_CD: '0001',
})

export default function WordDialog({ open, initial, onClose, onSaved }: Props) {
  const [form, setForm] = useState<Partial<StdWord>>(empty())
  const [dupStatus, setDupStatus] = useState<'idle' | 'ok' | 'dup'>('idle')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setForm(initial ? { ...initial } : empty())
    setDupStatus('idle')
  }, [initial, open])

  if (!open) return null

  const set = (k: keyof StdWord, v: unknown) =>
    setForm(f => ({ ...f, [k]: v }))

  const checkDup = async () => {
    if (!form.DIC_LOG_NM) return
    const r = await fetch(
      `/api/check-dup?table=dic&field=DIC_LOG_NM&value=${encodeURIComponent(form.DIC_LOG_NM)}&excludeId=${initial?.DIC_ID ?? ''}`
    )
    const { duplicate } = await r.json()
    setDupStatus(duplicate ? 'dup' : 'ok')
  }

  const isEdit = Boolean(initial?.DIC_ID)

  const save = async () => {
    if (!form.DIC_LOG_NM || !form.DIC_PHY_NM) return alert('논리명과 물리명은 필수입니다.')
    setSaving(true)
    const payload = { ...form, DIC_GBN_CD: '0001' }

    let r: Response
    if (isEdit) {
      // 수정: 직접 반영하지 않고 승인 큐에 등록
      r = await fetch('/api/approval', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entity_type: 'STD_DIC',
          entity_id:   initial!.DIC_ID,
          entity_nm:   form.DIC_LOG_NM,
          req_data:    payload,
        }),
      })
    } else {
      // 신규: 직접 등록
      r = await fetch('/api/std-dic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
    }

    setSaving(false)
    if (r.ok) {
      if (isEdit) alert('승인 요청이 등록되었습니다.\n관리자 승인 후 반영됩니다.')
      onSaved()
      onClose()
    } else {
      alert(isEdit ? '승인 요청 실패' : '저장 실패')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded shadow-xl w-[560px] border border-gray-300">
        {/* 헤더 */}
        <div className="flex items-center justify-between bg-[#1e3a5f] text-white px-4 py-2 rounded-t">
          <span className="text-sm font-semibold">
            {isEdit ? '✏️ 단어 수정 — 승인 요청' : '📋 단어등록'}
          </span>
          <button onClick={onClose} className="text-white hover:text-gray-300 text-lg leading-none">×</button>
        </div>
        {/* 수정 모드 안내 배너 */}
        {isEdit && (
          <div className="px-4 py-2 bg-amber-50 border-b border-amber-200 text-xs text-amber-700 flex items-center gap-1.5">
            <span>ℹ</span>
            <span>수정 내용은 관리자 승인 후 반영됩니다. 승인관리 메뉴에서 확인하세요.</span>
          </div>
        )}

        <div className="p-5 space-y-3 text-sm">
          {/* 표준분류 */}
          <div className="flex items-center gap-3">
            <label className="w-24 text-right text-gray-600 shrink-0">표준분류 :</label>
            <input value="쇼핑몰" readOnly className="flex-1 border border-gray-300 rounded px-2 py-1 bg-gray-50 text-gray-500" />
          </div>

          {/* 논리명 + 중복확인 */}
          <div className="flex items-center gap-3">
            <label className="w-24 text-right text-gray-600 shrink-0">논리명 :</label>
            <input
              value={form.DIC_LOG_NM ?? ''}
              onChange={e => { set('DIC_LOG_NM', e.target.value); setDupStatus('idle') }}
              className="flex-1 border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
            <button onClick={checkDup}
              className="px-3 py-1 bg-gray-100 border border-gray-300 rounded hover:bg-gray-200 whitespace-nowrap">
              중복확인
            </button>
            {dupStatus === 'ok' && <span className="text-green-600 text-xs">사용가능</span>}
            {dupStatus === 'dup' && <span className="text-red-500 text-xs">중복됨!</span>}
          </div>

          {/* 물리명 + 영문풀네임 */}
          <div className="flex items-center gap-3">
            <label className="w-24 text-right text-gray-600 shrink-0">물리명 :</label>
            <input
              value={form.DIC_PHY_NM ?? ''}
              onChange={e => set('DIC_PHY_NM', e.target.value)}
              className="flex-1 border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
          </div>
          <div className="flex items-center gap-3">
            <label className="w-24 text-right text-gray-600 shrink-0">영문풀네임 :</label>
            <input
              value={form.DIC_PHY_FLL_NM ?? ''}
              onChange={e => set('DIC_PHY_FLL_NM', e.target.value)}
              className="flex-1 border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
          </div>

          {/* 물리타입 (분류어 전용) */}
          <div className="flex items-center gap-3">
            <label className="w-24 text-right text-gray-600 shrink-0">물리타입 :</label>
            <select
              value={form.DATA_TYPE ?? ''}
              onChange={e => set('DATA_TYPE', e.target.value || null)}
              className="border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400"
            >
              <option value="">- 기본어 -</option>
              <option value="VARCHAR">VARCHAR</option>
              <option value="TEXT">TEXT</option>
              <option value="INTEGER">INTEGER</option>
              <option value="NUMERIC">NUMERIC</option>
              <option value="DATE">DATE</option>
              <option value="TIMESTAMPTZ">TIMESTAMPTZ</option>
            </select>
            {(form.DATA_TYPE === 'VARCHAR' || form.DATA_TYPE === 'NUMERIC') && (
              <>
                <input
                  type="number" placeholder="길이"
                  value={form.DATA_LEN ?? ''}
                  onChange={e => set('DATA_LEN', e.target.value ? +e.target.value : null)}
                  className="w-20 border border-gray-300 rounded px-2 py-1 focus:outline-none"
                />
                {form.DATA_TYPE === 'NUMERIC' && (
                  <>
                    <span className="text-gray-400">.</span>
                    <input
                      type="number" placeholder="소수"
                      value={form.DATA_SCALE ?? ''}
                      onChange={e => set('DATA_SCALE', e.target.value ? +e.target.value : null)}
                      className="w-16 border border-gray-300 rounded px-2 py-1 focus:outline-none"
                    />
                  </>
                )}
              </>
            )}
          </div>

          {/* 분류어 체크박스 */}
          <div className="flex items-center gap-3">
            <label className="w-24 text-right text-gray-600 shrink-0">분류어 :</label>
            <label className="flex items-center gap-1">
              <input type="checkbox"
                checked={form.ENT_CLSS_YN === 'Y'}
                onChange={e => set('ENT_CLSS_YN', e.target.checked ? 'Y' : 'N')}
              /> 엔터티
            </label>
            <label className="flex items-center gap-1">
              <input type="checkbox"
                checked={form.ATTR_CLSS_YN === 'Y'}
                onChange={e => set('ATTR_CLSS_YN', e.target.checked ? 'Y' : 'N')}
              /> 속성
            </label>
          </div>

          {/* 설명 */}
          <div className="flex items-start gap-3">
            <label className="w-24 text-right text-gray-600 shrink-0 pt-1">설 명 :</label>
            <textarea
              value={form.DIC_DESC ?? ''}
              onChange={e => set('DIC_DESC', e.target.value)}
              rows={4}
              className="flex-1 border border-gray-300 rounded px-2 py-1 resize-none focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
          </div>
        </div>

        {/* 푸터 */}
        <div className="flex justify-end gap-2 px-5 pb-4">
          <button onClick={save} disabled={saving}
            className={`px-5 py-1.5 text-white rounded disabled:opacity-50 text-sm transition-colors ${
              isEdit
                ? 'bg-amber-600 hover:bg-amber-700'
                : 'bg-[#1e3a5f] hover:bg-[#2a4f7f]'
            }`}>
            {saving ? (isEdit ? '요청 중…' : '저장중…') : (isEdit ? '승인 요청' : '등록')}
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
