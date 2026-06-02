import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import AdminLogoutButton from './AdminLogoutButton'
import CountrySelector from '@/components/i18n/CountrySelector'
import { createSupabaseServer } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyAdminToken } from '@/lib/admin-auth'

export const metadata: Metadata = {
  title: '관리자 — 표준데이터 관리 프로그램',
}

const NAV_LINKS = [
  { href: '/admin',            label: '대시보드',  icon: '📊' },
  { href: '/admin/standards',  label: '표준관리',  icon: '📝' },
  { href: '/admin/codes',      label: '공통코드',  icon: '🗂️' },
  { href: '/admin/audit',      label: '변경이력',  icon: '📋' },
  { href: '/admin/approval',   label: '승인관리',  icon: '✅' },
  { href: '/admin/sync',       label: '동기화',    icon: '🔄' },
  { href: '/admin/users',      label: '사용자관리', icon: '👥' },
  { href: '/admin/board',      label: '게시판관리', icon: '📢' },
]

async function getAdminUserInfo(): Promise<{ userName: string; isAdminSession: boolean }> {
  const cookieStore = await cookies()

  // admin 쿠키 세션 확인
  const adminToken = cookieStore.get('admin-session')?.value
  const isAdminSession = !!(adminToken && verifyAdminToken(adminToken))

  // Supabase 세션에서 사용자명 조회
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('full_name, username')
      .eq('user_id', user.id)
      .maybeSingle()
    const userName =
      profile?.full_name ?? profile?.username ?? user.email?.split('@')[0] ?? '관리자'
    return { userName, isAdminSession }
  }

  return { userName: '관리자', isAdminSession }
}

export default async function AdminProtectedLayout({ children }: { children: React.ReactNode }) {
  const { userName, isAdminSession } = await getAdminUserInfo()

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <header className="bg-gray-900 text-white px-6 py-3 flex items-center gap-4 shadow shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xl">🔐</span>
          <div>
            <div className="text-sm font-bold leading-tight">표준데이터 관리 · 관리자</div>
            <div className="text-[11px] text-gray-400 leading-tight">Back Office · Admin</div>
          </div>
        </div>

        <nav className="ml-8 flex gap-1">
          {NAV_LINKS.map((link) => (
            <a key={link.href} href={link.href}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-sm text-gray-300 hover:text-white hover:bg-white/10 transition-colors">
              <span className="text-xs">{link.icon}</span>
              {link.label}
            </a>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <CountrySelector
            triggerClass="text-gray-300 border-gray-600 hover:text-white hover:bg-white/10 hover:border-gray-400"
          />
          <AdminLogoutButton userName={userName} isAdminSession={isAdminSession} />
        </div>
      </header>

      <main className="flex-1 overflow-hidden">{children}</main>
    </div>
  )
}
