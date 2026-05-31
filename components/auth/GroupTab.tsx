'use client'
import { useEffect, useState, useCallback } from 'react'

interface Member  { usr_no: string; mbr_role_cd: string; use_yn: string; user_info: { usr_nm: string } | null }
interface Group   { grp_cd: string; grp_nm: string; grp_cont: string | null; use_yn: string; grp_mbr: Member[] }
interface UserRow { usr_no: string; usr_nm: string }
interface Perm    { perm_cd: string; perm_nm: string; perm_cat_cd: string }
interface Profile {
  id: string
  user_id: string
  username: string | null
  full_name: string | null
  main_role: 'admin' | 'master' | 'manager' | 'sub_admin' | 'user'
  avatar_url: string | null
}

// ──────── 5개 시스템 그룹 정의 ────────
const SYSTEM_GROUPS = [
  { grp_cd: 'G_SUPER',  grp_nm: '수퍼관리자', profile_role: 'admin'     as const, desc: '최상위 관리자',                badge: { text: 'ADMIN',      cls: 'bg-rose-100 text-rose-700 border-rose-200'     }, bar: 'bg-rose-500'   },
  { grp_cd: 'G_MASTER', grp_nm: '마스터',     profile_role: null,                 desc: '부관리자 (DA 전용)',            badge: { text: 'MASTER',     cls: 'bg-purple-100 text-purple-700 border-purple-200' }, bar: 'bg-purple-500' },
  { grp_cd: 'G_MNGR',   grp_nm: '매니저',     profile_role: 'manager'   as const, desc: '사용자 중 최고권한자',          badge: { text: 'MANAGER',    cls: 'bg-blue-100 text-blue-700 border-blue-200'     }, bar: 'bg-blue-500'   },
  { grp_cd: 'G_SMNGR',  grp_nm: '부매니저',   profile_role: 'sub_admin' as const, desc: '매니저가 지정하는 서브매니저',   badge: { text: 'SUBMANAGER', cls: 'bg-teal-100 text-teal-700 border-teal-200'     }, bar: 'bg-teal-500'   },
  { grp_cd: 'G_USER',   grp_nm: '사용자',     profile_role: 'user'      as const, desc: '일반 사용자',                  badge: { text: 'USER',       cls: 'bg-gray-100 text-gray-600 border-gray-200'     }, bar: 'bg-gray-400'   },
] as const

const SYSTEM_GRP_CODES = new Set<string>(SYSTEM_GROUPS.map(g => g.grp_cd))

const PROFILE_ROLE_LABEL: Record<string, string> = {
  admin:     '수퍼관리자',
  manager:   '매니저',
  sub_admin: '부매니저',
  user:      '사용자',
}
const PROFILE_ROLE_BADGE: Record<string, string> = {
  admin:     'bg-rose-100 text-rose-700',
  manager:   'bg-blue-100 text-blue-700',
  sub_admin: 'bg-teal-100 text-teal-700',
  user:      'bg-gray-100 text-gray-600',
}
const MBR_ROLE_BADGE: Record<string, string> = {
  MANAGER:    'bg-blue-100 text-blue-700',
  SUBMANAGER: 'bg-teal-100 text-teal-700',
  USER:       'bg-gray-100 text-gray-600',
}

// profiles.main_role 변경 시 이동할 그룹 선택지
const MOVABLE_ROLES = [
  { value: 'admin',     label: '수퍼관리자 (admin)'   },
  { value: 'manager',   label: '매니저 (manager)'     },
  { value: 'sub_admin', label: '부매니저 (sub_admin)' },
  { value: 'user',      label: '사용자 (user)'        },
]

