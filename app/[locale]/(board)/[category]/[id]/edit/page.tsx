import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import type { Locale } from '@/i18n/routing'
import { VALID_CATEGORIES } from '@/lib/board'
import PostForm from '@/components/board/PostForm'

type Props = { params: Promise<{ locale: Locale; category: string; id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, category } = await params
  const t = await getTranslations({ locale, namespace: 'board' })
  const key = category.toUpperCase()
  const catName = VALID_CATEGORIES.includes(key) ? t(`categories.${key}` as any) : '게시판'
  return { title: `수정 — ${catName}` }
}

export default async function EditPostPage({ params }: Props) {
  const { locale, category, id } = await params
  setRequestLocale(locale)
  if (!VALID_CATEGORIES.includes(category.toUpperCase())) notFound()
  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-800 mb-4">게시글 수정</h2>
      <PostForm category={category} postId={id} />
    </div>
  )
}
