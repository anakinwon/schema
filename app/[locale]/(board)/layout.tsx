import { cookies } from 'next/headers'
import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import { VALID_CATEGORIES } from '@/lib/board'
import { createSupabaseServer } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyAdminToken } from '@/lib/admin-auth'
import BoardUserMenu from './BoardUserMenu'
import CountrySelector from '@/components/i18n/CountrySelector'

const ADMIN_ROLES = ['admin', 'master']

interface SessionInfo {
  isAdmin: boolean
  isAdminSession: boolean
  userName: string | null
}

async function getSessionInfo(): Promise<SessionInfo> {
  const cookieStore = await cookies()
  const adminToken = cookieStore.get('admin-session')?.value
  if (adminToken && verifyAdminToken(adminToken)) {
    return { isAdmin: true, isAdminSession: true, userName: '관리자' }
  }
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { isAdmin: false, isAdminSession: false, userName: null }
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('main_role, full_name, username')
    .eq('user_id', user.id)
    .maybeSingle()
  const isAdmin = ADMIN_ROLES.includes(profile?.main_role ?? '')
  const userName = profile?.full_name ?? profile?.username ?? user.email?.split('@')[0] ?? null
  return { isAdmin, isAdminSession: false, userName }
}

export default async function BoardLayout({ children }: { children: React.ReactNode }) {
  const [t, { isAdmin, isAdminSession, userName }] = await Promise.all([
    getTranslations('board'),
    getSessionInfo(),
  ])

  return (
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
      <header className="bg-[#1e3a5f] text-white shrink-0">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-lg font-semibold tracking-wide">대시보드</h1>
          <div className="flex items-center gap-3">
            {isAdmin && (
              <Link href="/admin" className="text-sm text-blue-200 hover:text-white transition-colors">
                ← 관리자페이지(Back Office)
              </Link>
            )}
            <CountrySelector />
            {userName && (
              <BoardUserMenu userName={userName} isAdminSession={isAdminSession} />
            )}
          </div>
        </div>
        <nav className="max-w-5xl mx-auto px-4 flex gap-1 pb-0">
          {VALID_CATEGORIES.map((code) => (
            <Link
              key={code}
              href={`/${code.toLowerCase()}`}
              className="px-4 py-2 text-sm font-medium text-blue-100 hover:text-white hover:bg-white/10 rounded-t transition-colors"
            >
              {t(`categories.${code}` as any)}
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
