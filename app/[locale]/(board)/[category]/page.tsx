import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { CATEGORY_NAME, VALID_CATEGORIES, canWrite } from '@/lib/board'
import BoardList from '@/components/board/BoardList'
import { createSupabaseServer } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase'

// profiles.main_role(소문자) → RBAC 역할 코드(대문자) — auth-guard 와 동일 기준
const PROFILE_ROLE_MAP: Record<string, string> = {
  admin:     'ADMIN',
  master:    'MASTER',
  manager:   'MANAGER',
  sub_admin: 'SUBMANAGER',
  user:      'USER',
}

type Props = { params: Promise<{ locale: string; category: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category } = await params
  const name = CATEGORY_NAME[category.toUpperCase()]
  if (!name) return { title: '게시판' }
  return { title: `${name} — 통합게시판` }
}

export default async function CategoryPage({ params }: Props) {
  const { category } = await params

  if (!VALID_CATEGORIES.includes(category.toUpperCase())) {
    notFound()
  }

  // 현재 사용자 역할을 확인해 카테고리별 글쓰기 권한을 동적으로 판단
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()

  let writeAllowed = false
  if (user) {
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('main_role')
      .eq('user_id', user.id)
      .maybeSingle()

    const roleCd = PROFILE_ROLE_MAP[profile?.main_role ?? ''] ?? 'USER'
    writeAllowed = canWrite(category.toUpperCase(), roleCd)
  }

  return <BoardList category={category} canWrite={writeAllowed} />
}
