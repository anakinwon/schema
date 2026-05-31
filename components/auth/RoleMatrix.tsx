'use client'
import React, { useEffect, useState, useCallback } from 'react'

interface Role  { role_cd: string; role_nm: string; role_lvl: number; role_cont: string }
interface Perm  { perm_cd: string; perm_nm: string; perm_cat_cd: string }
interface RolePermRow { role_cd: string; perm_cd: string; grnt_yn: string }

const CAT_LABEL: Record<string, string> = {
  STD_WORD: '표준단어', STD_DOM: '표준도메인', STD_TERM: '표준용어',
  STD_MGMT: '표준관리', SYS_MGMT: '시스템관리',
}
const CAT_COLOR: Record<string, string> = {
  STD_WORD: 'bg-blue-50',  STD_DOM: 'bg-indigo-50', STD_TERM: 'bg-purple-50',
  STD_MGMT: 'bg-amber-50', SYS_MGMT: 'bg-red-50',
}
const ROLE_COLOR: Record<string, string> = {
  ADMIN: 'bg-red-600', MASTER: 'bg-orange-500',
  MANAGER: 'bg-blue-600', SUBMANAGER: 'bg-teal-600', USER: 'bg-gray-500',
}

export default function RoleMatrix() {
  const [roles, setRoles] = useState<Role[]>([])
  const [perms, setPerms] = useState<Perm[]>([])
  const [matrix, setMatrix] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState<string | null>(null)
  const [authError, setAuthError] = useState<string | null>(null)

  const load = useCallback(async () => {
    const [r, p, rpRes] = await Promise.all([
      fetch('/api/auth/roles').then(x => x.json()),
      fetch('/api/auth/perms').then(x => x.json()),
      fetch('/api/auth/role-perm').then(async x => ({ ok: x.ok, body: await x.json() })),
    ])
    setRoles(Array.isArray(r) ? r : [])
    setPerms(Array.isArray(p) ? p : [])

    if (!rpRes.ok) {
      setAuthError(rpRes.body?.error ?? '역할-권한 조회에 실패했습니다')
      setMatrix(new Set())
      return
    }
    setAuthError(null)
    const rp: RolePermRow[] = Array.isArray(rpRes.body) ? rpRes.body : []
    setMatrix(new Set(rp.map(x => `${x.role_cd}::${x.perm_cd}`)))
  }, [])

  useEffect(() => { load() }, [load])

  const toggle = async (role_cd: string, perm_cd: string, current: boolean) => {
    const key = `${role_cd}::${perm_cd}`
    setSaving(key)
    // ADMIN은 수정 불가 (전체 권한 고정)
    if (role_cd === 'ADMIN') { setSaving(null); return }

    const grnt_yn = current ? 'N' : 'Y'
    const r = await fetch('/api/auth/role-perm', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role_cd, perm_cd, grnt_yn }),
    })
    if (r.ok) {
      setMatrix(prev => {
        const next = new Set(prev)
        grnt_yn === 'Y' ? next.add(key) : next.delete(key)
        return next
      })
    }
    setSaving(null)
  }

  // 권한을 카테고리별로 그룹화
  const cats = [...new Set(perms.map(p => p.perm_cat_cd))]

  return (
    <div className="flex flex-col h-full">
      {authError && (
        <div className="px-4 py-2 bg-red-50 border-b border-red-200 text-xs text-red-700">
          ⚠ {authError} — ADMIN 또는 MASTER 계정으로 로그인 후 이용하세요.
        </div>
      )}
      <div className="p-3 border-b bg-gray-50 text-xs text-gray-500">
        ※ ADMIN은 모든 권한 고정 / 체크박스 클릭으로 역할-권한을 즉시 부여·회수합니다
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full text-xs border-collapse">
          <thead className="sticky top-0 z-10">
            <tr>
              <th className="bg-[#2c4a6e] text-white px-4 py-2.5 text-left border-r border-[#3a5a80] min-w-[200px]">
                권한
              </th>
              {roles.map(role => (
                <th key={role.role_cd}
                  className="bg-[#2c4a6e] text-white px-3 py-2.5 text-center border-r border-[#3a5a80] min-w-[100px]">
                  <div className="flex flex-col items-center gap-1">
                    <span className={`px-2 py-0.5 rounded text-white text-[10px] font-bold ${ROLE_COLOR[role.role_cd] ?? 'bg-gray-500'}`}>
                      {role.role_cd}
                    </span>
                    <span className="text-[11px] font-normal text-blue-200">{role.role_nm}</span>
                    <span className="text-[10px] text-blue-300">Lv.{role.role_lvl}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cats.map(cat => (
              <React.Fragment key={cat}>
                {/* 카테고리 헤더 */}
                <tr>
                  <td colSpan={roles.length + 1}
                    className={`px-4 py-1.5 font-semibold text-[11px] text-gray-600 border-b ${CAT_COLOR[cat] ?? 'bg-gray-50'}`}>
                    ▸ {CAT_LABEL[cat] ?? cat}
                  </td>
                </tr>
                {/* 권한 행 */}
                {perms.filter(p => p.perm_cat_cd === cat).map((perm, i) => (
                  <tr key={perm.perm_cd}
                    className={`border-b border-gray-200 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50`}>
                    <td className="px-4 py-2 border-r border-gray-200">
                      <div className="font-medium text-gray-800">{perm.perm_nm}</div>
                      <div className="text-[10px] text-gray-400 font-mono">{perm.perm_cd}</div>
                    </td>
                    {roles.map(role => {
                      const key = `${role.role_cd}::${perm.perm_cd}`
                      const has = matrix.has(key)
                      const isSaving = saving === key
                      const isAdmin = role.role_cd === 'ADMIN'
                      return (
                        <td key={role.role_cd} className="px-3 py-2 text-center border-r border-gray-200">
                          <button
                            type="button"
                            onClick={() => toggle(role.role_cd, perm.perm_cd, has)}
                            disabled={isSaving || isAdmin}
                            title={isAdmin ? 'ADMIN은 모든 권한 고정' : (has ? '클릭하여 회수' : '클릭하여 부여')}
                            className={`w-7 h-7 rounded-full flex items-center justify-center mx-auto transition-all
                              ${isSaving ? 'opacity-50 animate-pulse' : ''}
                              ${isAdmin ? 'cursor-default' : 'cursor-pointer hover:scale-110'}
                              ${has
                                ? `${ROLE_COLOR[role.role_cd] ?? 'bg-blue-500'} text-white shadow`
                                : 'bg-gray-100 border-2 border-gray-300 text-gray-300'
                              }`}
                          >
                            {has ? '✓' : ''}
                          </button>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* 범례 */}
      <div className="flex items-center gap-4 px-4 py-2 bg-gray-50 border-t text-xs text-gray-500">
        <span className="font-medium">역할 레벨:</span>
        {roles.map(r => (
          <span key={r.role_cd} className="flex items-center gap-1">
            <span className={`px-1.5 py-0.5 rounded text-white text-[10px] ${ROLE_COLOR[r.role_cd] ?? 'bg-gray-500'}`}>
              {r.role_cd}
            </span>
            <span>{r.role_nm}</span>
          </span>
        ))}
      </div>
    </div>
  )
}
