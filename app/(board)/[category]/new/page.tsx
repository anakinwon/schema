import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { CATEGORY_NAME, VALID_CATEGORIES } from '@/lib/board'
import PostForm from '@/components/board/PostForm'

type Props = { params: Promise<{ category: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category } = await params
  const name = CATEGORY_NAME[category.toUpperCase()]
  return { title: `글쓰기 — ${name ?? '게시판'}` }
}

export default async function NewPostPage({ params }: Props) {
  const { category } = await params

  if (!VALID_CATEGORIES.includes(category.toUpperCase())) {
    notFound()
  }

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-800 mb-4">글쓰기</h2>
      <PostForm category={category} />
    </div>
  )
}
