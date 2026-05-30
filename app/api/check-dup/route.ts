import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

const ALLOWED_DIC_FIELDS = new Set(['DIC_LOG_NM', 'DIC_PHY_NM', 'DIC_PHY_FLL_NM'])
const ALLOWED_DOM_FIELDS = new Set(['DOM_NM', 'KEY_DOM_NM', 'KEY_DOM_PHY_NM'])

export async function GET(req: NextRequest) {
  const table = req.nextUrl.searchParams.get('table') ?? 'dic'
  const fieldParam = req.nextUrl.searchParams.get('field') ?? 'DIC_LOG_NM'
  const value = req.nextUrl.searchParams.get('value') ?? ''
  const excludeId = req.nextUrl.searchParams.get('excludeId') ?? ''

  const db = getDb()
  let row: unknown

  if (table === 'dic') {
    if (!ALLOWED_DIC_FIELDS.has(fieldParam))
      return NextResponse.json({ error: 'Invalid field' }, { status: 400 })
    const sql = excludeId
      ? `SELECT DIC_ID FROM STD_DIC WHERE ${fieldParam}=? AND DIC_ID != ?`
      : `SELECT DIC_ID FROM STD_DIC WHERE ${fieldParam}=?`
    row = excludeId ? db.prepare(sql).get(value, excludeId) : db.prepare(sql).get(value)
  } else {
    if (!ALLOWED_DOM_FIELDS.has(fieldParam))
      return NextResponse.json({ error: 'Invalid field' }, { status: 400 })
    const sql = excludeId
      ? `SELECT DOM_ID FROM STD_DOM WHERE ${fieldParam}=? AND DOM_ID != ?`
      : `SELECT DOM_ID FROM STD_DOM WHERE ${fieldParam}=?`
    row = excludeId ? db.prepare(sql).get(value, excludeId) : db.prepare(sql).get(value)
  }

  return NextResponse.json({ duplicate: !!row })
}
