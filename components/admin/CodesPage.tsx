'use client'

import { useCallback, useEffect, useState } from 'react'

// ── 타입 ────────────────────────────────────────────────────
interface CodeGroup {
  CODE_GRP_ID: string
  CODE_GRP_NM: string
  CODE_GRP_DESC: string | null
  USE_YN: string
  SORT_SN: number
  CODE_CNT: number
}

interface CodeValue {
  CODE_GRP_ID: string
  CODE_VAL: string
  CODE_VAL_NM: string
  CODE_VAL_ENG: string | null
  CODE_VAL_DESC: string | null
  USE_YN: string
  SORT_SN: number
  REG_USR_ID: string | null
  REG_DT: string | null
  MOD_USR_ID: string | null
  MOD_DT: string | null
}

type GrpForm = { CODE_GRP_ID: string; CODE_GRP_NM: string; CODE_GRP_DESC: string; SORT_SN: string }
type CodeForm = { CODE_VAL: string; CODE_VAL_NM: string; CODE_VAL_ENG: string; CODE_VAL_DESC: string; SORT_SN: string }

const EMPTY_GRP: GrpForm  = { CODE_GRP_ID: '', CODE_GRP_NM: '', CODE_GRP_DESC: '', SORT_SN: '0' }
const EMPTY_CODE: CodeForm = { CODE_VAL: '', CODE_VAL_NM: '', CODE_VAL_ENG: '', CODE_VAL_DESC: '', SORT_SN: '0' }

