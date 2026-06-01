import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth-guard'
import { isOwnerOrAdmin, VALID_CATEGORIES } from '@/lib/board'

type Params = { params: Promise<{ category: string; id: string; cmntId: string }> }

// DELETE /api/board/[category]/posts/[id]/comments/[cmntId]
export async function DELETE(req: NextRequest, { params }: Params) {
  const auth = await requireAuth(req, ['USER', 'SUBMANAGER', 'MANAGER', 'MASTER', 'ADMIN'])
  if (!auth.ok) return auth.response

  const { category, id, cmntId } = await params
  const ctgrCd = category.toUpperCase()

  if (!VALID_CATEGORIES.includes(ctgrCd)) {
    return NextResponse.json({ error: '존재하지 않는 게시판입니다' }, { status: 404 })
  }

  const { data: cmnt } = await supabaseAdmin
    .from('brd_cmnt')
    .select('cmnt_id, rgst_usr_id')
    .eq('cmnt_id', cmntId)
    .eq('post_id', id)
    .single()

  if (!cmnt) {
    return NextResponse.json({ error: '댓글을 찾을 수 없습니다' }, { status: 404 })
  }

  if (!auth.user_id || !isOwnerOrAdmin(cmnt.rgst_usr_id, auth.user_id, auth.role_cd)) {
    return NextResponse.json({ error: '삭제 권한이 없습니다' }, { status: 403 })
  }

  const { error } = await supabaseAdmin
    .from('brd_cmnt')
    .delete()
    .eq('cmnt_id', cmntId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ message: '삭제되었습니다' })
}
