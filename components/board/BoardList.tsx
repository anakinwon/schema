'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { Link } from '@/i18n/navigation'
import Pagination from './Pagination'

export interface Post {
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
  pageSize: number
  totalPages: number
}

function formatDate(iso: string) {
  return iso.slice(0, 10)
}

const ROW_HEIGHT = 44  // td py-2.5(10*2) + line-height(24) = 44px

interface Props {
  category: string
  canWrite?: boolean
}

export default function BoardList({ category, canWrite = false }: Props) {
  const router = useRouter()

  const [pageSize, setPageSize]   = useState<number>(0)
  const [data, setData]           = useState<PagedResult | null>(null)
  const [page, setPage]           = useState(1)
  const [q, setQ]                 = useState('')
  const [inputQ, setInputQ]       = useState('')
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState<string | null>(null)

  const pageSizeRef  = useRef(pageSize)
  const tableBodyRef = useRef<HTMLDivElement>(null)
  const theadRef     = useRef<HTMLTableSectionElement>(null)

  pageSizeRef.current = pageSize

  // ResizeObserver: 테이블 영역 실제 높이 → pageSize 계산
  useEffect(() => {
    const wrapper = tableBodyRef.current
    if (!wrapper) return

    const measure = () => {
      const theadH  = theadRef.current?.offsetHeight ?? 42
      const available = wrapper.clientHeight - theadH
      const rows = Math.max(3, Math.min(50, Math.floor(available / ROW_HEIGHT)))
      if (rows !== pageSizeRef.current) {
        setPageSize(rows)
        setPage(1)
      }
    }

    measure()
    const obs = new ResizeObserver(measure)
    obs.observe(wrapper)
    return () => obs.disconnect()
  }, [])

  const supabase = useMemo(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  ), [])

  const authHeader = useCallback(async (): Promise<HeadersInit> => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) return {}
    return { Authorization: `Bearer ${session.access_token}` }
  }, [supabase])

  const load = useCallback(async (p: number, search: string, ps: number) => {
    setLoading(true)
    setError(null)
    try {
      const headers = await authHeader()
      const params = new URLSearchParams({ page: String(p), pageSize: String(ps) })
      if (search) params.set('q', search)
      const res = await fetch(`/api/board/${category}/posts?${params}`, { headers })
      if (!res.ok) {
        const body = await res.json()
        setError(body.error ?? '게시글을 불러오지 못했습니다')
        return
      }
      setData(await res.json())
    } catch {
      setError('네트워크 오류가 발생했습니다')
    } finally {
      setLoading(false)
    }
  }, [authHeader, category])

  // pageSize가 결정된 이후에만 로드
  useEffect(() => {
    if (pageSize === 0) return
    load(page, q, pageSize)
  }, [load, page, q, pageSize])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    setQ(inputQ.trim())
  }

  const handlePage = (p: number) => setPage(p)

  const categoryKey = category.toUpperCase()
  const posts = data?.items ?? []
  // 스켈레톤 행 수: pageSize 확정 전엔 wrapper 높이를 채울 수 없으므로 0
  const skeletonCount = pageSize > 0 ? pageSize : 0

  return (
    <div className="flex-1 flex flex-col gap-3">

      {/* 검색/글쓰기 */}
      <div className="shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <p className="text-sm text-gray-500">
            총 <span className="font-semibold text-gray-800">{data?.total ?? 0}</span>건
            {data && (
              <span className="ml-1 text-xs text-gray-400">({pageSize}개씩)</span>
            )}
          </p>
          <form onSubmit={handleSearch} className="flex gap-1">
            <input
              value={inputQ}
              onChange={e => setInputQ(e.target.value)}
              placeholder="제목·작성자 검색"
              className="px-2.5 py-1 text-sm border border-gray-300 rounded w-40 focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
            <button
              type="submit"
              className="px-3 py-1 text-sm bg-gray-100 border border-gray-300 rounded hover:bg-gray-200 transition-colors"
            >
              검색
            </button>
            {q && (
              <button
                type="button"
                onClick={() => { setInputQ(''); setQ(''); setPage(1) }}
                className="px-2 py-1 text-xs text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            )}
          </form>
        </div>
        {canWrite && (
          <Link
            href={`/${category}/new`}
            className="px-3 py-1.5 bg-[#1e3a5f] text-white text-sm rounded hover:bg-[#16304f] transition-colors self-end sm:self-auto"
          >
            글쓰기
          </Link>
        )}
      </div>

      {/* 테이블 — flex-1 로 남은 공간 모두 차지 */}
      <div ref={tableBodyRef} className="flex-1 min-h-0 overflow-x-auto rounded border border-gray-200 bg-white">
        <table className="min-w-[640px] w-full text-sm table-fixed">
          <thead ref={theadRef} className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="w-[6%]  px-4 py-2.5 text-left font-medium text-gray-600 whitespace-nowrap">번호</th>
              <th className="w-[50%] px-4 py-2.5 text-left font-medium text-gray-600">제목</th>
              <th className="w-[17%] px-4 py-2.5 text-left font-medium text-gray-600 whitespace-nowrap">작성자</th>
              <th className="w-[17%] px-4 py-2.5 text-left font-medium text-gray-600 whitespace-nowrap">작성일</th>
              <th className="w-[5%]  px-4 py-2.5 text-right font-medium text-gray-600 whitespace-nowrap">조회</th>
              <th className="w-[5%]  px-4 py-2.5 text-right font-medium text-gray-600 whitespace-nowrap">댓글</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading && skeletonCount > 0 && (
              Array.from({ length: skeletonCount }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td className="px-4 py-3"><div className="h-4 w-6 bg-gray-100 rounded mx-auto" /></td>
                  <td className="px-4 py-3"><div className="h-4 bg-gray-100 rounded w-3/4" /></td>
                  <td className="px-4 py-3"><div className="h-4 bg-gray-100 rounded w-16" /></td>
                  <td className="px-4 py-3"><div className="h-4 bg-gray-100 rounded w-20" /></td>
                  <td className="px-4 py-3"><div className="h-4 bg-gray-100 rounded w-8 ml-auto" /></td>
                  <td className="px-4 py-3"><div className="h-4 bg-gray-100 rounded w-6 ml-auto" /></td>
                </tr>
              ))
            )}
            {!loading && error && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-red-500">{error}</td>
              </tr>
            )}
            {!loading && !error && posts.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-400">
                  {q ? `'${q}' 검색 결과가 없습니다` : '게시글이 없습니다'}
                </td>
              </tr>
            )}
            {!loading && !error && posts.map((post, idx) => (
              <tr
                key={post.post_id}
                className="hover:bg-blue-50/40 cursor-pointer transition-colors"
                onClick={() => router.push(`/${category}/${post.post_id}`)}
              >
                <td className="px-4 py-2.5 text-gray-400 text-center">
                  {post.pin_yn === 'Y' ? '📌' : (data ? data.total - ((page - 1) * pageSize + idx) : '')}
                </td>
                <td className="px-4 py-2.5">
                  <span className={`font-medium ${post.pin_yn === 'Y' ? 'text-[#1e3a5f]' : 'text-gray-800'}`}>
                    {post.post_ttl}
                  </span>
                  {post.answ_yn === 'Y' && (
                    <span className="ml-2 inline-block px-1.5 py-0.5 bg-green-100 text-green-700 text-[10px] rounded font-medium align-middle">
                      채택완료
                    </span>
                  )}
                  {categoryKey === 'QNA' && post.answ_yn === 'N' && (
                    <span className="ml-2 inline-block px-1.5 py-0.5 bg-orange-100 text-orange-700 text-[10px] rounded font-medium align-middle">
                      미답변
                    </span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-gray-500 truncate">{post.rgst_usr_nm}</td>
                <td className="px-4 py-2.5 text-gray-400 whitespace-nowrap">{formatDate(post.reg_dts)}</td>
                <td className="px-4 py-2.5 text-gray-400 text-right">{post.vw_cnt.toLocaleString()}</td>
                <td className="px-4 py-2.5 text-right">
                  {post.cmnt_cnt > 0
                    ? <span className="text-blue-500 font-medium">{post.cmnt_cnt}</span>
                    : <span className="text-gray-300">-</span>
                  }
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 페이지네이션 — 항상 하단 */}
      <div className="shrink-0">
        <Pagination page={page} totalPages={data?.totalPages ?? 1} onPage={handlePage} />
      </div>

    </div>
  )
}