// ── 컴포넌트 ────────────────────────────────────────────────
export default function CodesPage() {
  const [groups, setGroups]       = useState<CodeGroup[]>([])
  const [selected, setSelected]   = useState<CodeGroup | null>(null)
  const [codes, setCodes]         = useState<CodeValue[]>([])
  const [showInactive, setShowInactive] = useState(false)

  // 그룹 폼
  const [showGrpForm, setShowGrpForm] = useState(false)
  const [editGrp, setEditGrp]         = useState<CodeGroup | null>(null)
  const [grpForm, setGrpForm]         = useState<GrpForm>(EMPTY_GRP)

  // 코드값 폼
  const [showCodeForm, setShowCodeForm] = useState(false)
  const [editCode, setEditCode]         = useState<CodeValue | null>(null)
  const [codeForm, setCodeForm]         = useState<CodeForm>(EMPTY_CODE)

  const [busy, setBusy] = useState(false)
  const [err, setErr]   = useState('')

  // ── 데이터 로드 ─────────────────────────────────────────
  const loadGroups = useCallback(async () => {
    const res = await fetch('/api/codes')
    if (res.ok) setGroups(await res.json())
  }, [])

  const loadCodes = useCallback(async (grpId: string) => {
    const res = await fetch(`/api/codes/${grpId}`)
    if (res.ok) setCodes(await res.json())
  }, [])

  useEffect(() => { loadGroups() }, [loadGroups])

  const handleSelectGroup = (grp: CodeGroup) => {
    setSelected(grp)
    loadCodes(grp.CODE_GRP_ID)
    setShowCodeForm(false)
    setEditCode(null)
  }

  // ── 코드 그룹 CRUD ──────────────────────────────────────
  const openNewGrp = () => {
    setEditGrp(null)
    setGrpForm(EMPTY_GRP)
    setShowGrpForm(true)
    setErr('')
  }

  const openEditGrp = (grp: CodeGroup) => {
    setEditGrp(grp)
    setGrpForm({
      CODE_GRP_ID:   grp.CODE_GRP_ID,
      CODE_GRP_NM:   grp.CODE_GRP_NM,
      CODE_GRP_DESC: grp.CODE_GRP_DESC ?? '',
      SORT_SN:       String(grp.SORT_SN),
    })
    setShowGrpForm(true)
    setErr('')
  }

  const saveGrp = async () => {
    setBusy(true); setErr('')
    const isEdit = !!editGrp
    const res = await fetch('/api/codes', {
      method: isEdit ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...grpForm, SORT_SN: Number(grpForm.SORT_SN) }),
    })
    setBusy(false)
    if (!res.ok) { setErr((await res.json()).error); return }
    setShowGrpForm(false)
    loadGroups()
  }

  const toggleGrpUseYn = async (grp: CodeGroup) => {
    await fetch('/api/codes', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ CODE_GRP_ID: grp.CODE_GRP_ID, USE_YN: grp.USE_YN === 'Y' ? 'N' : 'Y' }),
    })
    loadGroups()
    if (selected?.CODE_GRP_ID === grp.CODE_GRP_ID) {
      setSelected({ ...grp, USE_YN: grp.USE_YN === 'Y' ? 'N' : 'Y' })
    }
  }

  // ── 코드값 CRUD ─────────────────────────────────────────
  const openNewCode = () => {
    setEditCode(null)
    setCodeForm(EMPTY_CODE)
    setShowCodeForm(true)
    setErr('')
  }

  const openEditCode = (c: CodeValue) => {
    setEditCode(c)
    setCodeForm({
      CODE_VAL:      c.CODE_VAL,
      CODE_VAL_NM:   c.CODE_VAL_NM,
      CODE_VAL_ENG:  c.CODE_VAL_ENG ?? '',
      CODE_VAL_DESC: c.CODE_VAL_DESC ?? '',
      SORT_SN:       String(c.SORT_SN),
    })
    setShowCodeForm(true)
    setErr('')
  }

  const saveCode = async () => {
    if (!selected) return
    setBusy(true); setErr('')
    const isEdit = !!editCode
    const res = await fetch(`/api/codes/${selected.CODE_GRP_ID}`, {
      method: isEdit ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...codeForm, SORT_SN: Number(codeForm.SORT_SN) }),
    })
    setBusy(false)
    if (!res.ok) { setErr((await res.json()).error); return }
    setShowCodeForm(false)
    loadCodes(selected.CODE_GRP_ID)
    loadGroups()
  }

  const toggleCodeUseYn = async (c: CodeValue) => {
    if (!selected) return
    const next = c.USE_YN === 'Y' ? 'N' : 'Y'
    if (next === 'N' && !confirm(`[${c.CODE_VAL}] 코드값을 비활성화 하시겠습니까?`)) return
    await fetch(`/api/codes/${selected.CODE_GRP_ID}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ CODE_VAL: c.CODE_VAL, USE_YN: next }),
    })
    loadCodes(selected.CODE_GRP_ID)
    loadGroups()
  }

  const visibleCodes = showInactive ? codes : codes.filter(c => c.USE_YN === 'Y')

  // ── 렌더 ─────────────────────────────────────────────────
  return (
    <div className="flex h-[calc(100vh-56px)]">

      {/* ─── 좌측: 코드 그룹 목록 ─── */}
      <aside className="w-72 shrink-0 border-r border-gray-200 bg-gray-50 flex flex-col">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between bg-white">
          <div>
            <p className="text-sm font-semibold text-gray-700">코드 그룹</p>
            <p className="text-[11px] text-gray-400">STD_CODE_GRP · {groups.length}건</p>
          </div>
          <button onClick={openNewGrp}
            className="text-xs px-2.5 py-1 rounded bg-blue-600 text-white hover:bg-blue-700">
            + 그룹 추가
          </button>
        </div>

        <ul className="flex-1 overflow-y-auto divide-y divide-gray-100">
          {groups.map(grp => (
            <li key={grp.CODE_GRP_ID}
              onClick={() => handleSelectGroup(grp)}
              className={`px-4 py-3 cursor-pointer hover:bg-blue-50 transition-colors ${selected?.CODE_GRP_ID === grp.CODE_GRP_ID ? 'bg-blue-50 border-l-2 border-blue-500' : ''} ${grp.USE_YN === 'N' ? 'opacity-40' : ''}`}>
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-mono font-semibold text-blue-700 truncate">{grp.CODE_GRP_ID}</p>
                  <p className="text-xs text-gray-700 mt-0.5 truncate">{grp.CODE_GRP_NM}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[11px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
                    {grp.CODE_CNT}건
                  </span>
                  <button onClick={e => { e.stopPropagation(); openEditGrp(grp) }}
                    className="text-[11px] text-gray-400 hover:text-blue-600">수정</button>
                  <button onClick={e => { e.stopPropagation(); toggleGrpUseYn(grp) }}
                    className={`text-[11px] ${grp.USE_YN === 'Y' ? 'text-gray-400 hover:text-red-500' : 'text-gray-300 hover:text-green-500'}`}>
                    {grp.USE_YN === 'Y' ? '비활성' : '활성'}
                  </button>
                </div>
              </div>
              {grp.CODE_GRP_DESC && (
                <p className="text-[11px] text-gray-400 mt-1 truncate">{grp.CODE_GRP_DESC}</p>
              )}
            </li>
          ))}
        </ul>
      </aside>

      {/* ─── 우측: 코드값 상세 ─── */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {!selected ? (
          <div className="flex-1 flex items-center justify-center text-sm text-gray-400">
            좌측에서 코드 그룹을 선택하세요
          </div>
        ) : (
          <>
            {/* 코드값 헤더 */}
            <div className="px-6 py-3 border-b border-gray-200 flex items-center gap-4 bg-white shrink-0">
              <div>
                <p className="text-sm font-semibold text-gray-700">
                  {selected.CODE_GRP_NM}
                  <span className="ml-2 text-xs font-mono text-blue-600">({selected.CODE_GRP_ID})</span>
                </p>
                <p className="text-[11px] text-gray-400 mt-0.5">STD_CODE · {codes.length}건</p>
              </div>
              <div className="ml-auto flex items-center gap-3">
                <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer">
                  <input type="checkbox" className="w-3 h-3"
                    checked={showInactive} onChange={e => setShowInactive(e.target.checked)} />
                  비활성 포함
                </label>
                <button onClick={openNewCode}
                  className="text-xs px-3 py-1.5 rounded bg-blue-600 text-white hover:bg-blue-700">
                  + 코드값 추가
                </button>
              </div>
            </div>

            {/* 코드값 테이블 */}
            <div className="flex-1 overflow-auto">
              <table className="w-full text-xs border-collapse min-w-[700px]">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    {['코드값', '코드값명(한글)', '코드값명(영문)', '설명', '정렬', '사용여부', '등록자', '조작'].map(h => (
                      <th key={h} className="px-4 py-2.5 text-left text-gray-500 font-medium border-b border-gray-200 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {visibleCodes.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                        코드값이 없습니다
                      </td>
                    </tr>
                  ) : visibleCodes.map(c => (
                    <tr key={c.CODE_VAL} className={`hover:bg-gray-50 ${c.USE_YN === 'N' ? 'opacity-40' : ''}`}>
                      <td className="px-4 py-2.5 font-mono font-semibold text-blue-700">{c.CODE_VAL}</td>
                      <td className="px-4 py-2.5 text-gray-800">{c.CODE_VAL_NM}</td>
                      <td className="px-4 py-2.5 text-gray-500">{c.CODE_VAL_ENG ?? '-'}</td>
                      <td className="px-4 py-2.5 text-gray-400 max-w-[180px] truncate">{c.CODE_VAL_DESC ?? '-'}</td>
                      <td className="px-4 py-2.5 text-gray-500 text-center">{c.SORT_SN}</td>
                      <td className="px-4 py-2.5">
                        <span className={`px-1.5 py-0.5 rounded text-[11px] font-medium ${c.USE_YN === 'Y' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {c.USE_YN === 'Y' ? '사용' : '미사용'}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-gray-400">{c.REG_USR_ID ?? '-'}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <button onClick={() => openEditCode(c)}
                            className="text-blue-600 hover:underline">수정</button>
                          <button onClick={() => toggleCodeUseYn(c)}
                            className={`${c.USE_YN === 'Y' ? 'text-red-400 hover:text-red-600' : 'text-green-500 hover:text-green-700'}`}>
                            {c.USE_YN === 'Y' ? '비활성' : '활성'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </main>

      {/* ─── 코드 그룹 폼 모달 ─── */}
      {showGrpForm && (
        <ModalOverlay onClose={() => setShowGrpForm(false)}>
          <h3 className="text-sm font-semibold mb-4">{editGrp ? '코드 그룹 수정' : '코드 그룹 추가'}</h3>
          <div className="space-y-3">
            <Field label="코드 그룹 ID *" hint="대문자·숫자·밑줄만 허용 (예: ROLE_CD)">
              <input className={inputCls} value={grpForm.CODE_GRP_ID}
                onChange={e => setGrpForm(p => ({ ...p, CODE_GRP_ID: e.target.value.toUpperCase() }))}
                disabled={!!editGrp} placeholder="ROLE_CD" />
            </Field>
            <Field label="코드 그룹명 *">
              <input className={inputCls} value={grpForm.CODE_GRP_NM}
                onChange={e => setGrpForm(p => ({ ...p, CODE_GRP_NM: e.target.value }))}
                placeholder="사용자역할구분코드" />
            </Field>
            <Field label="설명">
              <input className={inputCls} value={grpForm.CODE_GRP_DESC}
                onChange={e => setGrpForm(p => ({ ...p, CODE_GRP_DESC: e.target.value }))} />
            </Field>
            <Field label="정렬순서">
              <input type="number" className={inputCls} value={grpForm.SORT_SN}
                onChange={e => setGrpForm(p => ({ ...p, SORT_SN: e.target.value }))} />
            </Field>
          </div>
          {err && <p className="text-xs text-red-500 mt-3">{err}</p>}
          <ModalActions onCancel={() => setShowGrpForm(false)} onSave={saveGrp} busy={busy} />
        </ModalOverlay>
      )}

      {/* ─── 코드값 폼 모달 ─── */}
      {showCodeForm && selected && (
        <ModalOverlay onClose={() => setShowCodeForm(false)}>
          <h3 className="text-sm font-semibold mb-1">{editCode ? '코드값 수정' : '코드값 추가'}</h3>
          <p className="text-[11px] text-gray-400 mb-4 font-mono">{selected.CODE_GRP_ID}</p>
          <div className="space-y-3">
            <Field label="코드값 *" hint="영문·숫자 (예: ADMIN, 0001)">
              <input className={inputCls} value={codeForm.CODE_VAL}
                onChange={e => setCodeForm(p => ({ ...p, CODE_VAL: e.target.value }))}
                disabled={!!editCode} placeholder="ADMIN" />
            </Field>
            <Field label="코드값명(한글) *">
              <input className={inputCls} value={codeForm.CODE_VAL_NM}
                onChange={e => setCodeForm(p => ({ ...p, CODE_VAL_NM: e.target.value }))}
                placeholder="시스템관리자" />
            </Field>
            <Field label="코드값명(영문)">
              <input className={inputCls} value={codeForm.CODE_VAL_ENG}
                onChange={e => setCodeForm(p => ({ ...p, CODE_VAL_ENG: e.target.value }))}
                placeholder="System Administrator" />
            </Field>
            <Field label="설명">
              <input className={inputCls} value={codeForm.CODE_VAL_DESC}
                onChange={e => setCodeForm(p => ({ ...p, CODE_VAL_DESC: e.target.value }))} />
            </Field>
            <Field label="정렬순서">
              <input type="number" className={inputCls} value={codeForm.SORT_SN}
                onChange={e => setCodeForm(p => ({ ...p, SORT_SN: e.target.value }))} />
            </Field>
          </div>
          {err && <p className="text-xs text-red-500 mt-3">{err}</p>}
          <ModalActions onCancel={() => setShowCodeForm(false)} onSave={saveCode} busy={busy} />
        </ModalOverlay>
      )}
    </div>
  )
}

// ── 보조 컴포넌트 ─────────────────────────────────────────
const inputCls = 'w-full border border-gray-300 rounded px-3 py-1.5 text-xs focus:outline-none focus:border-blue-400 disabled:bg-gray-100 disabled:text-gray-400'

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      {children}
      {hint && <p className="text-[11px] text-gray-400 mt-0.5">{hint}</p>}
    </div>
  )
}

function ModalOverlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">{children}</div>
    </div>
  )
}

function ModalActions({ onCancel, onSave, busy }: { onCancel: () => void; onSave: () => void; busy: boolean }) {
  return (
    <div className="flex justify-end gap-2 mt-5">
      <button onClick={onCancel}
        className="text-xs px-4 py-2 rounded border border-gray-300 hover:bg-gray-50">취소</button>
      <button onClick={onSave} disabled={busy}
        className="text-xs px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">
        {busy ? '저장 중…' : '저장'}
      </button>
    </div>
  )
}
