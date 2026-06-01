import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { CATEGORY_NAME, VALID_CATEGORIES } from '@/lib/board'
import PostForm from '@/components/board/PostForm'

type Props = { params: Promise<{ category: string; id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category } = await params
  const name = CATEGORY_NAME[category.toUpperCase()]
  return { title: `수정 — ${name ?? '게시판'}` }
}

export default async function EditPostPage({ params }: Props) {
  const { category, id } = await params

  if (!VALID_CATEGORIES.includes(category.toUpperCase())) {
    notFound()
  }

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-800 mb-4">게시글 수정</h2>
      <PostForm category={category} postId={id} />
    </div>
  )
}
