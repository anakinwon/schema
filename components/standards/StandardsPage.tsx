'use client'
import { useState, useEffect, useMemo } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import WordTab from './WordTab'
import DomainTab from './DomainTab'
import TermTab from './TermTab'
import AuthTab from '@/components/auth/AuthTab'
import GlobalSearch from './GlobalSearch'

type Tab = 'word' | 'domain' | 'term' | 'auth'

const TABS: { key: Tab; label: string; icon: string; badge?: string }[] = [
  { key: 'word',   label: '표준단어 관리',  icon: '📝' },
  { key: 'domain', label: '표준도메인 관리', icon: '🗂️' },
  { key: 'term',   label: '표준용어 관리',  icon: '📋' },
  { key: 'auth',   label: '권한 관리',      icon: '🔐', badge: 'RBAC' },
]

const ROLE_LABEL: Record<string, string> = {
  admin: '시스템관리자', master: '데이터관리자', manager: '표준관리자',
  sub_admin: '부표준관리자', user: '일반사용자',
}

interface UserInfo { displayName: string; role: string; email: string }

export default function StandardsPage() {
  const [tab, setTab] = useState<Tab>('word')
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null)
  const [loggingOut, setLoggingOut] = useState(false)

  const supabase = useMemo(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  ), [])

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return
      // 프로필에서 이름·역할 조회
      const res = await fetch('/api/profile', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (res.ok) {
        const p = await res.json()
        setUserInfo({
          displayName: p.full_name ?? p.email?.split('@')[0] ?? '사용자',
          role: p.main_role ?? 'user',
          email: p.email ?? '',
        })
      } else {
        setUserInfo({ displayName: session.user.email ?? '사용자', role: 'user', email: session.user.email ?? '' })
      }
    })
  }, [supabase])

  const handleLogout = async () => {
    setLoggingOut(true)
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      <header className="bg-[#1e3a5f] text-white px-6 py-3 flex items-center gap-4 shrink-0 shadow">
        <div className="flex items-center gap-2">
          <span className="text-xl">🗃️</span>
          <div>
            <div className="text-base font-bold leading-tight">표준데이터 관리 프로그램</div>
            <div className="text-[11px] text-blue-200 leading-tight">DA Standard Data Management · 쇼핑몰</div>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-3 text-xs text-blue-300">
          <a href="/notice" className="hidden sm:flex items-center gap-1 px-2 py-1 rounded hover:bg-white/10 transition-colors text-blue-200 hover:text-white text-xs">
            📢 게시판
          </a>
          <span className="hidden lg:block">DA#5 SQLiteDB_for_META_v5 · Supabase PostgreSQL</span>
          {userInfo && (
            <>
              <a href="/profile"
                className="flex items-center gap-2 px-2.5 py-1 rounded hover:bg-white/10 transition-colors group"
                title="내 프로필">
                <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-[11px] font-bold text-white">
                  {userInfo.displayName[0].toUpperCase()}
                </div>
                <div className="hidden sm:block text-left">
                  <div className="text-white text-[11px] font-medium leading-tight group-hover:underline">
                    {userInfo.displayName}
                  </div>
                  <div className="text-blue-300 text-[10px] leading-tight">
                    {ROLE_LABEL[userInfo.role] ?? userInfo.role}
                  </div>
                </div>
              </a>
              <button
                onClick={handleLogout}
                disabled={loggingOut}
                className="px-2.5 py-1 bg-white/10 hover:bg-white/20 text-white rounded text-xs transition-colors disabled:opacity-60"
              >
                {loggingOut ? '...' : '로그아웃'}
              </button>
            </>
          )}
        </div>
      </header>

      <div className="flex gap-0 border-b border-gray-300 bg-white shrink-0">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-3 sm:px-6 py-2.5 text-xs sm:text-sm font-medium border-b-2 transition-colors
              ${tab === t.key
                ? 'border-[#1e3a5f] text-[#1e3a5f] bg-white'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}>
            <span>{t.icon}</span>
            {t.label}
            {t.badge && (
              <span className="px-1.5 py-0.5 text-[9px] bg-orange-100 text-orange-600 rounded font-bold">
                {t.badge}
              </span>
            )}
          </button>
        ))}
        <div className="ml-auto flex items-center px-4 gap-3">
          <GlobalSearch onNavigate={setTab} />
        </div>
      </div>

      <main className="flex-1 overflow-hidden bg-white">
        {tab === 'word'   && <WordTab />}
        {tab === 'domain' && <DomainTab />}
        {tab === 'term'   && <TermTab />}
        {tab === 'auth'   && <AuthTab />}
      </main>
    </div>
  )
}
