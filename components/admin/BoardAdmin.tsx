'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'

interface Category {
  ctgr_cd: string
  ctgr_nm: string
  attch_yn: string
  cmnt_yn: string
  wr_min_role_cd: string
}

interface Post {
  post_id: string
  ctgr_cd: string
  post_ttl: string
  rgst_usr_nm: string
  vw_cnt: number
  pin_yn: 'Y' | 'N'
  answ_yn: 'Y' | 'N'
  reg_dts: string
  cmnt_cnt: number
}

interface PagedResult {
  items: Post[]
  total: number
  page: number
  totalPages: number
}

function formatDate(iso: string) {
  return iso.slice(0, 10)
}

export default function BoardAdmin() {
  const [categories, setCategories] = useState<Category[]>([])
  const [selected, setSelected]     = useState<Category | null>(null)
  const [data, setData]             = useState<PagedResult | null>(null)
  const [page, setPage]             = useState(1)
  const [loadingCat, setLoadingCat] = useState(true)
  const [loadingPost, setLoadingPost] = useState(false)
  const [deleting, setDeleting]     = useState<string | null>(null)
  const [toast, setToast]           = useState<{ text: string; ok: boolean } | null>(null)

  const showToast = (text: string, ok: boolean) => {
    setToast({ text, ok })
    setTimeout(() => setToast(null), 3000)
  }

  // 카테고리 목록 로드 (admin-session 쿠키 자동 전송)
  const loadCategories = useCallback(async () => {
    setLoadingCat(true)
    try {
      const res = await fetch('/api/board/categories')
      if (res.ok) {
        const cats: Category[] = await res.json()
        setCategories(cats)
        if (cats.length > 0) setSelected(cats[0])
      }
    } finally {
      setLoadingCat(false)
    }
  }, [])

  // 게시글 목록 로드
  const loadPosts = useCallback(async (ctgrCd: string, p: number) => {
    setLoadingPost(true)
    try {
      const res = await fetch(
        `/api/board/${ctgrCd.toLowerCase()}/posts?page=${p}`
      )
      if (res.ok) setData(await res.json())
    } finally {
      setLoadingPost(false)
    }
  }, [])

  useEffect(() => { loadCategories() }, [loadCategories])

  useEffect(() => {
    if (selected) { setPage(1); loadPosts(selected.ctgr_cd, 1) }
  }, [selected, loadPosts])

  useEffect(() => {
    if (selected) loadPosts(selected.ctgr_cd, page)
  }, [page, selected, loadPosts])

  const handleDelete = async (post: Post) => {
    if (!confirm(`"${post.post_ttl}"\n\n이 게시글을 삭제하시겠습니까?\n첨부파일도 함께 삭제됩니다.`)) return
    setDeleting(post.post_id)
    try {
      const res = await fetch(
        `/api/board/${post.ctgr_cd.toLowerCase()}/posts/${post.post_id}`,
        { method: 'DELETE' }
      )
      if (res.ok) {
        showToast('삭제되었습니다', true)
        if (selected) loadPosts(selected.ctgr_cd, page)
      } else {
        const body = await res.json()
        showToast(body.error ?? '삭제 실패', false)
      }
    } finally {
      setDeleting(null)
    }
  }

  const handleTogglePin = async (post: Post) => {
    const newPin = post.pin_yn === 'Y' ? 'N' : 'Y'
    const res = await fetch(
      `/api/board/${post.ctgr_cd.toLowerCase()}/posts/${post.post_id}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        // post_cont 미포함 → API에서 기존 값 유지
        body: JSON.stringify({ post_ttl: post.post_ttl, pin_yn: newPin }),
      }
    )
    if (res.ok) {
      showToast(newPin === 'Y' ? '고정글로 설정했습니다' : '고정 해제했습니다', true)
      if (selected) loadPosts(selected.ctgr_cd, page)
    } else {
      const body = await res.json()
      showToast(body.error ?? '설정 실패', false)
    }
  }

  return (
    <div className="flex h-full min-h-[600px]">
      {/* 토스트 */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-2 rounded shadow-lg text-sm text-white transition-all ${
          toast.ok ? 'bg-green-600' : 'bg-red-500'
        }`}>
          {toast.text}
        </div>
      )}

      {/* 좌측: 카테고리 목록 */}
      <aside className="w-48 bg-white border-r border-gray-200 flex flex-col shrink-0">
        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">게시판</h2>
        </div>
        {loadingCat ? (
          <div className="p-4 space-y-2 animate-pulse">
            {[1,2,3,4].map(i => <div key={i} className="h-8 bg-gray-100 rounded" />)}
          </div>
        ) : (
          <ul className="flex-1 overflow-y-auto p-2 space-y-1">
            {categories.map(cat => (
              <li key={cat.ctgr_cd}>
                <button
                  onClick={() => setSelected(cat)}
                  className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                    selected?.ctgr_cd === cat.ctgr_cd
                      ? 'bg-[#1e3a5f] text-white font-medium'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <div>{cat.ctgr_nm}</div>
                  <div className="flex gap-1 mt-0.5">
                    {cat.cmnt_yn === 'Y' && (
                      <span className={`text-[9px] px-1 rounded ${
                        selected?.ctgr_cd === cat.ctgr_cd ? 'bg-white/20 text-white' : 'bg-blue-50 text-blue-500'
                      }`}>댓글</span>
                    )}
                    {cat.attch_yn === 'Y' && (
                      <span className={`text-[9px] px-1 rounded ${
                        selected?.ctgr_cd === cat.ctgr_cd ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
                      }`}>첨부</span>
                    )}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="p-3 border-t border-gray-100">
          <Link
            href="/notice"
            target="_blank"
            className="block text-center text-xs text-blue-500 hover:underline"
          >
            게시판 보기 →
          </Link>
        </div>
      </aside>

      {/* 우측: 게시글 목록 */}
      <div className="flex-1 flex flex-col overflow-hidden bg-gray-50">
        <div className="px-6 py-3 border-b border-gray-200 bg-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-semibold text-gray-800">
              {selected?.ctgr_nm ?? '게시판 선택'} 관리
            </h2>
            {data && (
              <span className="text-xs text-gray-400">총 {data.total}건</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {data && data.totalPages > 1 && (
              <div className="flex items-center gap-1 text-xs">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-2 py-1 border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-40"
                >이전</button>
                <span className="px-2 text-gray-500">{page} / {data.totalPages}</span>
                <button
                  onClick={() => setPage(p => Math.min(data.totalPages, p + 1))}
                  disabled={page >= data.totalPages}
                  className="px-2 py-1 border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-40"
                >다음</button>
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-auto p-4">
          {loadingPost ? (
            <div className="bg-white rounded border border-gray-200 overflow-hidden animate-pulse">
              {Array.from({length: 8}).map((_, i) => (
                <div key={i} className="flex gap-4 px-4 py-3 border-b border-gray-100">
                  <div className="h-4 w-8 bg-gray-100 rounded" />
                  <div className="h-4 flex-1 bg-gray-100 rounded" />
                  <div className="h-4 w-20 bg-gray-100 rounded" />
                  <div className="h-4 w-20 bg-gray-100 rounded" />
                  <div className="h-4 w-16 bg-gray-100 rounded" />
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded border border-gray-200 overflow-hidden">
              <table className="w-full text-sm min-w-[640px]">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-2.5 text-left font-medium text-gray-600 w-10">번호</th>
                    <th className="px-4 py-2.5 text-left font-medium text-gray-600">제목</th>
                    <th className="px-4 py-2.5 text-left font-medium text-gray-600 w-24">작성자</th>
                    <th className="px-4 py-2.5 text-left font-medium text-gray-600 w-24">작성일</th>
                    <th className="px-4 py-2.5 text-right font-medium text-gray-600 w-14">조회</th>
                    <th className="px-4 py-2.5 text-center font-medium text-gray-600 w-24">관리</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {!data || data.items.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-400">
                        게시글이 없습니다
                      </td>
                    </tr>
                  ) : data.items.map((post, idx) => (
                    <tr key={post.post_id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-2.5 text-gray-400 text-center text-xs">
                        {post.pin_yn === 'Y' ? '📌' : data.total - ((page-1)*20+idx)}
                      </td>
                      <td className="px-4 py-2.5">
                        <a
                          href={`/${post.ctgr_cd.toLowerCase()}/${post.post_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`hover:underline ${post.pin_yn === 'Y' ? 'text-[#1e3a5f] font-medium' : 'text-gray-800'}`}
                        >
                          {post.post_ttl}
                        </a>
                        {post.answ_yn === 'Y' && (
                          <span className="ml-2 px-1.5 py-0.5 bg-green-100 text-green-700 text-[10px] rounded">채택완료</span>
                        )}
                        {post.cmnt_cnt > 0 && (
                          <span className="ml-1 text-xs text-blue-400">[{post.cmnt_cnt}]</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-gray-500 text-xs">{post.rgst_usr_nm}</td>
                      <td className="px-4 py-2.5 text-gray-400 text-xs">{formatDate(post.reg_dts)}</td>
                      <td className="px-4 py-2.5 text-gray-400 text-right text-xs">{post.vw_cnt}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleTogglePin(post)}
                            title={post.pin_yn === 'Y' ? '고정 해제' : '고정글 설정'}
                            className={`text-xs px-2 py-1 rounded border transition-colors ${
                              post.pin_yn === 'Y'
                                ? 'border-blue-300 text-blue-600 hover:bg-blue-50'
                                : 'border-gray-200 text-gray-400 hover:border-blue-300 hover:text-blue-500'
                            }`}
                          >
                            {post.pin_yn === 'Y' ? '📌' : '핀'}
                          </button>
                          <button
                            onClick={() => handleDelete(post)}
                            disabled={deleting === post.post_id}
                            className="text-xs px-2 py-1 rounded border border-red-200 text-red-500 hover:bg-red-50 disabled:opacity-50 transition-colors"
                          >
                            {deleting === post.post_id ? '...' : '삭제'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
