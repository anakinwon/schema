import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth-guard'
import { revalidateTag } from 'next/cache'

type Params = { params: Promise<{ id: string }> }

export async function PUT(req: NextRequest, { params }: Params) {
  const auth = await requireAuth(req, ['ADMIN', 'MASTER'])
  if (!auth.ok) return auth.response

  const { id } = await params
  const { msg_val } = await req.json()
  if (msg_val === undefined) return NextResponse.json({ error: 'msg_val 필수' }, { status: 400 })

  const { error } = await supabaseAdmin
    .from('i18n_msg')
    .update({ msg_val, modr_id: auth.email })
    .eq('msg_id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  try { revalidateTag('i18n', 'max') } catch {}
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const auth = await requireAuth(req, ['ADMIN', 'MASTER'])
  if (!auth.ok) return auth.response

  const { id } = await params
  const { error } = await supabaseAdmin.from('i18n_msg').delete().eq('msg_id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  try { revalidateTag('i18n', 'max') } catch {}
  return NextResponse.json({ ok: true })
}
