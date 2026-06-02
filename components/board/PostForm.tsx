'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import AttachmentUploader, { UploadedFile } from './AttachmentUploader'
import { CATEGORY_NAME } from '@/lib/board'

interface Props {
  category: string
  postId?: string  // 수정 모드
}

export default function PostForm({ category, postId }: Props) {
  const router  = useRouter()
  const isEdit  = !!postId
  const categoryName = CATEGORY_NAME[category.toUpperCase()] ?? category

  const [title, setTitle]     = useState('')
  const [content, setContent] = useState('')
  const [files, setFiles]         = useState<UploadedFile[]>([])
  const [attachError, setAttachError] = useState(false)
  const [submitting, setSubmitting]   = useState(false)
  const [loadingInit, setLoadingInit] = useState(isEdit)
  const [error, setError]             = useState<string | null>(null)

  const supabase = useMemo(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  ), [])

  const authHeader = useCallback(async (): Promise<HeadersInit> => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) return {}
    return { Authorization: `Bearer ${session.access_token}` }
  }, [supabase])

  // 수정 모드: 기존 게시글 로드
  useEffect(() => {
    if (!isEdit || !postId) return
    const load = async () => {
      try {
        const headers = await authHeader()
        const res = await fetch(`/api/board/${category}/posts/${postId}`, { headers })
        if (res.ok) {
          const data = await res.json()
          setTitle(data.post_ttl ?? '')
          setContent(data.post_cont ?? '')
        }
      } finally {
        setLoadingInit(false)
      }
    }
    load()
  }, [isEdit, postId, authHeader, category])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) { setError('제목을 입력해주세요.'); return }
    if (!content.trim()) { setError('내용을 입력해주세요.'); return }
    if (attachError) { setError('첨부파일 크기를 확인해주세요.'); return }

    setSubmitting(true)
    setError(null)

    try {
      const headers = await authHeader()
      const jsonHeaders = { ...headers, 'Content-Type': 'application/json' }

      let newPostId: string

      if (isEdit) {
        // 수정
        const res = await fetch(`/api/board/${category}/posts/${postId}`, {
          method: 'PUT',
          headers: jsonHeaders,
          body: JSON.stringify({ post_ttl: title.trim(), post_cont: content.trim() }),
        })
        if (!res.ok) {
          const body = await res.json()
          setError(body.error ?? '수정에 실패했습니다')
          return
        }
        newPostId = postId
      } else {
        // 등록
        const res = await fetch(`/api/board/${category}/posts`, {
          method: 'POST',
          headers: jsonHeaders,
          body: JSON.stringify({ post_ttl: title.trim(), post_cont: content.trim() }),
        })
        if (!res.ok) {
          const body = await res.json()
          setError(body.error ?? '등록에 실패했습니다')
          return
        }
        const data = await res.json()
        newPostId = data.post_id
      }

      // 첨부파일 업로드 (등록·수정 모두)
      const failedFiles: string[] = []
      for (const f of files) {
        const fd = new FormData()
        fd.append('file', f.file)
        const uploadRes = await fetch(`/api/board/${category}/posts/${newPostId}/attachments`, {
          method: 'POST',
          headers: headers as Record<string, string>,
          body: fd,
        })
        if (!uploadRes.ok) {
          const body = await uploadRes.json().catch(() => ({}))
          failedFiles.push(`${f.file.name}(${body.error ?? uploadRes.status})`)
        }
      }

      if (failedFiles.length > 0) {
        alert(`게시글은 저장됐으나 일부 첨부파일 업로드에 실패했습니다:\n${failedFiles.join('\n')}`)
      }

      router.push(`/${category}/${newPostId}`)
    } catch {
      setError('저장 중 오류가 발생했습니다')
    } finally {
      setSubmitting(false)
    }
  }

  if (loadingInit) {
    return (
      <div className="animate-pulse bg-white rounded border border-gray-200 p-6 space-y-4">
        <div className="h-10 bg-gray-100 rounded" />
        <div className="h-48 bg-gray-100 rounded" />
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-white rounded border border-gray-200 p-5 space-y-4">
        {/* 카테고리 표시 */}
        <div className="flex items-center gap-2 text-sm text-gray-500 border-b border-gray-100 pb-3">
          <span className="font-medium text-gray-700">{categoryName}</span>
          <span>·</span>
          <span>{isEdit ? '게시글 수정' : '새 글 작성'}</span>
        </div>

        {/* 제목 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            제목 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="제목을 입력하세요"
            maxLength={200}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
          <p className="text-xs text-gray-400 mt-1 text-right">{title.length}/200</p>
        </div>

        {/* 본문 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            내용 <span className="text-red-500">*</span>
          </label>
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="내용을 입력하세요"
            rows={12}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded resize-y focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
        </div>

        {/* 첨부파일 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">첨부파일</label>
          <AttachmentUploader files={files} onChange={setFiles} onError={setAttachError} />
        </div>
      </div>

      {error && <p className="text-sm text-red-500 px-1">{error}</p>}

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-4 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50 transition-colors"
        >
          취소
        </button>
        <button
          type="submit"
          disabled={submitting || attachError}
          className="px-5 py-2 bg-[#1e3a5f] text-white text-sm rounded hover:bg-[#16304f] disabled:opacity-50 transition-colors"
        >
          {submitting ? '저장 중...' : isEdit ? '수정 완료' : '등록'}
        </button>
      </div>
    </form>
  )
}
