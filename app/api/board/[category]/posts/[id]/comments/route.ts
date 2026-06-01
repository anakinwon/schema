import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth-guard'
import { VALID_CATEGORIES } from '@/lib/board'

type Params = { params: Promise<{ category: string; id: string }> }

// GET /api/board/[category]/posts/[id]/comments
export async function GET(req: NextRequest, { params }: Params) {
  const auth = await requireAuth(req, ['USER', 'SUBMANAGER', 'MANAGER', 'MASTER', 'ADMIN'])
  if (!auth.ok) return auth.response

  const { category, id } = await params
  const ctgrCd = category.toUpperCase()

  if (!VALID_CATEGORIES.includes(ctgrCd)) {
    return NextResponse.json({ error: '존재하지 않는 게시판입니다' }, { status: 404 })
  }

  const { data, error } = await supabaseAdmin
    .from('brd_cmnt')
    .select('cmnt_id, post_id, cmnt_cont, rgst_usr_id, rgst_usr_nm, acpt_yn, reg_dts, mod_dts')
    .eq('post_id', id)
    .order('reg_dts', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(
    (data ?? []).map(c => ({
      ...c,
      is_owner: auth.user_id ? c.rgst_usr_id === auth.user_id : false,
    }))
  )
}

// POST /api/board/[category]/posts/[id]/comments
export async function POST(req: NextRequest, { params }: Params) {
  const auth = await requireAuth(req, ['USER', 'SUBMANAGER', 'MANAGER', 'MASTER', 'ADMIN'])
  if (!auth.ok) return auth.response

  const { category, id } = await params
  const ctgrCd = category.toUpperCase()

  if (!VALID_CATEGORIES.includes(ctgrCd)) {
    return NextResponse.json({ error: '존재하지 않는 게시판입니다' }, { status: 404 })
  }

  // 댓글 허용 여부 확인 (cmnt_yn='Y': FREE·QNA만)
  const { data: ctgr } = await supabaseAdmin
    .from('brd_ctgr')
    .select('cmnt_yn')
    .eq('ctgr_cd', ctgrCd)
    .single()

  if (ctgr?.cmnt_yn !== 'Y') {
    return NextResponse.json(
      { error: '이 게시판은 댓글을 허용하지 않습니다' },
      { status: 403 },
    )
  }

  // 게시글 존재 확인
  const { data: post } = await supabaseAdmin
    .from('brd_post')
    .select('post_id')
    .eq('post_id', id)
    .eq('ctgr_cd', ctgrCd)
    .single()

  if (!post) {
    return NextResponse.json({ error: '게시글을 찾을 수 없습니다' }, { status: 404 })
  }

  if (!auth.user_id) {
    return NextResponse.json({ error: '사용자 정보를 확인할 수 없습니다' }, { status: 401 })
  }

  const body = await req.json()
  const { cmnt_cont } = body

  if (!cmnt_cont?.trim()) {
    return NextResponse.json({ error: '댓글 내용은 필수입니다' }, { status: 400 })
  }

  // 작성자 명칭 조회
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('full_name, username')
    .eq('user_id', auth.user_id)
    .maybeSingle()

  const rgst_usr_nm =
    profile?.full_name ?? profile?.username ?? auth.email.split('@')[0]

  const { data, error } = await supabaseAdmin
    .from('brd_cmnt')
    .insert({
      post_id:     id,
      cmnt_cont:   cmnt_cont.trim(),
      rgst_usr_id: auth.user_id,
      rgst_usr_nm,
      reg_usr_id:  auth.email,
      mod_usr_id:  auth.email,
    })
    .select('cmnt_id, cmnt_cont, rgst_usr_nm, acpt_yn, reg_dts')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ...data, is_owner: true }, { status: 201 })
}
