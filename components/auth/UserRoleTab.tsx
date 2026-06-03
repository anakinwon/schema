'use client'
import { useEffect, useState, useCallback, useMemo } from 'react'
import { useTranslations } from 'next-intl'

interface Profile {
  id: string
  user_id: string
  username: string | null
  full_name: string | null
  main_role: 'admin' | 'master' | 'manager' | 'sub_admin' | 'user'
  avatar_url: string | null
}

// label/desc/limit 텍스트 제거 → 번역 키로 처리
const ROLE_GROUPS = [
  {
    role: 'admin'     as const,
    hasLimit: true,
    badge: 'bg-rose-100 text-rose-700 border-rose-200',
    bar:   'bg-rose-500',
    dot:   'bg-rose-500',
  },
  {
    role: 'master'    as const,
    hasLimit: true,
    badge: 'bg-purple-100 text-purple-700 border-purple-200',
    bar:   'bg-purple-500',
    dot:   'bg-purple-500',
  },
  {
    role: 'manager'   as const,
    hasLimit: false,
    badge: 'bg-blue-100 text-blue-700 border-blue-200',
    bar:   'bg-blue-500',
    dot:   'bg-blue-500',
  },
  {
    role: 'sub_admin' as const,
    hasLimit: false,
    badge: 'bg-teal-100 text-teal-700 border-teal-200',
    bar:   'bg-teal-500',
    dot:   'bg-teal-500',
  },
  {
    role: 'user'      as const,
    hasLimit: false,
    badge: 'bg-gray-100 text-gray-600 border-gray-200',
    bar:   'bg-gray-400',
    dot:   'bg-gray-400',
  },
]

type ProfileRole = 'admin' | 'master' | 'manager' | 'sub_admin' | 'user'

