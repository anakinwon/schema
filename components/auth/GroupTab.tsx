'use client'
import { useEffect, useState, useCallback, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { supabaseBrowser } from '@/lib/supabase-browser'

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

// grp_nm/desc 제거 → 번역 키로 처리
const SYSTEM_GROUPS = [
  { grp_cd: 'G_SUPER',  profile_role: 'admin'     as const, badge: { text: 'ADMIN',      cls: 'bg-rose-100 text-rose-700 border-rose-200'     }, bar: 'bg-rose-500'   },
  { grp_cd: 'G_MASTER', profile_role: 'master'    as const, badge: { text: 'MASTER',     cls: 'bg-purple-100 text-purple-700 border-purple-200' }, bar: 'bg-purple-500' },
  { grp_cd: 'G_MNGR',   profile_role: 'manager'   as const, badge: { text: 'MANAGER',    cls: 'bg-blue-100 text-blue-700 border-blue-200'     }, bar: 'bg-blue-500'   },
  { grp_cd: 'G_SMNGR',  profile_role: 'sub_admin' as const, badge: { text: 'SUBMANAGER', cls: 'bg-teal-100 text-teal-700 border-teal-200'     }, bar: 'bg-teal-500'   },
  { grp_cd: 'G_USER',   profile_role: 'user'      as const, badge: { text: 'USER',       cls: 'bg-gray-100 text-gray-600 border-gray-200'     }, bar: 'bg-gray-400'   },
] as const

const SYSTEM_GRP_CODES = new Set<string>(SYSTEM_GROUPS.map(g => g.grp_cd))

const PROFILE_ROLE_BADGE: Record<string, string> = {
  admin:     'bg-rose-100 text-rose-700',
  master:    'text-purple-700 font-bold',
  manager:   'bg-blue-100 text-blue-700',
  sub_admin: 'bg-teal-100 text-teal-700',
  user:      'bg-gray-100 text-gray-600',
}
const MBR_ROLE_BADGE: Record<string, string> = {
  MANAGER:    'bg-blue-100 text-blue-700',
  SUBMANAGER: 'bg-teal-100 text-teal-700',
  USER:       'bg-gray-100 text-gray-600',
}

export default function GroupTab() {
  const t = useTranslations('standards')
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

  const movableRoles = useMemo(() => [
    { value: 'admin',     label: t('groupTab.moveRole.admin' as any) },
    { value: 'master',    label: t('groupTab.moveRole.master' as any) },
    { value: 'manager',   label: t('groupTab.moveRole.manager' as any) },
    { value: 'sub_admin', label: t('groupTab.moveRole.sub_admin' as any) },
    { value: 'user',      label: t('groupTab.moveRole.user' as any) },
  ], [t])

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  const getAuthHeaders = async (): Promise<HeadersInit> => {
    const { data: { session } } = await supabaseBrowser.auth.getSession()
    return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}
  }

  const load = useCallback(async () => {
    const hdrs = await getAuthHeaders()
    const [g, u, p, pr] = await Promise.all([
      fetch('/api/auth/groups', { headers: hdrs }).then(r => r.json()),
      fetch('/api/auth/users', { headers: hdrs }).then(r => r.json()),
      fetch('/api/auth/perms', { headers: hdrs }).then(r => r.json()),
      fetch('/api/admin/profiles', { headers: hdrs }).then(r => r.json()),
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
    const hdrs = await getAuthHeaders()
    const existing = new Set(groups.map(g => g.grp_cd))
    for (const sg of SYSTEM_GROUPS) {
      if (!existing.has(sg.grp_cd)) {
        await fetch('/api/auth/groups', {
          method: 'POST', headers: { 'Content-Type': 'application/json', ...hdrs },
          body: JSON.stringify({
            grp_cd: sg.grp_cd,
            grp_nm: t(`groupTab.groups.${sg.grp_cd}.name` as any),
            grp_cont: t(`groupTab.groups.${sg.grp_cd}.desc` as any),
          }),
        })
      }
    }
    setSeeding(false)
    showToast(t('groupTab.seedDoneToast' as any))
    load()
  }

  const selectGroup = (g: Group) => {
    setSelected(g); setFocusMbr(null); setSubPerms(new Set())
  }

  const createGroup = async () => {
    if (!newGrp.grp_cd || !newGrp.grp_nm) return alert(t('groupTab.alertRequired' as any))
    setSaving(true)
    const hdrs = await getAuthHeaders()
    const r = await fetch('/api/auth/groups', {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...hdrs }, body: JSON.stringify(newGrp),
    })
    setSaving(false)
    if (r.ok) { setNewGrp({ grp_cd: '', grp_nm: '', grp_cont: '' }); load() }
    else { const e = await r.json(); alert(e.error) }
  }

  const deleteGroup = async (grp_cd: string) => {
    if (SYSTEM_GRP_CODES.has(grp_cd)) return alert(t('groupTab.alertSystemDelete' as any))
    if (!confirm((t as any)('groupTab.confirmDelete', { grp: grp_cd }))) return
    const hdrs = await getAuthHeaders()
    await fetch('/api/auth/groups', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json', ...hdrs }, body: JSON.stringify({ grp_cd }),
    })
    if (selected?.grp_cd === grp_cd) setSelected(null)
    load()
  }

  const addMember = async () => {
    if (!selected || !addUsr.usr_no) return
    const hdrs = await getAuthHeaders()
    const r = await fetch('/api/auth/grp-mbr', {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...hdrs },
      body: JSON.stringify({ grp_cd: selected.grp_cd, ...addUsr }),
    })
    if (r.ok) { setAddUsr({ usr_no: '', mbr_role_cd: 'USER' }); load() }
    else { const e = await r.json(); alert(e.error) }
  }

  const removeMember = async (usr_no: string) => {
    if (!selected || !confirm(t('groupTab.confirmRemove' as any))) return
    const hdrs = await getAuthHeaders()
    await fetch('/api/auth/grp-mbr', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json', ...hdrs },
      body: JSON.stringify({ grp_cd: selected.grp_cd, usr_no }),
    })
    if (focusMbr === usr_no) { setFocusMbr(null); setSubPerms(new Set()) }
    load()
  }

  const changeProfileRole = async (user_id: string, main_role: string) => {
    const hdrs = await getAuthHeaders()
    const r = await fetch('/api/admin/profiles', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json', ...hdrs },
      body: JSON.stringify({ user_id, main_role }),
    })
    if (r.ok) { showToast(t('groupTab.roleChangeToast' as any)); load() }
    else { const e = await r.json(); alert(e.error) }
  }

  const loadSubPerms = async (grp_cd: string, usr_no: string) => {
    const hdrs = await getAuthHeaders()
    const r = await fetch(`/api/auth/grp-mbr/perm?grp_cd=${grp_cd}&usr_no=${usr_no}`, { headers: hdrs })
    if (r.ok) {
      const data = await r.json()
      setSubPerms(new Set((data as { perm_cd: string }[]).map(x => x.perm_cd)))
    }
  }

  const toggleSubPerm = async (perm_cd: string, has: boolean) => {
    if (!selected || !focusMbr) return
    const hdrs = await getAuthHeaders()
    const r = await fetch('/api/auth/grp-mbr', {
      method: 'PUT', headers: { 'Content-Type': 'application/json', ...hdrs },
      body: JSON.stringify({ grp_cd: selected.grp_cd, usr_no: focusMbr, perm_cd, grnt_yn: has ? 'N' : 'Y' }),
    })
    if (r.ok) {
      setSubPerms(prev => {
        const next = new Set(prev); has ? next.delete(perm_cd) : next.add(perm_cd); return next
      })
      showToast(has
        ? (t as any)('groupTab.permRevoked', { perm: perm_cd })
        : (t as any)('groupTab.permGranted', { perm: perm_cd })
      )
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

  const profilesForGroup: Profile[] = sg4Selected
    ? (sg4Selected.profile_role
        ? profiles.filter(p => p.main_role === sg4Selected.profile_role)
        : [])
    : []

  return (
    <div className="flex h-full overflow-hidden">

      {/* ════════ 좌측 패널: 그룹 목록 ════════ */}
      <div className="w-64 shrink-0 border-r flex flex-col bg-gray-50">

        <div className="px-3 pt-3 pb-1.5 flex items-center justify-between shrink-0">
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
            {t('groupTab.systemGroupLabel' as any)}
          </span>
          {seededCount < SYSTEM_GROUPS.length ? (
            <button onClick={seedSystemGroups} disabled={seeding}
              className="px-2 py-0.5 text-[10px] bg-amber-100 text-amber-700 border border-amber-300 rounded hover:bg-amber-200 disabled:opacity-50">
              {seeding ? t('groupTab.seedInitializing' as any) : t('groupTab.seedInit' as any)}
            </button>
          ) : (
            <span className="text-[10px] text-green-600 font-medium">{t('groupTab.seedDone' as any)}</span>
          )}
        </div>

        {/* 5개 시스템 그룹 */}
        <div className="px-2 space-y-0.5 shrink-0">
          {SYSTEM_GROUPS.map(sg => {
            const dbGrp = groups.find(g => g.grp_cd === sg.grp_cd)
            const isActive = selected?.grp_cd === sg.grp_cd
            const profileCnt = sg.profile_role
              ? profiles.filter(p => p.main_role === sg.profile_role).length
              : 0
            // DB 그룹 없을 때도 클릭 가능하도록 가상 그룹 객체 사용
            const clickTarget: Group = dbGrp ?? {
              grp_cd: sg.grp_cd,
              grp_nm: t(`groupTab.groups.${sg.grp_cd}.name` as any),
              grp_cont: t(`groupTab.groups.${sg.grp_cd}.desc` as any),
              use_yn: 'Y',
              grp_mbr: [],
            }
            return (
              <button key={sg.grp_cd} type="button"
                onClick={() => selectGroup(clickTarget)}
                className={`w-full text-left flex items-center gap-2 px-2.5 py-2 rounded-lg border transition-all
                  ${isActive
                    ? 'bg-white border-blue-300 shadow-sm ring-1 ring-blue-200'
                    : 'bg-white border-gray-200 hover:border-gray-300 hover:bg-blue-50'}`}>
                <div className={`w-1 h-8 rounded-full shrink-0 ${sg.bar}`} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-gray-800 truncate">
                      {t(`groupTab.groups.${sg.grp_cd}.name` as any)}
                    </span>
                    {!dbGrp && <span className="text-[9px] text-gray-400 shrink-0">{t('groupTab.notCreated' as any)}</span>}
                  </div>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className={`text-[9px] font-bold px-1 rounded border ${sg.badge.cls}`}>{sg.badge.text}</span>
                    <span className="text-[10px] text-gray-400">
                      {sg.profile_role
                        ? (t as any)('userRole.countBadge', { n: profileCnt })
                        : t('groupTab.daOnly' as any)}
                    </span>
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
            {(t as any)('groupTab.customGroupLabel', { n: customGroups.length })}
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
                  <div className="text-[10px] text-gray-400 font-mono truncate">
                    {g.grp_cd} · {(t as any)('groupTab.totalMembers', { n: g.grp_mbr?.length ?? 0 })}
                  </div>
                </div>
                {isActive && <span className="text-blue-400 text-xs shrink-0">›</span>}
              </button>
            )
          })}
          {customGroups.length === 0 && (
            <div className="text-center py-4 text-[11px] text-gray-400">
              {t('groupTab.noMembers' as any)}
            </div>
          )}
        </div>

        {/* 커스텀 그룹 추가 */}
        <div className="p-3 border-t bg-white shrink-0 space-y-1.5">
          <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
            {t('groupTab.groupAdd' as any)}
          </div>
          <input value={newGrp.grp_cd}
            onChange={e => setNewGrp(f => ({ ...f, grp_cd: e.target.value.toUpperCase() }))}
            placeholder={t('groupTab.groupCodePlaceholder' as any)}
            className="w-full border border-gray-300 rounded px-2 py-1 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-blue-400" />
          <input value={newGrp.grp_nm}
            onChange={e => setNewGrp(f => ({ ...f, grp_nm: e.target.value }))}
            placeholder={t('groupTab.groupNamePlaceholder' as any)}
            className="w-full border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400" />
          <button type="button" onClick={createGroup} disabled={saving}
            className="w-full py-1.5 bg-[#1e3a5f] text-white rounded text-xs hover:bg-[#2a4f7f] disabled:opacity-50">
            {saving ? t('groupTab.saving' as any) : t('groupTab.createGroup' as any)}
          </button>
        </div>
      </div>

      {/* ════════ 우측 패널 ════════ */}
      <div className="flex-1 flex overflow-hidden">
        {!selected ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-2">
            <span className="text-3xl">👈</span>
            <p className="text-sm">{t('groupTab.selectGroup' as any)}</p>
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
                      <span className="text-[9px] bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded">
                        {t('groupTab.systemGroupBadge' as any)}
                      </span>
                    )}
                    {sg4Selected?.profile_role && (
                      <span className="text-[9px] bg-blue-50 text-blue-500 px-1.5 py-0.5 rounded">
                        profiles.main_role = {sg4Selected.profile_role}
                      </span>
                    )}
                  </div>
                  {sg4Selected && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      {t(`groupTab.groups.${sg4Selected.grp_cd}.desc` as any)}
                    </p>
                  )}
                </div>
                {toast && <span className="ml-3 text-xs text-green-600 font-medium animate-pulse">{toast}</span>}
                {!SYSTEM_GRP_CODES.has(selected.grp_cd) && (
                  <button type="button" onClick={() => deleteGroup(selected.grp_cd)}
                    className="ml-auto px-3 py-1 text-xs text-red-500 border border-red-200 rounded hover:bg-red-50">
                    {t('groupTab.deleteGroup' as any)}
                  </button>
                )}
              </div>

              {/* ── 시스템 그룹: profiles 사용자 목록 ── */}
              {sg4Selected ? (
                <div className="flex-1 overflow-auto">
                  {sg4Selected.profile_role ? (
                    <table className="w-full text-xs border-collapse">
                      <thead className="sticky top-0 bg-[#2c4a6e] text-white z-10">
                        <tr>
                          {(['groupTab.colName','groupTab.colUsername','groupTab.colProfileRole','groupTab.colGroupMove','groupTab.colUserId'] as const).map(k => (
                            <th key={k} className="px-4 py-2.5 text-left font-medium border-r border-[#3a5a80] last:border-r-0">{t(k as any)}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {profilesForGroup.map((p, i) => (
                          <tr key={p.user_id ?? p.username ?? `profile-${i}`}
                            className={`border-b border-gray-100 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition-colors`}>
                            <td className="px-4 py-2.5 font-medium text-gray-800">{p.full_name ?? '—'}</td>
                            <td className="px-4 py-2.5 text-gray-500">{p.username ?? '—'}</td>
                            <td className="px-4 py-2.5">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${PROFILE_ROLE_BADGE[p.main_role] ?? 'bg-gray-100 text-gray-600'}`}>
                                {t(`groupTab.role.${p.main_role}` as any) || p.main_role}
                              </span>
                            </td>
                            <td className="px-4 py-2.5">
                              <select
                                aria-label={t('groupTab.colGroupMove' as any)}
                                defaultValue={p.main_role}
                                onChange={e => changeProfileRole(p.user_id, e.target.value)}
                                className="border border-gray-200 rounded px-1.5 py-0.5 text-[10px] focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white">
                                {movableRoles.map(r => (
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
                              {t('groupTab.noGroupUsers' as any)}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  ) : (
                    // G_MASTER: profiles 매핑 없음 → DA 전용 안내
                    <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2">
                      <span className="text-2xl">🗝️</span>
                      <p className="text-sm font-medium text-gray-500">{t('groupTab.masterGroupTitle' as any)}</p>
                      <p className="text-xs text-gray-400">{t('groupTab.masterGroupDesc1' as any)}</p>
                      <p className="text-xs text-gray-400">{t('groupTab.masterGroupDesc2' as any)}</p>
                    </div>
                  )}
                </div>
              ) : (
                /* ── 커스텀 그룹: 기존 grp_mbr 기반 사용자 목록 ── */
                <>
                  <div className="px-5 py-2.5 border-b bg-gray-50 flex items-center gap-2 shrink-0">
                    <span className="text-xs font-medium text-gray-600 shrink-0">{t('groupTab.memberAdd' as any)}</span>
                    <select aria-label={t('groupTab.selectUser' as any)} value={addUsr.usr_no}
                      onChange={e => setAddUsr(f => ({ ...f, usr_no: e.target.value }))}
                      className="border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none">
                      <option value="">{t('groupTab.selectUser' as any)}</option>
                      {usersNotInGroup.map(u => (
                        <option key={u.usr_no} value={u.usr_no}>{u.usr_nm} ({u.usr_no})</option>
                      ))}
                    </select>
                    <select aria-label={t('groupTab.colGroupRole' as any)} value={addUsr.mbr_role_cd}
                      onChange={e => setAddUsr(f => ({ ...f, mbr_role_cd: e.target.value }))}
                      className="border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none">
                      <option value="MANAGER">MANAGER</option>
                      <option value="SUBMANAGER">SUBMANAGER</option>
                      <option value="USER">USER</option>
                    </select>
                    <button type="button" onClick={addMember}
                      className="px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700">
                      {t('groupTab.add' as any)}
                    </button>
                    <span className="ml-auto text-xs text-gray-400">
                      {(t as any)('groupTab.totalMembers', { n: selected.grp_mbr?.length ?? 0 })}
                    </span>
                  </div>

                  <div className="flex-1 overflow-auto">
                    <table className="w-full text-xs border-collapse">
                      <thead className="sticky top-0 bg-[#2c4a6e] text-white z-10">
                        <tr>
                          {(['groupTab.colName','groupTab.colEmpNo','groupTab.colGroupRole','groupTab.colSubPerm','groupTab.colRemove'] as const).map(k => (
                            <th key={k} className="px-4 py-2.5 text-left font-medium border-r border-[#3a5a80] last:border-r-0">{t(k as any)}</th>
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
                                {m.mbr_role_cd === 'SUBMANAGER'
                                  ? <span className="text-teal-600">{t('groupTab.clickToSetPerm' as any)}</span>
                                  : '—'}
                              </td>
                              <td className="px-4 py-2.5">
                                <button type="button"
                                  onClick={e => { e.stopPropagation(); removeMember(m.usr_no) }}
                                  className="px-2 py-0.5 text-[10px] text-red-500 border border-red-200 rounded hover:bg-red-50">
                                  {t('groupTab.remove' as any)}
                                </button>
                              </td>
                            </tr>
                          )
                        })}
                        {(!selected.grp_mbr || selected.grp_mbr.length === 0) && (
                          <tr>
                            <td colSpan={5} className="text-center py-10 text-gray-400">
                              {t('groupTab.noMembers' as any)}
                            </td>
                          </tr>
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
                  <div className="text-[10px] font-bold text-teal-700 uppercase tracking-wide">
                    {t('groupTab.subPermPanel' as any)}
                  </div>
                  <div className="text-xs font-medium text-gray-800 mt-0.5">{focusMbrObj?.user_info?.usr_nm ?? focusMbr}</div>
                </div>
                <div className="flex-1 overflow-auto p-2 space-y-1">
                  <div className="text-[10px] text-gray-400 px-1 mb-1">{t('groupTab.subPermOnly' as any)}</div>
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
