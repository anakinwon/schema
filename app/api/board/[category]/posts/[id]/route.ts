import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth-guard'
import { isOwnerOrAdmin, VALID_CATEGORIES } from '@/lib/board'

type Params = { params: Promise<{ category: string; id: string }> }

// GET /api/board/[category]/posts/[id]  (+조회수 증가)
export async function GET(req: NextRequest, { params }: Params) {
  const auth = await requireAuth(req, ['USER', 'SUBMANAGER', 'MANAGER', 'MASTER', 'ADMIN'])
  if (!auth.ok) return auth.response

  const { category, id } = await params
  const ctgrCd = category.toUpperCase()

  if (!VALID_CATEGORIES.includes(ctgrCd)) {
    return NextResponse.json({ error: '존재하지 않는 게시판입니다' }, { status: 404 })
  }

  const { data: post, error } = await supabaseAdmin
    .from('brd_post')
    .select(`
      post_id, ctgr_cd, post_ttl, post_cont,
      rgst_usr_id, rgst_usr_nm, vw_cnt, pin_yn, answ_yn, acpt_cmnt_id,
      reg_dts, mod_dts,
      brd_attch ( attch_id, fl_nm, fl_url, fl_sz, fl_tp )
    `)
    .eq('post_id', id)
    .eq('ctgr_cd', ctgrCd)
    .single()

  if (error || !post) {
    return NextResponse.json({ error: '게시글을 찾을 수 없습니다' }, { status: 404 })
  }

  // 조회수 원자적 증가 (조회자 본인 제외 고려 생략 — 단순화)
  await supabaseAdmin.rpc('increment_vw_cnt', { p_post_id: id })

  return NextResponse.json({
    ...post,
    attachments: post.brd_attch ?? [],
    brd_attch: undefined,
    is_owner: auth.user_id ? post.rgst_usr_id === auth.user_id : false,
  })
}

// PUT /api/board/[category]/posts/[id]
export async function PUT(req: NextRequest, { params }: Params) {
  const auth = await requireAuth(req, ['USER', 'SUBMANAGER', 'MANAGER', 'MASTER', 'ADMIN'])
  if (!auth.ok) return auth.response

  const { category, id } = await params
  const ctgrCd = category.toUpperCase()

  if (!VALID_CATEGORIES.includes(ctgrCd)) {
    return NextResponse.json({ error: '존재하지 않는 게시판입니다' }, { status: 404 })
  }

  // 소유권 확인
  const { data: post } = await supabaseAdmin
    .from('brd_post')
    .select('rgst_usr_id')
    .eq('post_id', id)
    .eq('ctgr_cd', ctgrCd)
    .single()

  if (!post) {
    return NextResponse.json({ error: '게시글을 찾을 수 없습니다' }, { status: 404 })
  }

  // admin 세션(user_id=null)은 역할 기반 / 일반 세션은 소유권 기반
  const canPut = auth.user_id
    ? isOwnerOrAdmin(post.rgst_usr_id, auth.user_id, auth.role_cd)
    : ['ADMIN', 'MASTER'].includes(auth.role_cd)

  if (!canPut) {
    return NextResponse.json({ error: '수정 권한이 없습니다' }, { status: 403 })
  }

  const body = await req.json()
  const { post_ttl, post_cont, pin_yn } = body

  if (!post_ttl?.trim()) {
    return NextResponse.json({ error: '제목은 필수입니다' }, { status: 400 })
  }

  // 전달된 필드만 업데이트 — 없는 필드는 기존 값 유지
  const updateData: Record<string, unknown> = {
    post_ttl:  post_ttl.trim(),
    mod_usr_id: auth.email,
  }
  if ('post_cont' in body) updateData.post_cont = post_cont ?? null
  if ('pin_yn'   in body) updateData.pin_yn    = pin_yn

  const { error } = await supabaseAdmin
    .from('brd_post')
    .update(updateData)
    .eq('post_id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ post_id: id })
}

// DELETE /api/board/[category]/posts/[id]
export async function DELETE(req: NextRequest, { params }: Params) {
  const auth = await requireAuth(req, ['USER', 'SUBMANAGER', 'MANAGER', 'MASTER', 'ADMIN'])
  if (!auth.ok) return auth.response

  const { category, id } = await params
  const ctgrCd = category.toUpperCase()

  if (!VALID_CATEGORIES.includes(ctgrCd)) {
    return NextResponse.json({ error: '존재하지 않는 게시판입니다' }, { status: 404 })
  }

  // 소유권 확인
  const { data: post } = await supabaseAdmin
    .from('brd_post')
    .select('rgst_usr_id, brd_attch ( fl_pth )')
    .eq('post_id', id)
    .eq('ctgr_cd', ctgrCd)
    .single()

  if (!post) {
    return NextResponse.json({ error: '게시글을 찾을 수 없습니다' }, { status: 404 })
  }

  // admin 세션(user_id=null)은 역할 기반 / 일반 세션은 소유권 기반
  const canDelete = auth.user_id
    ? isOwnerOrAdmin(post.rgst_usr_id, auth.user_id, auth.role_cd)
    : ['ADMIN', 'MASTER'].includes(auth.role_cd)

  if (!canDelete) {
    return NextResponse.json({ error: '삭제 권한이 없습니다' }, { status: 403 })
  }

  // Storage 첨부파일 명시적 삭제 (CASCADE ≠ Storage 자동삭제)
  const paths = (post.brd_attch as { fl_pth: string }[] ?? []).map(a => a.fl_pth)
  if (paths.length > 0) {
    await supabaseAdmin.storage.from('board-attachments').remove(paths)
  }

  const { error } = await supabaseAdmin
    .from('brd_post')
    .delete()
    .eq('post_id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ message: '삭제되었습니다' })
}
