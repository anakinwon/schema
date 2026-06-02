import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth-guard'
import { revalidateTag } from 'next/cache'

type Params = { params: Promise<{ cd: string }> }

export async function PUT(req: NextRequest, { params }: Params) {
  const auth = await requireAuth(req, ['ADMIN', 'MASTER'])
  if (!auth.ok) return auth.response

  const { cd } = await params
  const body = await req.json()
  const allowed = ['lang_nm', 'native_nm', 'country_cd', 'font_key', 'dir_cd', 'sort_ord', 'use_yn']
  const update: Record<string, unknown> = { modr_id: auth.email }
  for (const k of allowed) if (k in body) update[k] = body[k]

  const { error } = await supabaseAdmin.from('i18n_lang_mst').update(update).eq('lang_cd', cd)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  try { revalidateTag('i18n', 'max') } catch {}
  return NextResponse.json({ ok: true })
}