export default function GroupTab() {
  const [groups, setGroups]       = useState<Group[]>([])
  const [users, setUsers]         = useState<UserRow[]>([])
  const [perms, setPerms]         = useState<Perm[]>([])
  const [profiles, setProfiles]   = useState<Profile[]>([])
  const [selected, setSelected]   = useState<Group | null>(null)
  const [subPerms, setSubPerms]   = useState<Set<string>>(new Set())
  const [focusMbr, setFocusMbr]   = useState<string | null>(null)
  const [addUsr, setAddUsr]       = useState({ usr_no: '', mbr_role_cd: 'USER' })
  const [newGrp, setNewGrp]       = useState({ grp_cd: '', grp_nm: '', grp_cont: '' })
  const [saving, setSaving]       = useState(false)
  const [seeding, setSeeding]     = useState(false)
  const [toast, setToast]         = useState('')

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  const load = useCallback(async () => {
    const [g, u, p, pr] = await Promise.all([
      fetch('/api/auth/groups').then(r => r.json()),
      fetch('/api/auth/users').then(r => r.json()),
      fetch('/api/auth/perms').then(r => r.json()),
      fetch('/api/admin/profiles').then(r => r.json()),
    ])
    const safeG = Array.isArray(g) ? g : []
    setGroups(safeG)
    setUsers(Array.isArray(u) ? u : [])
    setPerms(Array.isArray(p) ? p : [])
    setProfiles(Array.isArray(pr) ? pr : [])
    if (selected) setSelected(safeG.find((x: Group) => x.grp_cd === selected.grp_cd) ?? null)
  }, [selected])

  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const seedSystemGroups = async () => {
    setSeeding(true)
    const existing = new Set(groups.map(g => g.grp_cd))
    for (const sg of SYSTEM_GROUPS) {
      if (!existing.has(sg.grp_cd)) {
        await fetch('/api/auth/groups', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ grp_cd: sg.grp_cd, grp_nm: sg.grp_nm, grp_cont: sg.desc }),
        })
      }
    }
    setSeeding(false)
    showToast('✅ 시스템 그룹 초기화 완료')
    load()
  }

  const selectGroup = (g: Group) => {
    setSelected(g); setFocusMbr(null); setSubPerms(new Set())
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
    if (SYSTEM_GRP_CODES.has(grp_cd)) return alert('시스템 그룹은 삭제할 수 없습니다.')
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
    if (focusMbr === usr_no) { setFocusMbr(null); setSubPerms(new Set()) }
    load()
  }

  // profiles 사용자의 main_role 변경 (그룹 이동)
  const changeProfileRole = async (user_id: string, main_role: string) => {
    const r = await fetch('/api/admin/profiles', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id, main_role }),
    })
    if (r.ok) { showToast(`✅ 역할 변경 완료`); load() }
    else { const e = await r.json(); alert(e.error) }
  }

  const loadSubPerms = async (grp_cd: string, usr_no: string) => {
    const r = await fetch(`/api/auth/grp-mbr/perm?grp_cd=${grp_cd}&usr_no=${usr_no}`)
    if (r.ok) {
      const data = await r.json()
      setSubPerms(new Set((data as { perm_cd: string }[]).map(x => x.perm_cd)))
    }
  }

  const toggleSubPerm = async (perm_cd: string, has: boolean) => {
    if (!selected || !focusMbr) return
    const r = await fetch('/api/auth/grp-mbr', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ grp_cd: selected.grp_cd, usr_no: focusMbr, perm_cd, grnt_yn: has ? 'N' : 'Y' }),
    })
    if (r.ok) {
      setSubPerms(prev => {
        const next = new Set(prev); has ? next.delete(perm_cd) : next.add(perm_cd); return next
      })
      showToast(has ? `${perm_cd} 권한 회수` : `${perm_cd} 권한 부여`)
    }
  }

  // ── 파생 데이터 ──
  const writablePerms    = perms.filter(p => p.perm_cd.endsWith('_W') || p.perm_cd.endsWith('_D'))
  const usersNotInGroup  = users.filter(u => !selected?.grp_mbr.find(m => m.usr_no === u.usr_no))
  const focusMbrObj      = selected?.grp_mbr.find(m => m.usr_no === focusMbr)
  const isSubFocused     = focusMbrObj?.mbr_role_cd === 'SUBMANAGER'
  const seededCount      = SYSTEM_GROUPS.filter(sg => groups.find(g => g.grp_cd === sg.grp_cd)).length
  const customGroups     = groups.filter(g => !SYSTEM_GRP_CODES.has(g.grp_cd))
  const sg4Selected      = SYSTEM_GROUPS.find(s => s.grp_cd === selected?.grp_cd)

  // 선택된 시스템 그룹에 해당하는 profiles 사용자 목록
  const profilesForGroup: Profile[] = sg4Selected
    ? (sg4Selected.profile_role
        ? profiles.filter(p => p.main_role === sg4Selected.profile_role)
        : [])  // G_MASTER는 profile_role 없음 → 빈 목록
    : []

  return (
    <div className="flex h-full overflow-hidden">

      {/* ════════ 좌측 패널: 그룹 목록 ════════ */}
      <div className="w-64 shrink-0 border-r flex flex-col bg-gray-50">

        <div className="px-3 pt-3 pb-1.5 flex items-center justify-between shrink-0">
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">시스템 그룹</span>
          {seededCount < SYSTEM_GROUPS.length ? (
            <button onClick={seedSystemGroups} disabled={seeding}
              className="px-2 py-0.5 text-[10px] bg-amber-100 text-amber-700 border border-amber-300 rounded hover:bg-amber-200 disabled:opacity-50">
              {seeding ? '초기화 중…' : '+ 초기화'}
            </button>
          ) : (
            <span className="text-[10px] text-green-600 font-medium">✓ 완료</span>
          )}
        </div>

        {/* 5개 시스템 그룹 */}
        <div className="px-2 space-y-0.5 shrink-0">
          {SYSTEM_GROUPS.map(sg => {
            const dbGrp = groups.find(g => g.grp_cd === sg.grp_cd)
            const isActive = selected?.grp_cd === sg.grp_cd
            // profiles 기준 멤버 수
            const profileCnt = sg.profile_role
              ? profiles.filter(p => p.main_role === sg.profile_role).length
              : 0
            return (
              <button key={sg.grp_cd} type="button"
                disabled={!dbGrp}
                onClick={() => dbGrp && selectGroup(dbGrp)}
                className={`w-full text-left flex items-center gap-2 px-2.5 py-2 rounded-lg border transition-all
                  ${isActive
                    ? 'bg-white border-blue-300 shadow-sm ring-1 ring-blue-200'
                    : dbGrp
                      ? 'bg-white border-gray-200 hover:border-gray-300 hover:bg-blue-50'
                      : 'bg-gray-100 border-gray-200 opacity-40 cursor-not-allowed'}`}>
                <div className={`w-1 h-8 rounded-full shrink-0 ${sg.bar}`} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-gray-800 truncate">{sg.grp_nm}</span>
                    {!dbGrp && <span className="text-[9px] text-gray-400 shrink-0">미생성</span>}
                  </div>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className={`text-[9px] font-bold px-1 rounded border ${sg.badge.cls}`}>{sg.badge.text}</span>
                    {dbGrp && (
                      <span className="text-[10px] text-gray-400">
                        {sg.profile_role ? `${profileCnt}명` : 'DA 전용'}
                      </span>
                    )}
                  </div>
                </div>
                {isActive && <span className="text-blue-400 text-xs shrink-0">›</span>}
              </button>
            )
          })}
        </div>

        {/* 커스텀 그룹 */}
        <div className="px-3 pt-3 pb-1 shrink-0 border-t border-gray-200 mt-2">
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
            커스텀 그룹 ({customGroups.length})
          </span>
        </div>
        <div className="flex-1 overflow-auto px-2 space-y-0.5">
          {customGroups.map(g => {
            const isActive = selected?.grp_cd === g.grp_cd
            return (
              <button key={g.grp_cd} type="button" onClick={() => selectGroup(g)}
                className={`w-full text-left flex items-center gap-2 px-2.5 py-2 rounded-lg border transition-all
                  ${isActive
                    ? 'bg-white border-blue-300 shadow-sm ring-1 ring-blue-200'
                    : 'bg-white border-gray-200 hover:border-gray-300 hover:bg-blue-50'}`}>
                <div className="w-1 h-8 rounded-full shrink-0 bg-indigo-400" />
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold text-gray-800 truncate">{g.grp_nm}</div>
                  <div className="text-[10px] text-gray-400 font-mono truncate">{g.grp_cd} · {g.grp_mbr?.length ?? 0}명</div>
                </div>
                {isActive && <span className="text-blue-400 text-xs shrink-0">›</span>}
              </button>
            )
          })}
          {customGroups.length === 0 && (
            <div className="text-center py-4 text-[11px] text-gray-400">커스텀 그룹 없음</div>
          )}
        </div>

        {/* 커스텀 그룹 추가 */}
        <div className="p-3 border-t bg-white shrink-0 space-y-1.5">
          <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">그룹 추가</div>
          <input value={newGrp.grp_cd}
            onChange={e => setNewGrp(f => ({ ...f, grp_cd: e.target.value.toUpperCase() }))}
            placeholder="코드 (예: DA_TEAM)"
            className="w-full border border-gray-300 rounded px-2 py-1 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-blue-400" />
          <input value={newGrp.grp_nm}
            onChange={e => setNewGrp(f => ({ ...f, grp_nm: e.target.value }))}
            placeholder="그룹명"
            className="w-full border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400" />
          <button type="button" onClick={createGroup} disabled={saving}
            className="w-full py-1.5 bg-[#1e3a5f] text-white rounded text-xs hover:bg-[#2a4f7f] disabled:opacity-50">
            {saving ? '저장 중…' : '+ 그룹 생성'}
          </button>
        </div>
      </div>

      {/* ════════ 우측 패널 ════════ */}
      <div className="flex-1 flex overflow-hidden">
        {!selected ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-2">
            <span className="text-3xl">👈</span>
            <p className="text-sm">왼쪽에서 그룹을 선택하세요</p>
          </div>
        ) : (
          <>
            <div className="flex-1 flex flex-col overflow-hidden">

              {/* 그룹 헤더 */}
              <div className="px-5 py-3 border-b bg-white flex items-center gap-3 shrink-0">
                {sg4Selected && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${sg4Selected.badge.cls}`}>
                    {sg4Selected.badge.text}
                  </span>
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-800">{selected.grp_nm}</span>
                    <span className="text-[11px] text-gray-400 font-mono">{selected.grp_cd}</span>
                    {SYSTEM_GRP_CODES.has(selected.grp_cd) && (
                      <span className="text-[9px] bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded">시스템 그룹</span>
                    )}
                    {sg4Selected?.profile_role && (
                      <span className="text-[9px] bg-blue-50 text-blue-500 px-1.5 py-0.5 rounded">
                        profiles.main_role = {sg4Selected.profile_role}
                      </span>
                    )}
                  </div>
                  {sg4Selected && <p className="text-xs text-gray-400 mt-0.5">{sg4Selected.desc}</p>}
                </div>
                {toast && <span className="ml-3 text-xs text-green-600 font-medium animate-pulse">{toast}</span>}
                {!SYSTEM_GRP_CODES.has(selected.grp_cd) && (
                  <button type="button" onClick={() => deleteGroup(selected.grp_cd)}
                    className="ml-auto px-3 py-1 text-xs text-red-500 border border-red-200 rounded hover:bg-red-50">
                    그룹 삭제
                  </button>
                )}
              </div>

              {/* ── 시스템 그룹: profiles 사용자 목록 ── */}
              {sg4Selected ? (
                <div className="flex-1 overflow-auto">
                  {sg4Selected.profile_role ? (
                    <>
                      {/* 컬럼 헤더 */}
                      <table className="w-full text-xs border-collapse">
                        <thead className="sticky top-0 bg-[#2c4a6e] text-white z-10">
                          <tr>
                            {['이름', '사용자명', 'Profiles 역할', '그룹 이동', 'User ID'].map(h => (
                              <th key={h} className="px-4 py-2.5 text-left font-medium border-r border-[#3a5a80] last:border-r-0">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {profilesForGroup.map((p, i) => (
                            <tr key={p.user_id}
                              className={`border-b border-gray-100 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition-colors`}>
                              <td className="px-4 py-2.5 font-medium text-gray-800">
                                {p.full_name ?? '—'}
                              </td>
                              <td className="px-4 py-2.5 text-gray-500">
                                {p.username ?? '—'}
                              </td>
                              <td className="px-4 py-2.5">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${PROFILE_ROLE_BADGE[p.main_role] ?? 'bg-gray-100 text-gray-600'}`}>
                                  {PROFILE_ROLE_LABEL[p.main_role] ?? p.main_role}
                                </span>
                              </td>
                              <td className="px-4 py-2.5">
                                <select
                                  aria-label="그룹 이동"
                                  defaultValue={p.main_role}
                                  onChange={e => changeProfileRole(p.user_id, e.target.value)}
                                  className="border border-gray-200 rounded px-1.5 py-0.5 text-[10px] focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white">
                                  {MOVABLE_ROLES.map(r => (
                                    <option key={r.value} value={r.value}>{r.label}</option>
                                  ))}
                                </select>
                              </td>
                              <td className="px-4 py-2.5 font-mono text-[10px] text-gray-300 truncate max-w-[140px]">
                                {p.user_id}
                              </td>
                            </tr>
                          ))}
                          {profilesForGroup.length === 0 && (
                            <tr>
                              <td colSpan={5} className="text-center py-10 text-gray-400">
                                이 그룹에 해당하는 사용자가 없습니다.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </>
                  ) : (
                    // G_MASTER: profiles 매핑 없음 → DA 전용 안내
                    <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2">
                      <span className="text-2xl">🗝️</span>
                      <p className="text-sm font-medium text-gray-500">마스터 그룹 (DA 전용)</p>
                      <p className="text-xs text-gray-400">Profiles의 main_role과 직접 매핑되지 않습니다.</p>
                      <p className="text-xs text-gray-400">아래 구성원 관리를 통해 직접 추가해 주세요.</p>
                    </div>
                  )}
                </div>
              ) : (
                /* ── 커스텀 그룹: 기존 grp_mbr 기반 사용자 목록 ── */
                <>
                  <div className="px-5 py-2.5 border-b bg-gray-50 flex items-center gap-2 shrink-0">
                    <span className="text-xs font-medium text-gray-600 shrink-0">구성원 추가</span>
                    <select aria-label="사용자 선택" value={addUsr.usr_no}
                      onChange={e => setAddUsr(f => ({ ...f, usr_no: e.target.value }))}
                      className="border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none">
                      <option value="">— 사용자 선택 —</option>
                      {usersNotInGroup.map(u => (
                        <option key={u.usr_no} value={u.usr_no}>{u.usr_nm} ({u.usr_no})</option>
                      ))}
                    </select>
                    <select aria-label="역할 선택" value={addUsr.mbr_role_cd}
                      onChange={e => setAddUsr(f => ({ ...f, mbr_role_cd: e.target.value }))}
                      className="border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none">
                      <option value="MANAGER">MANAGER</option>
                      <option value="SUBMANAGER">SUBMANAGER</option>
                      <option value="USER">USER</option>
                    </select>
                    <button type="button" onClick={addMember}
                      className="px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700">추가</button>
                    <span className="ml-auto text-xs text-gray-400">총 {selected.grp_mbr?.length ?? 0}명</span>
                  </div>

                  <div className="flex-1 overflow-auto">
                    <table className="w-full text-xs border-collapse">
                      <thead className="sticky top-0 bg-[#2c4a6e] text-white z-10">
                        <tr>
                          {['이름', '사원번호', '그룹 내 역할', 'SubManager 권한', '제거'].map(h => (
                            <th key={h} className="px-4 py-2.5 text-left font-medium border-r border-[#3a5a80] last:border-r-0">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {selected.grp_mbr?.map((m, i) => {
                          const isFocused = focusMbr === m.usr_no
                          return (
                            <tr key={m.usr_no}
                              onClick={() => {
                                setFocusMbr(isFocused ? null : m.usr_no)
                                if (m.mbr_role_cd === 'SUBMANAGER' && !isFocused) loadSubPerms(selected.grp_cd, m.usr_no)
                                else if (isFocused) setSubPerms(new Set())
                              }}
                              className={`border-b border-gray-100 cursor-pointer transition-colors
                                ${isFocused ? 'bg-blue-50 border-l-2 border-l-blue-400' : i % 2 === 0 ? 'bg-white hover:bg-gray-50' : 'bg-gray-50 hover:bg-gray-100'}`}>
                              <td className="px-4 py-2.5 font-medium">{m.user_info?.usr_nm ?? m.usr_no}</td>
                              <td className="px-4 py-2.5 font-mono text-gray-400 text-[11px]">{m.usr_no}</td>
                              <td className="px-4 py-2.5">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${MBR_ROLE_BADGE[m.mbr_role_cd] ?? 'bg-gray-100 text-gray-600'}`}>
                                  {m.mbr_role_cd}
                                </span>
                              </td>
                              <td className="px-4 py-2.5 text-[11px] text-gray-400">
                                {m.mbr_role_cd === 'SUBMANAGER' ? <span className="text-teal-600">클릭 → 권한 설정</span> : '—'}
                              </td>
                              <td className="px-4 py-2.5">
                                <button type="button"
                                  onClick={e => { e.stopPropagation(); removeMember(m.usr_no) }}
                                  className="px-2 py-0.5 text-[10px] text-red-500 border border-red-200 rounded hover:bg-red-50">제거</button>
                              </td>
                            </tr>
                          )
                        })}
                        {(!selected.grp_mbr || selected.grp_mbr.length === 0) && (
                          <tr><td colSpan={5} className="text-center py-10 text-gray-400">구성원이 없습니다.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>

            {/* SubManager 권한 패널 */}
            {isSubFocused && (
              <div className="w-56 shrink-0 border-l flex flex-col bg-gray-50">
                <div className="px-3 py-2.5 border-b bg-teal-50 shrink-0">
                  <div className="text-[10px] font-bold text-teal-700 uppercase tracking-wide">SubManager 권한</div>
                  <div className="text-xs font-medium text-gray-800 mt-0.5">{focusMbrObj?.user_info?.usr_nm ?? focusMbr}</div>
                </div>
                <div className="flex-1 overflow-auto p-2 space-y-1">
                  <div className="text-[10px] text-gray-400 px-1 mb-1">쓰기·삭제 권한만 부여 가능</div>
                  {writablePerms.map(p => {
                    const has = subPerms.has(p.perm_cd)
                    return (
                      <label key={p.perm_cd}
                        className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-colors
                          ${has ? 'bg-teal-50 border border-teal-200' : 'bg-white border border-gray-200 hover:bg-blue-50'}`}>
                        <input type="checkbox" checked={has}
                          onChange={() => toggleSubPerm(p.perm_cd, has)}
                          className="accent-teal-600 shrink-0" />
                        <div className="min-w-0">
                          <div className="text-xs font-medium text-gray-700 truncate">{p.perm_nm}</div>
                          <div className="text-[9px] text-gray-400 font-mono truncate">{p.perm_cd}</div>
                        </div>
                      </label>
                    )
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
