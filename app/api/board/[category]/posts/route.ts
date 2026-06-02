import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth-guard'
import { canWrite, VALID_CATEGORIES } from '@/lib/board'

const PAGE_SIZE     = 20
const PAGE_SIZE_MIN = 5
const PAGE_SIZE_MAX = 50

type Params = { params: Promise<{ category: string }> }

// PostgREST .or() 필터 문자열 인젝션 방지
// , ( ) * \ 는 PostgREST 파서 예약 문자 → 제거
// % 는 LIKE 와일드카드 → 리터럴 이스케이프
function sanitizeSearch(raw: string): string {
  return raw
    .replace(/[,()\\*]/g, '')
    .replace(/%/g, '\\%')
    .slice(0, 100)
}

// GET /api/board/[category]/posts?page=1&q=검색어&pin=Y
export async function GET(req: NextRequest, { params }: Params) {
  const auth = await requireAuth(req, ['USER', 'SUBMANAGER', 'MANAGER', 'MASTER', 'ADMIN'])
  if (!auth.ok) return auth.response

  const { category } = await params
  const ctgrCd = category.toUpperCase()

  if (!VALID_CATEGORIES.includes(ctgrCd)) {
    return NextResponse.json({ error: '존재하지 않는 게시판입니다' }, { status: 404 })
  }

  const sp = req.nextUrl.searchParams
  const page     = Math.max(1, parseInt(sp.get('page') ?? '1', 10))
  const q        = sanitizeSearch((sp.get('q') ?? '').trim())
  const psRaw    = parseInt(sp.get('pageSize') ?? String(PAGE_SIZE), 10)
  const pageSize = Math.min(PAGE_SIZE_MAX, Math.max(PAGE_SIZE_MIN, isNaN(psRaw) ? PAGE_SIZE : psRaw))
  const from     = (page - 1) * pageSize
  const to       = from + pageSize - 1

  let query = supabaseAdmin
    .from('brd_post')
    .select(`
      post_id, ctgr_cd, post_ttl, rgst_usr_id, rgst_usr_nm,
      vw_cnt, pin_yn, answ_yn, reg_dts, mod_dts,
      brd_cmnt(count)
    `, { count: 'exact' })
    .eq('ctgr_cd', ctgrCd)

  if (q) {
    query = query.or(`post_ttl.ilike.%${q}%,rgst_usr_nm.ilike.%${q}%`)
  }

  const { data, error, count } = await query
    .order('pin_yn',  { ascending: false })
    .order('reg_dts', { ascending: false })
    .range(from, to)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const items = (data ?? []).map(p => ({
    ...p,
    cmnt_cnt: (p.brd_cmnt as unknown as { count: number }[])?.[0]?.count ?? 0,
    brd_cmnt: undefined,
  }))

  return NextResponse.json({
    items,
    total:      count ?? 0,
    page,
    pageSize,
    totalPages: Math.ceil((count ?? 0) / pageSize),
  })
}

// POST /api/board/[category]/posts
export async function POST(req: NextRequest, { params }: Params) {
  const auth = await requireAuth(req, ['USER', 'SUBMANAGER', 'MANAGER', 'MASTER', 'ADMIN'])
  if (!auth.ok) return auth.response

  const { category } = await params
  const ctgrCd = category.toUpperCase()

  if (!VALID_CATEGORIES.includes(ctgrCd)) {
    return NextResponse.json({ error: '존재하지 않는 게시판입니다' }, { status: 404 })
  }

  if (!canWrite(ctgrCd, auth.role_cd)) {
    return NextResponse.json(
      { error: `쓰기 권한이 없습니다 — 현재 역할: ${auth.role_cd}` },
      { status: 403 },
    )
  }

  if (!auth.user_id) {
    return NextResponse.json({ error: '사용자 정보를 확인할 수 없습니다' }, { status: 401 })
  }

  const body = await req.json()
  const { post_ttl, post_cont } = body

  if (!post_ttl?.trim()) {
    return NextResponse.json({ error: '제목은 필수입니다' }, { status: 400 })
  }

  // 작성자 명칭 — profiles에서 조회
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('full_name, username')
    .eq('user_id', auth.user_id)
    .maybeSingle()

  const rgst_usr_nm =
    profile?.full_name ?? profile?.username ?? auth.email.split('@')[0]

  const { data, error } = await supabaseAdmin
    .from('brd_post')
    .insert({
      ctgr_cd:     ctgrCd,
      post_ttl:    post_ttl.trim(),
      post_cont:   post_cont ?? null,
      rgst_usr_id: auth.user_id,
      rgst_usr_nm,
      reg_usr_id:  auth.email,
      mod_usr_id:  auth.email,
    })
    .select('post_id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ post_id: data.post_id }, { status: 201 })
}
