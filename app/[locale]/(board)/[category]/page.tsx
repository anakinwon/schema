import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import type { Locale } from '@/i18n/routing'
import { VALID_CATEGORIES, canWrite } from '@/lib/board'
import BoardList from '@/components/board/BoardList'
import { createSupabaseServer } from '@/lib/supabase-server'

const PROFILE_ROLE_MAP: Record<string, string> = {
  admin: 'ADMIN', master: 'MASTER', manager: 'MANAGER', sub_admin: 'SUBMANAGER', user: 'USER',
}

type Props = { params: Promise<{ locale: Locale; category: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, category } = await params
  const t = await getTranslations({ locale, namespace: 'board' })
  const key = category.toUpperCase() as 'NOTICE' | 'ARCHIVE' | 'FREE' | 'QNA'
  if (!VALID_CATEGORIES.includes(key)) return { title: '게시판' }
  return { title: `${t(`categories.${key}` as any)} — 통합게시판` }
}

export default async function CategoryPage({ params }: Props) {
  const { locale, category } = await params
  setRequestLocale(locale)

  if (!VALID_CATEGORIES.includes(category.toUpperCase())) notFound()

  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()

  let writeAllowed = false
  if (user) {
    const { data: profile } = await supabase
      .from('profiles').select('main_role').eq('user_id', user.id).maybeSingle()
    const roleCd = PROFILE_ROLE_MAP[profile?.main_role ?? ''] ?? 'USER'
    writeAllowed = canWrite(category.toUpperCase(), roleCd)
  }

  return <BoardList category={category} canWrite={writeAllowed} />
}
