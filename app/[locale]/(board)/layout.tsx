import Link from 'next/link'
import { cookies } from 'next/headers'
import { CATEGORY_NAME } from '@/lib/board'
import { createSupabaseServer } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyAdminToken } from '@/lib/admin-auth'
import BoardUserMenu from './BoardUserMenu'

const ADMIN_ROLES = ['admin', 'master']

interface SessionInfo {
  isAdmin: boolean
  isAdminSession: boolean
  userName: string | null
}

async function getSessionInfo(): Promise<SessionInfo> {
  const cookieStore = await cookies()

  // 1) admin 쿠키 세션 (Back Office 로그인)
  const adminToken = cookieStore.get('admin-session')?.value
  if (adminToken && verifyAdminToken(adminToken)) {
    return { isAdmin: true, isAdminSession: true, userName: '관리자' }
  }

  // 2) Supabase JWT 세션
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { isAdmin: false, isAdminSession: false, userName: null }

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('main_role, full_name, username')
    .eq('user_id', user.id)
    .maybeSingle()

  const isAdmin = ADMIN_ROLES.includes(profile?.main_role ?? '')
  const userName =
    profile?.full_name ?? profile?.username ?? user.email?.split('@')[0] ?? null

  return { isAdmin, isAdminSession: false, userName }
}

export default async function BoardLayout({ children }: { children: React.ReactNode }) {
  const categories = Object.entries(CATEGORY_NAME)
  const { isAdmin, isAdminSession, userName } = await getSessionInfo()

  return (
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
      <header className="bg-[#1e3a5f] text-white shrink-0">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-lg font-semibold tracking-wide">대시보드</h1>
          <div className="flex items-center gap-4">
            {isAdmin && (
              <Link href="/admin" className="text-sm text-blue-200 hover:text-white transition-colors">
                ← 관리자페이지(Back Office)
              </Link>
            )}
            {userName && (
              <BoardUserMenu userName={userName} isAdminSession={isAdminSession} />
            )}
          </div>
        </div>
        <nav className="max-w-5xl mx-auto px-4 flex gap-1 pb-0">
          {categories.map(([code, name]) => (
            <Link
              key={code}
              href={`/${code.toLowerCase()}`}
              className="px-4 py-2 text-sm font-medium text-blue-100 hover:text-white hover:bg-white/10 rounded-t transition-colors"
            >
              {name}
            </Link>
          ))}
        </nav>
      </header>
      <main className="flex-1 min-h-0 overflow-y-auto">
        <div className="min-h-full max-w-5xl mx-auto px-4 py-6 flex flex-col">
          {children}
        </div>
      </main>
    </div>
  )
}
