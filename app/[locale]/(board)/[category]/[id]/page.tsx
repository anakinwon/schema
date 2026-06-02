import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import type { Locale } from '@/i18n/routing'
import { VALID_CATEGORIES } from '@/lib/board'
import PostDetail from '@/components/board/PostDetail'

type Props = { params: Promise<{ locale: Locale; category: string; id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, category } = await params
  const t = await getTranslations({ locale, namespace: 'board' })
  const key = category.toUpperCase()
  const catName = VALID_CATEGORIES.includes(key) ? t(`categories.${key}` as any) : '게시판'
  return { title: `게시글 — ${catName}` }
}

export default async function PostDetailPage({ params }: Props) {
  const { locale, category, id } = await params
  setRequestLocale(locale)
  if (!VALID_CATEGORIES.includes(category.toUpperCase())) notFound()
  return <PostDetail category={category} postId={id} />
}
