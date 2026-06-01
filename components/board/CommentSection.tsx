'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createBrowserClient } from '@supabase/ssr'

export interface Comment {
  cmnt_id: string
  rgst_usr_nm: string
  cmnt_cont: string
  acpt_yn: 'Y' | 'N'
  reg_dts: string
  is_owner: boolean
}

function formatDate(iso: string) {
  return iso.replace('T', ' ').slice(0, 16)
}

interface Props {
  postId: string
  category: string
  isOwner: boolean
  canComment: boolean
}

export default function CommentSection({ postId, category, isOwner, canComment }: Props) {
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading]   = useState(true)
  const [text, setText]         = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const isQna = category.toUpperCase() === 'QNA'

  const supabase = useMemo(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  ), [])

  const authHeader = useCallback(async (): Promise<HeadersInit> => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) return {}
    return { Authorization: `Bearer ${session.access_token}` }
  }, [supabase])

  const base = `/api/board/${category}/posts/${postId}`

  const loadComments = useCallback(async () => {
    setLoading(true)
    try {
      const headers = await authHeader()
      const res = await fetch(`${base}/comments`, { headers })
      if (res.ok) setComments(await res.json())
    } finally {
      setLoading(false)
    }
  }, [authHeader, base])

  useEffect(() => { loadComments() }, [loadComments])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!text.trim()) return
    setSubmitting(true)
    setError(null)
    try {
      const headers = await authHeader()
      const res = await fetch(`${base}/comments`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ cmnt_cont: text.trim() }),
      })
      if (!res.ok) {
        const body = await res.json()
        setError(body.error ?? '댓글 등록에 실패했습니다')
        return
      }
      const newComment = await res.json()
      setComments(prev => [...prev, newComment])
      setText('')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (cmntId: string) => {
    if (!confirm('댓글을 삭제하시겠습니까?')) return
    const headers = await authHeader()
    const res = await fetch(`${base}/comments/${cmntId}`, { method: 'DELETE', headers })
    if (res.ok) {
      setComments(prev => prev.filter(c => c.cmnt_id !== cmntId))
    } else {
      const body = await res.json()
      alert(body.error ?? '삭제에 실패했습니다')
    }
  }

  const handleAccept = async (cmntId: string) => {
    if (!confirm('이 댓글을 채택하시겠습니까? 채택 후 변경할 수 없습니다.')) return
    const headers = await authHeader()
    const res = await fetch(`${base}/accept`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ cmnt_id: cmntId }),
    })
    if (res.ok) {
      setComments(prev => prev.map(c => ({ ...c, acpt_yn: c.cmnt_id === cmntId ? 'Y' : c.acpt_yn })))
    } else {
      const body = await res.json()
      alert(body.error ?? '채택에 실패했습니다')
    }
  }

  return (
    <section className="mt-6">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">
        댓글 <span className="text-blue-500">{comments.length}</span>
      </h3>

      {/* 댓글 목록 */}
      <div className="space-y-3 mb-4">
        {loading && (
          <div className="space-y-2 animate-pulse">
            {[1, 2].map(i => (
              <div key={i} className="rounded-lg p-4 border border-gray-200 bg-white space-y-2">
                <div className="flex gap-3">
                  <div className="h-4 w-20 bg-gray-100 rounded" />
                  <div className="h-4 w-24 bg-gray-100 rounded" />
                </div>
                <div className="h-4 w-3/4 bg-gray-100 rounded" />
              </div>
            ))}
          </div>
        )}
        {!loading && comments.length === 0 && (
          <p className="text-sm text-gray-400 py-4 text-center">첫 번째 댓글을 남겨보세요.</p>
        )}
        {!loading && comments.map(c => (
          <div
            key={c.cmnt_id}
            className={`rounded-lg p-4 border ${
              c.acpt_yn === 'Y' ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-white'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium text-gray-700">{c.rgst_usr_nm}</span>
                <span className="text-gray-400 text-xs">{formatDate(c.reg_dts)}</span>
                {c.acpt_yn === 'Y' && (
                  <span className="px-1.5 py-0.5 bg-green-600 text-white text-[10px] rounded font-medium">
                    ✅ 채택
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {isQna && isOwner && c.acpt_yn === 'N' && (
                  <button
                    onClick={() => handleAccept(c.cmnt_id)}
                    className="text-xs px-2 py-1 border border-green-400 text-green-600 rounded hover:bg-green-50 transition-colors"
                  >
                    채택
                  </button>
                )}
                {c.is_owner && (
                  <button
                    onClick={() => handleDelete(c.cmnt_id)}
                    className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                  >
                    삭제
                  </button>
                )}
              </div>
            </div>
            <pre className="mt-2 text-sm text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">
              {c.cmnt_cont}
            </pre>
          </div>
        ))}
      </div>

      {/* 에러 */}
      {error && <p className="text-sm text-red-500 mb-2">{error}</p>}

      {/* 댓글 작성 폼 */}
      {canComment && (
        <form onSubmit={handleSubmit} className="space-y-2">
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="댓글을 입력하세요..."
            rows={3}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting || !text.trim()}
              className="px-4 py-1.5 bg-[#1e3a5f] text-white text-sm rounded hover:bg-[#16304f] disabled:opacity-50 transition-colors"
            >
              {submitting ? '등록 중...' : '댓글 등록'}
            </button>
          </div>
        </form>
      )}
    </section>
  )
}
