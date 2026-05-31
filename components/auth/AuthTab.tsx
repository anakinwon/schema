'use client'
import { useState } from 'react'
import RoleMatrix from './RoleMatrix'
import UserRoleTab from './UserRoleTab'
import GroupTab from './GroupTab'

type Sub = 'matrix' | 'users' | 'groups'
const SUBS: { key: Sub; label: string; icon: string; desc: string }[] = [
  { key: 'matrix', label: '역할-권한 매트릭스', icon: '🗝️', desc: '역할별 권한 설정' },
  { key: 'users',  label: '사용자 역할 관리',  icon: '👥', desc: '역할 부여/변경' },
  { key: 'groups', label: '그룹 관리',          icon: '🏢', desc: '그룹·구성원·SubManager 권한' },
]

export default function AuthTab() {
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
            <span>{s.icon}</span>{s.label}
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
