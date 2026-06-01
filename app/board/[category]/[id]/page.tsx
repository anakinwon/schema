import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { CATEGORY_NAME, VALID_CATEGORIES } from '@/lib/board'
import PostDetail from '@/components/board/PostDetail'

type Props = { params: Promise<{ category: string; id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category } = await params
  const name = CATEGORY_NAME[category.toUpperCase()]
  return { title: `게시글 — ${name ?? '게시판'}` }
}

export default async function PostDetailPage({ params }: Props) {
  const { category, id } = await params

  if (!VALID_CATEGORIES.includes(category.toUpperCase())) {
    notFound()
  }

  return <PostDetail category={category} postId={id} />
}
