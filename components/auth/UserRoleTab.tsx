'use client'
import { useEffect, useState, useCallback } from 'react'

interface UserRow {
  usr_no: string; usr_nm: string; dept_no: string | null
  role_cd: string | null; use_yn: string
}

const ROLE_INFO: Record<string, { label: string; color: string; badge: string }> = {
  ADMIN:      { label: '수퍼관리자', color: 'bg-red-100 text-red-700 border-red-300',       badge: 'bg-red-600' },
  MASTER:     { label: '마스터',     color: 'bg-orange-100 text-orange-700 border-orange-300', badge: 'bg-orange-500' },
  MANAGER:    { label: '매니저',     color: 'bg-blue-100 text-blue-700 border-blue-300',     badge: 'bg-blue-600' },
  SUBMANAGER: { label: '부매니저',   color: 'bg-teal-100 text-teal-700 border-teal-300',     badge: 'bg-teal-600' },
  USER:       { label: '일반사용자', color: 'bg-gray-100 text-gray-600 border-gray-300',     badge: 'bg-gray-500' },
}

export default function UserRoleTab() {
  const [users, setUsers] = useState<UserRow[]>([])
  const [saving, setSaving] = useState<string | null>(null)
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null)
  const [q, setQ] = useState('')

  const load = useCallback(async () => {
    const r = await fetch('/api/auth/users')
    setUsers(await r.json())
  }, [])
  useEffect(() => { load() }, [load])

  const setRole = async (usr_no: string, role_cd: string) => {
    setSaving(usr_no)
    const r = await fetch('/api/auth/users', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usr_no, role_cd }),
    })
    if (r.ok) {
      setUsers(prev => prev.map(u => u.usr_no === usr_no ? { ...u, role_cd } : u))
      setMsg({ text: '역할이 저장되었습니다.', ok: true })
    } else {
      const { error } = await r.json()
      setMsg({ text: error, ok: false })
    }
    setSaving(null)
    setTimeout(() => setMsg(null), 3000)
  }

  const countByRole = (rc: string) => users.filter(u => u.role_cd === rc).length
  const filtered = users.filter(u =>
    !q || u.usr_nm.includes(q) || u.usr_no.includes(q)
  )

  return (
    <div className="flex flex-col h-full">
      {/* 역할별 현황 카드 */}
      <div className="flex gap-3 p-3 border-b bg-gray-50 shrink-0">
        {Object.entries(ROLE_INFO).map(([rc, info]) => (
          <div key={rc} className={`flex items-center gap-2 px-3 py-1.5 rounded border text-xs ${info.color}`}>
            <span className={`w-2 h-2 rounded-full ${info.badge}`} />
            <span className="font-medium">{info.label}</span>
            <span className="font-bold">{countByRole(rc)}</span>명
            {rc === 'ADMIN'  && <span className="text-[10px] opacity-60">(최대 1명)</span>}
            {rc === 'MASTER' && <span className="text-[10px] opacity-60">(최대 2명)</span>}
          </div>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <input value={q} onChange={e => setQ(e.target.value)}
            placeholder="이름/번호 검색"
            className="border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400 w-36"
          />
        </div>
      </div>

      {/* 알림 */}
      {msg && (
        <div className={`px-4 py-2 text-xs font-medium ${msg.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
          {msg.ok ? '✓' : '✗'} {msg.text}
        </div>
      )}

      {/* 사용자 목록 */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-xs border-collapse">
          <thead className="sticky top-0 bg-[#2c4a6e] text-white">
            <tr>
              {['번호','사용자명','부서','현재역할','역할변경'].map(h => (
                <th key={h} className="px-4 py-2.5 text-left border-r border-[#3a5a80] last:border-r-0">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((u, i) => {
              const roleInfo = ROLE_INFO[u.role_cd ?? 'USER']
              return (
                <tr key={u.usr_no}
                  className={`border-b border-gray-200 hover:bg-blue-50 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                  <td className="px-4 py-2 font-mono text-gray-400 w-24">{u.usr_no}</td>
                  <td className="px-4 py-2 font-medium text-gray-800">{u.usr_nm}</td>
                  <td className="px-4 py-2 text-gray-500">{u.dept_no ?? '—'}</td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-0.5 rounded border text-[11px] font-medium ${roleInfo?.color ?? 'bg-gray-100 text-gray-500'}`}>
                      {roleInfo?.label ?? u.role_cd ?? '미지정'}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      <select
                        defaultValue={u.role_cd ?? 'USER'}
                        onChange={e => setRole(u.usr_no, e.target.value)}
                        disabled={saving === u.usr_no}
                        className="border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400 disabled:opacity-50"
                      >
                        {Object.entries(ROLE_INFO).map(([rc, ri]) => (
                          <option key={rc} value={rc}>{rc} — {ri.label}</option>
                        ))}
                      </select>
                      {saving === u.usr_no && (
                        <span className="text-blue-500 text-[10px] animate-pulse">저장중…</span>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={5} className="text-center py-8 text-gray-400">사용자가 없습니다</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="px-4 py-1.5 bg-gray-100 border-t text-xs text-gray-500">
        총 {users.length}명 · 표시 {filtered.length}명
      </div>
    </div>
  )
}
