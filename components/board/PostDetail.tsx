'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { Link } from '@/i18n/navigation'
import { CustomAlert } from '@/components/custom-alert'
import CommentSection from './CommentSection'

export interface Attachment {
  attch_id: string
  fl_nm: string
  fl_url: string
  fl_sz: number
  fl_tp: string
}

export interface PostFull {
  post_id: string
  ctgr_cd: string
  post_ttl: string
  post_cont: string
  rgst_usr_nm: string
  vw_cnt: number
  pin_yn: 'Y' | 'N'
  answ_yn: 'Y' | 'N'
  reg_dtm: string
  mod_dtm: string
  is_owner: boolean
  attachments: Attachment[]
}

function formatDate(iso: string) {
  return iso.replace('T', ' ').slice(0, 16)
}

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}

interface Props {
  category: string
  postId: string
}

export default function PostDetail({ category, postId }: Props) {
  const router = useRouter()

  const [post, setPost]       = useState<PostFull | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const supabase = useMemo(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  ), [])

  const authHeader = useCallback(async (): Promise<HeadersInit> => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) return {}
    return { Authorization: `Bearer ${session.access_token}` }
  }, [supabase])

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const headers = await authHeader()
        const res = await fetch(`/api/board/${category}/posts/${postId}`, { headers })
        if (!res.ok) {
          const body = await res.json()
          setError(body.error ?? '게시글을 불러오지 못했습니다')
          return
        }
        setPost(await res.json())
      } catch {
        setError('네트워크 오류가 발생했습니다')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [authHeader, category, postId])

  const handleDelete = () => setShowDeleteConfirm(true)

  const confirmDelete = async () => {
    setShowDeleteConfirm(false)
    setDeleting(true)
    const headers = await authHeader()
    const res = await fetch(`/api/board/${category}/posts/${postId}`, { method: 'DELETE', headers })
    if (res.ok) {
      router.push(`/${category}`)
    } else {
      const body = await res.json()
      alert(body.error ?? '삭제에 실패했습니다')
      setDeleting(false)
    }
  }

  const canComment = ['FREE', 'QNA'].includes(category.toUpperCase())

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="bg-white rounded border border-gray-200 p-5 space-y-3">
          <div className="h-7 w-3/4 bg-gray-200 rounded" />
          <div className="flex gap-4 pt-2 border-t border-gray-100">
            {[1,2,3,4].map(i => <div key={i} className="h-4 w-20 bg-gray-100 rounded" />)}
          </div>
        </div>
        <div className="bg-white rounded border border-gray-200 p-5 min-h-[200px] space-y-2">
          {[1,2,3,4,5].map(i => <div key={i} className="h-4 bg-gray-100 rounded" style={{width:`${60+i*5}%`}} />)}
        </div>
      </div>
    )
  }

  if (error || !post) {
    return (
      <div className="bg-white rounded border border-red-200 p-8 text-center">
        <p className="text-sm text-red-500 mb-3">{error ?? '게시글을 찾을 수 없습니다'}</p>
        <Link href={`/${category}`} className="text-sm text-blue-500 hover:underline">← 목록으로</Link>
      </div>
    )
  }

  return (
    <>
      {showDeleteConfirm && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/40'>
          <div className='w-full max-w-sm px-4'>
            <CustomAlert
              variant='destructive'
              title='게시글을 삭제하시겠습니까?'
              description='삭제된 게시글은 복구할 수 없습니다.'
              dismissible
              onDismiss={() => setShowDeleteConfirm(false)}
              onConfirm={confirmDelete}
              confirmLabel='삭제'
              onCancel={() => setShowDeleteConfirm(false)}
              cancelLabel='취소'
            />
          </div>
        </div>
      )}
      <article>
      {/* 헤더 */}
      <div className="bg-white rounded border border-gray-200 p-5 mb-4">
        <div className="flex items-start justify-between gap-4 mb-3">
          <h2 className="text-lg font-semibold text-gray-900 leading-snug flex-1">
            {post.pin_yn === 'Y' && <span className="mr-1">📌</span>}
            {post.post_ttl}
            {post.answ_yn === 'Y' && (
              <span className="ml-2 align-middle px-1.5 py-0.5 bg-green-100 text-green-700 text-xs rounded font-medium">
                채택완료
              </span>
            )}
          </h2>
          {post.is_owner && (
            <div className="flex gap-2 shrink-0">
              <Link
                href={`/${category}/${postId}/edit`}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50 transition-colors"
              >
                수정
              </Link>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-3 py-1.5 text-sm border border-red-300 text-red-600 rounded hover:bg-red-50 disabled:opacity-50 transition-colors"
              >
                삭제
              </button>
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-4 text-xs text-gray-400 border-t border-gray-100 pt-3">
          <span>작성자: <span className="text-gray-600 font-medium">{post.rgst_usr_nm}</span></span>
          <span>작성일: {formatDate(post.reg_dtm)}</span>
          {post.reg_dtm !== post.mod_dtm && <span>수정일: {formatDate(post.mod_dtm)}</span>}
          <span>조회: <span className="text-gray-600">{post.vw_cnt.toLocaleString()}</span></span>
        </div>
      </div>

      {/* 본문 */}
      <div className="bg-white rounded border border-gray-200 p-5 mb-4 min-h-[200px]">
        <pre className="text-sm text-gray-800 whitespace-pre-wrap font-sans leading-relaxed">
          {post.post_cont}
        </pre>
      </div>

      {/* 첨부파일 */}
      {post.attachments.length > 0 && (
        <div className="bg-white rounded border border-gray-200 p-4 mb-4">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            첨부파일 ({post.attachments.length})
          </h3>
          <ul className="space-y-1.5">
            {post.attachments.map(a => (
              <li key={a.attch_id}>
                <a
                  href={a.fl_url}
                  className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 hover:underline"
                  download={a.fl_nm}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span className="text-gray-400">📎</span>
                  <span className="flex-1 truncate">{a.fl_nm}</span>
                  <span className="text-xs text-gray-400 shrink-0">{formatBytes(a.fl_sz)}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 목록으로 */}
      <div className="mb-2">
        <Link href={`/${category}`} className="text-sm text-gray-500 hover:text-gray-700">
          ← 목록
        </Link>
      </div>

      {/* 댓글 */}
      {canComment && (
        <CommentSection
          postId={postId}
          category={category}
          isOwner={post.is_owner}
          canComment
        />
      )}
    </article>
    </>
  )
}
