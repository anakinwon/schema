'use client'
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import RoleMatrix from './RoleMatrix'
import UserRoleTab from './UserRoleTab'
import GroupTab from './GroupTab'

type Sub = 'matrix' | 'users' | 'groups'
const SUBS: { key: Sub; tKey: string; icon: string }[] = [
  { key: 'matrix', tKey: 'auth.matrix', icon: '🗝️' },
  { key: 'users',  tKey: 'auth.users',  icon: '👥' },
  { key: 'groups', tKey: 'auth.groups', icon: '🏢' },
]

export default function AuthTab() {
  const t = useTranslations('standards')
  const [sub, setSub] = useState<Sub>('matrix')

  return (
    <div className="flex flex-col h-full">
      {/* 서브탭 */}
      <div className="flex items-center gap-0 border-b bg-white px-4 shrink-0">
        {SUBS.map(s => (
          <button key={s.key} onClick={() => setSub(s.key)}
            className={`flex items-center gap-1.5 px-2 sm:px-4 py-2 text-[11px] sm:text-xs font-medium border-b-2 transition-colors
              ${sub === s.key
                ? 'border-blue-600 text-blue-700 bg-white'
                : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            <span>{s.icon}</span>{t(s.tKey as any)}
          </button>
        ))}

        {/* 권한계층 범례 */}
        <div className="ml-auto flex items-center gap-1 text-[10px] text-gray-400">
          {['ADMIN', 'MASTER', 'MANAGER', 'SUBMANAGER', 'USER'].map((r, i, arr) => (
            <span key={r} className="flex items-center gap-0.5">
              <span className="font-medium text-gray-600">{r}</span>
              {i < arr.length - 1 && <span className="text-gray-300 mx-0.5">›</span>}
            </span>
          ))}
        </div>
      </div>

      {/* 서브탭 콘텐츠 */}
      <div className="flex-1 overflow-hidden">
        {sub === 'matrix' && <RoleMatrix />}
        {sub === 'users'  && <UserRoleTab />}
        {sub === 'groups' && <GroupTab />}
      </div>
    </div>
  )
}
