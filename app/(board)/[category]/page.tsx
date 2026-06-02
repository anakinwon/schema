import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { CATEGORY_NAME, VALID_CATEGORIES } from '@/lib/board'
import BoardList from '@/components/board/BoardList'

type Props = { params: Promise<{ category: string }> }

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

  return <BoardList category={category} canWrite />
}
