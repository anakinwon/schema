import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth-guard'
import { VALID_CATEGORIES } from '@/lib/board'

type Params = { params: Promise<{ category: string; id: string }> }

// POST /api/board/[category]/posts/[id]/accept
// QNA 채택: 게시글 작성자만 가능. CTE 가시성 이슈로 순차 2쿼리 실행.
export async function POST(req: NextRequest, { params }: Params) {
  const auth = await requireAuth(req, ['USER', 'SUBMANAGER', 'MANAGER', 'MASTER', 'ADMIN'])
  if (!auth.ok) return auth.response

  const { category, id } = await params
  const ctgrCd = category.toUpperCase()

  if (ctgrCd !== 'QNA') {
    return NextResponse.json({ error: 'Q&A 게시판에서만 채택할 수 있습니다' }, { status: 400 })
  }

  if (!VALID_CATEGORIES.includes(ctgrCd)) {
    return NextResponse.json({ error: '존재하지 않는 게시판입니다' }, { status: 404 })
  }

  // 게시글 조회 + 작성자 확인
  const { data: post } = await supabaseAdmin
    .from('brd_post')
    .select('post_id, rgst_usr_id, answ_yn')
    .eq('post_id', id)
    .eq('ctgr_cd', ctgrCd)
    .single()

  if (!post) {
    return NextResponse.json({ error: '게시글을 찾을 수 없습니다' }, { status: 404 })
  }

  // 채택은 게시글 작성자만 (관리자 포함 불가 — 질문자 의도 존중)
  if (!auth.user_id || post.rgst_usr_id !== auth.user_id) {
    return NextResponse.json({ error: '질문 작성자만 채택할 수 있습니다' }, { status: 403 })
  }

  if (post.answ_yn === 'Y') {
    return NextResponse.json({ error: '이미 채택된 답변이 있습니다' }, { status: 409 })
  }

  const body = await req.json()
  const { cmnt_id } = body

  if (!cmnt_id) {
    return NextResponse.json({ error: 'cmnt_id는 필수입니다' }, { status: 400 })
  }

  // 채택 대상 댓글 확인
  const { data: cmnt } = await supabaseAdmin
    .from('brd_cmnt')
    .select('cmnt_id, acpt_yn')
    .eq('cmnt_id', cmnt_id)
    .eq('post_id', id)
    .single()

  if (!cmnt) {
    return NextResponse.json({ error: '댓글을 찾을 수 없습니다' }, { status: 404 })
  }

  // 순차 2쿼리 — CTE INSERT→UPDATE 가시성 이슈 방지
  const { error: cmntErr } = await supabaseAdmin
    .from('brd_cmnt')
    .update({ acpt_yn: 'Y', mod_usr_id: auth.email })
    .eq('cmnt_id', cmnt_id)

  if (cmntErr) return NextResponse.json({ error: cmntErr.message }, { status: 500 })

  const { error: postErr } = await supabaseAdmin
    .from('brd_post')
    .update({ answ_yn: 'Y', acpt_cmnt_id: cmnt_id, mod_usr_id: auth.email })
    .eq('post_id', id)

  if (postErr) return NextResponse.json({ error: postErr.message }, { status: 500 })

  return NextResponse.json({ message: '채택되었습니다', cmnt_id })
}
