import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth-guard'

// GET /api/board/categories
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ['USER', 'SUBMANAGER', 'MANAGER', 'MASTER', 'ADMIN'])
  if (!auth.ok) return auth.response

  const { data, error } = await supabaseAdmin
    .from('brd_ctgr')
    .select('ctgr_cd, ctgr_nm, attch_yn, cmnt_yn, wr_min_role_cd, sort_ord')
    .eq('use_yn', 'Y')
    .order('sort_ord')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}
