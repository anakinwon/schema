'use client'
import { useEffect, useState, useCallback } from 'react'

interface Member { usr_no: string; mbr_role_cd: string; use_yn: string; user_info: { usr_nm: string } | null }
interface Group  { grp_cd: string; grp_nm: string; grp_cont: string | null; use_yn: string; grp_mbr: Member[] }
interface UserRow { usr_no: string; usr_nm: string }
interface Perm    { perm_cd: string; perm_nm: string; perm_cat_cd: string }

const MBR_ROLE_COLOR: Record<string, string> = {
  MANAGER:    'bg-blue-100 text-blue-700',
  SUBMANAGER: 'bg-teal-100 text-teal-700',
  USER:       'bg-gray-100 text-gray-600',
}

export default function GroupTab() {
  const [groups, setGroups]   = useState<Group[]>([])
  const [users, setUsers]     = useState<UserRow[]>([])
  const [perms, setPerms]     = useState<Perm[]>([])
  const [selected, setSelected] = useState<Group | null>(null)
  const [subPerms, setSubPerms] = useState<Set<string>>(new Set())
  const [selectedMbr, setSelectedMbr] = useState<string | null>(null)
  const [newGrp, setNewGrp]  = useState({ grp_cd: '', grp_nm: '', grp_cont: '' })
  const [addUsr, setAddUsr]  = useState({ usr_no: '', mbr_role_cd: 'USER' })
  const [saving, setSaving]  = useState(false)
  const [msg, setMsg]        = useState('')

  const load = useCallback(async () => {
    const [g, u, p] = await Promise.all([
      fetch('/api/auth/groups').then(r => r.json()),
      fetch('/api/auth/users').then(r => r.json()),
      fetch('/api/auth/perms').then(r => r.json()),
    ])
    setGroups(g); setUsers(u); setPerms(p)
    if (selected) setSelected(g.find((x: Group) => x.grp_cd === selected.grp_cd) ?? null)
  }, [selected])

  useEffect(() => { load() }, [])

  const loadSubPerms = async (grp_cd: string, usr_no: string) => {
    const r = await fetch(`/api/auth/grp-mbr/perm?grp_cd=${grp_cd}&usr_no=${usr_no}`)
    if (r.ok) {
      const data = await r.json()
      setSubPerms(new Set((data as {perm_cd: string}[]).map(x => x.perm_cd)))
    }
  }

  const createGroup = async () => {
    if (!newGrp.grp_cd || !newGrp.grp_nm) return alert('그룹코드와 그룹명은 필수입니다.')
    setSaving(true)
    const r = await fetch('/api/auth/groups', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newGrp),
    })
    setSaving(false)
    if (r.ok) { setNewGrp({ grp_cd: '', grp_nm: '', grp_cont: '' }); load() }
    else { const e = await r.json(); alert(e.error) }
  }

  const deleteGroup = async (grp_cd: string) => {
    if (!confirm(`그룹 ${grp_cd}를 삭제하시겠습니까?`)) return
    await fetch('/api/auth/groups', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ grp_cd }),
    })
    if (selected?.grp_cd === grp_cd) setSelected(null)
    load()
  }

  const addMember = async () => {
    if (!selected || !addUsr.usr_no) return
    const r = await fetch('/api/auth/grp-mbr', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ grp_cd: selected.grp_cd, ...addUsr }),
    })
    if (r.ok) { setAddUsr({ usr_no: '', mbr_role_cd: 'USER' }); load() }
    else { const e = await r.json(); alert(e.error) }
  }

  const removeMember = async (usr_no: string) => {
    if (!selected || !confirm('구성원을 제거하시겠습니까?')) return
    await fetch('/api/auth/grp-mbr', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ grp_cd: selected.grp_cd, usr_no }),
    })
    if (selectedMbr === usr_no) { setSelectedMbr(null); setSubPerms(new Set()) }
    load()
  }

  const toggleSubPerm = async (perm_cd: string, has: boolean) => {
    if (!selected || !selectedMbr) return
    const mbr = selected.grp_mbr.find(m => m.usr_no === selectedMbr)
    if (mbr?.mbr_role_cd !== 'SUBMANAGER') return
    const r = await fetch('/api/auth/grp-mbr', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ grp_cd: selected.grp_cd, usr_no: selectedMbr, perm_cd, grnt_yn: has ? 'N' : 'Y' }),
    })
    if (r.ok) {
      setSubPerms(prev => {
        const next = new Set(prev)
        has ? next.delete(perm_cd) : next.add(perm_cd)
        return next
      })
      setMsg(has ? `${perm_cd} 권한 회수` : `${perm_cd} 권한 부여`)
      setTimeout(() => setMsg(''), 2000)
    }
  }

  const writablePerms = perms.filter(p => p.perm_cd.endsWith('_W') || p.perm_cd.endsWith('_D'))
  const usersNotInGroup = users.filter(u => !selected?.grp_mbr.find(m => m.usr_no === u.usr_no))
  const selectedMbrObj = selected?.grp_mbr.find(m => m.usr_no === selectedMbr)

  return (
    <div className="flex h-full gap-0 overflow-hidden">
      {/* 좌측: 그룹 목록 */}
      <div className="w-64 border-r flex flex-col bg-gray-50">
        <div className="p-3 border-b font-semibold text-xs text-gray-600">그룹 목록</div>
        <div className="flex-1 overflow-auto">
          {groups.map(g => (
            <div key={g.grp_cd}
              onClick={() => { setSelected(g); setSelectedMbr(null); setSubPerms(new Set()) }}
              className={`px-3 py-2.5 border-b cursor-pointer hover:bg-blue-50 text-xs
                ${selected?.grp_cd === g.grp_cd ? 'bg-blue-100 border-l-4 border-l-blue-500' : ''}`}>
              <div className="font-medium text-gray-800">{g.grp_nm}</div>
              <div className="text-gray-400 font-mono text-[10px]">{g.grp_cd}</div>
              <div className="text-gray-500 text-[10px]">구성원 {g.grp_mbr?.length ?? 0}명</div>
            </div>
          ))}
          {groups.length === 0 && <div className="text-center py-6 text-gray-400 text-xs">그룹 없음</div>}
        </div>

        {/* 그룹 추가 */}
        <div className="p-3 border-t space-y-2">
          <div className="text-xs font-semibold text-gray-600">그룹 추가</div>
          <input value={newGrp.grp_cd} onChange={e => setNewGrp(f => ({...f, grp_cd: e.target.value.toUpperCase()}))}
            placeholder="그룹코드 (예: DA_TEAM)"
            className="w-full border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400 font-mono" />
          <input value={newGrp.grp_nm} onChange={e => setNewGrp(f => ({...f, grp_nm: e.target.value}))}
            placeholder="그룹명"
            className="w-full border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400" />
          <button type="button" onClick={createGroup} disabled={saving}
            className="w-full px-2 py-1.5 bg-[#1e3a5f] text-white rounded text-xs hover:bg-[#2a4f7f] disabled:opacity-50">
            {saving ? '저장중…' : '+ 그룹 생성'}
          </button>
        </div>
      </div>

      {/* 중앙: 구성원 관리 */}
      <div className="flex-1 flex flex-col border-r overflow-hidden">
        {selected ? (
          <>
            <div className="px-4 py-2.5 border-b bg-gray-50 flex items-center gap-2">
              <span className="font-semibold text-sm text-gray-700">{selected.grp_nm}</span>
              <span className="text-xs text-gray-400 font-mono">({selected.grp_cd})</span>
              <button type="button" onClick={() => deleteGroup(selected.grp_cd)}
                className="ml-auto px-2 py-1 text-xs text-red-500 hover:bg-red-50 rounded border border-red-200">
                그룹 삭제
              </button>
            </div>

            {/* 구성원 추가 */}
            <div className="flex items-center gap-2 px-4 py-2 bg-white border-b text-xs">
              <select aria-label="사용자 선택" value={addUsr.usr_no}
                onChange={e => setAddUsr(f => ({...f, usr_no: e.target.value}))}
                className="border border-gray-300 rounded px-2 py-1 focus:outline-none">
                <option value="">— 사용자 선택 —</option>
                {usersNotInGroup.map(u => (
                  <option key={u.usr_no} value={u.usr_no}>{u.usr_nm} ({u.usr_no})</option>
                ))}
              </select>
              <select aria-label="구성원 역할 선택" value={addUsr.mbr_role_cd}
                onChange={e => setAddUsr(f => ({...f, mbr_role_cd: e.target.value}))}
                className="border border-gray-300 rounded px-2 py-1 focus:outline-none">
                <option value="MANAGER">MANAGER - 매니저</option>
                <option value="SUBMANAGER">SUBMANAGER - 부매니저</option>
                <option value="USER">USER - 일반사용자</option>
              </select>
              <button type="button" onClick={addMember}
                className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700">추가</button>
            </div>

            {/* 구성원 목록 */}
            <div className="flex-1 overflow-auto">
              <table className="w-full text-xs border-collapse">
                <thead className="sticky top-0 bg-[#2c4a6e] text-white">
                  <tr>
                    {['사원번호','이름','그룹내역할','권한관리','제거'].map(h => (
                      <th key={h} className="px-3 py-2 text-left border-r border-[#3a5a80] last:border-r-0">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {selected.grp_mbr?.map((m, i) => (
                    <tr key={m.usr_no}
                      className={`border-b border-gray-200 hover:bg-blue-50 cursor-pointer
                        ${selectedMbr === m.usr_no ? 'bg-blue-100' : i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                      onClick={() => {
                        setSelectedMbr(m.usr_no)
                        if (m.mbr_role_cd === 'SUBMANAGER') loadSubPerms(selected.grp_cd, m.usr_no)
                      }}>
                      <td className="px-3 py-2 font-mono text-gray-400">{m.usr_no}</td>
                      <td className="px-3 py-2 font-medium">{m.user_info?.usr_nm ?? m.usr_no}</td>
                      <td className="px-3 py-2">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${MBR_ROLE_COLOR[m.mbr_role_cd] ?? 'bg-gray-100 text-gray-600'}`}>
                          {m.mbr_role_cd}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-gray-400 text-[10px]">
                        {m.mbr_role_cd === 'SUBMANAGER' ? '↗ 클릭하여 권한 부여' : '—'}
                      </td>
                      <td className="px-3 py-2">
                        <button type="button" onClick={e => { e.stopPropagation(); removeMember(m.usr_no) }}
                          className="px-2 py-0.5 text-[10px] text-red-500 hover:bg-red-50 rounded border border-red-200">
                          제거
                        </button>
                      </td>
                    </tr>
                  ))}
                  {(!selected.grp_mbr || selected.grp_mbr.length === 0) && (
                    <tr><td colSpan={5} className="text-center py-6 text-gray-400">구성원 없음</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
            좌측에서 그룹을 선택하세요
          </div>
        )}
      </div>

      {/* 우측: SubManager 권한 부여 패널 */}
      <div className="w-64 flex flex-col bg-gray-50 border-l">
        <div className="p-3 border-b text-xs font-semibold text-gray-600">
          SubManager 권한 부여
        </div>
        {selectedMbr && selectedMbrObj?.mbr_role_cd === 'SUBMANAGER' ? (
          <>
            <div className="px-3 py-2 bg-teal-50 border-b text-xs">
              <div className="font-medium text-teal-700">{selectedMbrObj?.user_info?.usr_nm ?? selectedMbr}</div>
              <div className="text-teal-500">{selectedMbr}</div>
              {msg && <div className="mt-1 text-green-600 font-medium">{msg}</div>}
            </div>
            <div className="flex-1 overflow-auto p-2 space-y-1">
              <div className="text-[10px] text-gray-400 px-1">쓰기·삭제 권한만 부여 가능</div>
              {writablePerms.map(p => {
                const has = subPerms.has(p.perm_cd)
                return (
                  <label key={p.perm_cd}
                    className={`flex items-center gap-2 p-2 rounded cursor-pointer hover:bg-blue-50
                      ${has ? 'bg-teal-50 border border-teal-200' : 'bg-white border border-gray-200'}`}>
                    <input type="checkbox" checked={has}
                      onChange={() => toggleSubPerm(p.perm_cd, has)}
                      className="accent-teal-600" />
                    <div>
                      <div className="text-xs font-medium text-gray-700">{p.perm_nm}</div>
                      <div className="text-[10px] text-gray-400 font-mono">{p.perm_cd}</div>
                    </div>
                  </label>
                )
              })}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-xs text-gray-400 text-center px-4">
            SUBMANAGER 구성원을<br/>선택하면 권한을 부여할 수 있습니다
          </div>
        )}
      </div>
    </div>
  )
}