export default function UserRoleTab() {
  const t = useTranslations('standards')
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [saving, setSaving]     = useState<string | null>(null)
  const [toast, setToast]       = useState<{ text: string; ok: boolean } | null>(null)
  const [q, setQ]               = useState('')
  // 그룹별 접기/펼치기 상태 (사용자 그룹은 기본 접힘)
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set(['user']))

  const roleOptions = useMemo(() => [
    { value: 'admin'     as ProfileRole, label: t('userRole.roleOption.admin' as any) },
    { value: 'master'    as ProfileRole, label: t('userRole.roleOption.master' as any) },
    { value: 'manager'   as ProfileRole, label: t('userRole.roleOption.manager' as any) },
    { value: 'sub_admin' as ProfileRole, label: t('userRole.roleOption.sub_admin' as any) },
    { value: 'user'      as ProfileRole, label: t('userRole.roleOption.user' as any) },
  ], [t])

  const showToast = (text: string, ok: boolean) => {
    setToast({ text, ok }); setTimeout(() => setToast(null), 3000)
  }

  const load = useCallback(async () => {
    const r = await fetch('/api/admin/profiles')
    const data = await r.json()
    setProfiles(Array.isArray(data) ? data : [])
  }, [])

  useEffect(() => { load() }, [load])

  const changeRole = async (user_id: string, main_role: string) => {
    const profile = profiles.find(p => p.user_id === user_id)
    if (!profile) return
    setSaving(profile.id)
    const r = await fetch('/api/admin/profiles', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id, main_role }),
    })
    if (r.ok) {
      setProfiles(prev =>
        prev.map(p => p.user_id === user_id ? { ...p, main_role: main_role as ProfileRole } : p)
      )
      showToast(t('userRole.roleChanged' as any), true)
    } else {
      const e = await r.json()
      showToast(e.error ?? t('userRole.changeFailed' as any), false)
    }
    setSaving(null)
  }

  const toggleCollapse = (role: string) => {
    setCollapsed(prev => {
      const next = new Set(prev)
      next.has(role) ? next.delete(role) : next.add(role)
      return next
    })
  }

  // 검색 필터 적용
  const filtered = profiles.filter(p => {
    if (!q) return true
    const keyword = q.toLowerCase()
    return (
      (p.full_name ?? '').toLowerCase().includes(keyword) ||
      (p.username ?? '').toLowerCase().includes(keyword) ||
      p.user_id.toLowerCase().includes(keyword)
    )
  })

  const countByRole = (role: string) => profiles.filter(p => p.main_role === role).length

  return (
    <div className="flex flex-col h-full">

      {/* ── 상단: 역할별 현황 카드 + 검색 ── */}
      <div className="flex items-center gap-2 px-4 py-3 border-b bg-gray-50 shrink-0 flex-wrap">
        {ROLE_GROUPS.map(rg => (
          <button key={rg.role} type="button"
            onClick={() => {
              setCollapsed(prev => {
                const next = new Set(prev); next.delete(rg.role); return next
              })
              setQ('')
            }}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs transition-colors hover:opacity-80 ${rg.badge}`}>
            <span className={`w-2 h-2 rounded-full shrink-0 ${rg.dot}`} />
            <span className="font-semibold">{t(`userRole.${rg.role}.label` as any)}</span>
            <span className="font-bold text-sm">{(t as any)('userRole.countBadge', { n: countByRole(rg.role) })}</span>
            {rg.hasLimit && <span className="text-[10px] opacity-60">{t(`userRole.${rg.role}.limit` as any)}</span>}
          </button>
        ))}

        <div className="ml-auto flex items-center gap-2">
          <input value={q} onChange={e => setQ(e.target.value)}
            placeholder={t('userRole.searchPlaceholder' as any)}
            className="border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400 w-44" />
          {q && (
            <button onClick={() => setQ('')}
              className="text-xs text-gray-400 hover:text-gray-600">✕</button>
          )}
        </div>
      </div>

      {/* ── 알림 ── */}
      {toast && (
        <div className={`px-4 py-2 text-xs font-medium ${toast.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
          {toast.ok ? '✓' : '✗'} {toast.text}
        </div>
      )}

      {/* ── 그룹별 사용자 목록 ── */}
      <div className="flex-1 overflow-auto">
        {ROLE_GROUPS.map(rg => {
          const groupUsers = filtered.filter(p => p.main_role === rg.role)
          const isCollapsed = collapsed.has(rg.role)
          const totalInGroup = countByRole(rg.role)

          // 검색 중이고 이 그룹에 결과 없으면 숨김
          if (q && groupUsers.length === 0) return null

          return (
            <div key={rg.role} className="border-b border-gray-200">

              {/* 그룹 헤더 */}
              <button type="button"
                onClick={() => toggleCollapse(rg.role)}
                className="w-full flex items-center gap-3 px-4 py-2.5 bg-gray-50 hover:bg-gray-100 transition-colors text-left">
                <div className={`w-1 h-6 rounded-full shrink-0 ${rg.bar}`} />
                <div className="flex items-center gap-2 flex-1">
                  <span className="text-xs font-bold text-gray-700">{t(`userRole.${rg.role}.label` as any)}</span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${rg.badge}`}>
                    {(t as any)('userRole.countBadge', { n: totalInGroup })}
                  </span>
                  <span className="text-[10px] text-gray-400">{t(`userRole.${rg.role}.desc` as any)}</span>
                  {rg.hasLimit && <span className="text-[10px] text-gray-400">{t(`userRole.${rg.role}.limit` as any)}</span>}
                </div>
                <span className="text-gray-400 text-xs">
                  {isCollapsed ? '▶' : '▼'}
                </span>
              </button>

              {/* 사용자 행 */}
              {!isCollapsed && (
                <table className="w-full text-xs border-collapse">
                  {groupUsers.length > 0 && (
                    <thead className="bg-[#f1f5f9] text-gray-500">
                      <tr>
                        {(['userRole.colName','userRole.colUsername','userRole.colCurrentRole','userRole.colRoleChange','userRole.colUserId'] as const).map(k => (
                          <th key={k} className="px-4 py-2 text-left font-medium border-r border-gray-200 last:border-r-0">{t(k as any)}</th>
                        ))}
                      </tr>
                    </thead>
                  )}
                  <tbody>
                    {groupUsers.map((p, i) => (
                      <tr key={p.id}
                        className={`border-b border-gray-100 hover:bg-blue-50 transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                        <td className="px-4 py-2.5 font-medium text-gray-800">
                          {p.full_name ?? '—'}
                        </td>
                        <td className="px-4 py-2.5 text-gray-500">
                          {p.username ?? '—'}
                        </td>
                        <td className="px-4 py-2.5">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${rg.badge}`}>
                            {t(`userRole.${rg.role}.label` as any)}
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
                          {p.user_id ? (
                            <div className="flex items-center gap-2">
                              <select
                                aria-label={t('userRole.colRoleChange' as any)}
                                value={p.main_role}
                                onChange={e => changeRole(p.user_id!, e.target.value)}
                                disabled={saving === p.id}
                                className="border border-gray-200 rounded px-2 py-1 text-[11px] focus:outline-none focus:ring-1 focus:ring-blue-400 disabled:opacity-50 bg-white">
                                {roleOptions.map(ro => (
                                  <option key={ro.value} value={ro.value}>{ro.label}</option>
                                ))}
                              </select>
                              {saving === p.id && (
                                <span className="text-blue-400 text-[10px] animate-pulse">{t('userRole.saving' as any)}</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-[10px] text-gray-300">{t('userRole.noUserId' as any)}</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 font-mono text-[10px] text-gray-300 max-w-[160px] truncate">
                          {p.user_id ?? '—'}
                        </td>
                      </tr>
                    ))}
                    {groupUsers.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-4 py-4 text-center text-gray-400 text-[11px]">
                          {t('userRole.emptyGroup' as any)}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          )
        })}
      </div>

      {/* ── 하단 요약 ── */}
      <div className="px-4 py-2 bg-gray-100 border-t text-xs text-gray-500 flex items-center gap-3 shrink-0">
        <span>{(t as any)('userRole.totalCount', { n: profiles.length })}</span>
        {q && <span>{(t as any)('userRole.searchCount', { n: filtered.length })}</span>}
        <span className="ml-auto text-[10px] text-gray-400">Supabase · profiles 테이블</span>
      </div>
    </div>
  )
}
