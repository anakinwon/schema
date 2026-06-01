import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth-guard'
import { isOwnerOrAdmin, VALID_CATEGORIES } from '@/lib/board'

type Params = { params: Promise<{ category: string; id: string; attId: string }> }

const BUCKET = 'board-attachments'

// DELETE /api/board/[category]/posts/[id]/attachments/[attId]
export async function DELETE(req: NextRequest, { params }: Params) {
  const auth = await requireAuth(req, ['USER', 'SUBMANAGER', 'MANAGER', 'MASTER', 'ADMIN'])
  if (!auth.ok) return auth.response

  const { category, id, attId } = await params
  const ctgrCd = category.toUpperCase()

  if (!VALID_CATEGORIES.includes(ctgrCd)) {
    return NextResponse.json({ error: '존재하지 않는 게시판입니다' }, { status: 404 })
  }

  // 첨부파일 + 게시글 소유권 함께 조회
  const { data: attch } = await supabaseAdmin
    .from('brd_attch')
    .select('attch_id, fl_pth, brd_post!inner(rgst_usr_id)')
    .eq('attch_id', attId)
    .eq('post_id', id)
    .single()

  if (!attch) {
    return NextResponse.json({ error: '첨부파일을 찾을 수 없습니다' }, { status: 404 })
  }

  const rgstUsrId = (attch.brd_post as unknown as { rgst_usr_id: string }).rgst_usr_id

  if (!auth.user_id || !isOwnerOrAdmin(rgstUsrId, auth.user_id, auth.role_cd)) {
    return NextResponse.json({ error: '삭제 권한이 없습니다' }, { status: 403 })
  }

  // Storage 삭제 먼저 (실패해도 DB는 삭제 — orphan 파일보다 orphan 레코드가 덜 위험)
  await supabaseAdmin.storage.from(BUCKET).remove([attch.fl_pth])

  const { error } = await supabaseAdmin
    .from('brd_attch')
    .delete()
    .eq('attch_id', attId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ message: '삭제되었습니다' })
}
