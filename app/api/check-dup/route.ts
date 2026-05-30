import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export async function GET(req: NextRequest) {
  const table = req.nextUrl.searchParams.get('table') ?? 'dic'
  const field = req.nextUrl.searchParams.get('field') ?? 'DIC_LOG_NM'
  const value = req.nextUrl.searchParams.get('value') ?? ''
  const excludeId = req.nextUrl.searchParams.get('excludeId') ?? ''

  const db = getDb()
  let row: unknown

  if (table === 'dic') {
    const sql = excludeId
      ? `SELECT DIC_ID FROM STD_DIC WHERE ${field}=? AND DIC_ID != ?`
      : `SELECT DIC_ID FROM STD_DIC WHERE ${field}=?`
    row = excludeId
      ? db.prepare(sql).get(value, excludeId)
      : db.prepare(sql).get(value)
  } else {
    const sql = excludeId
      ? `SELECT DOM_ID FROM STD_DOM WHERE ${field}=? AND DOM_ID != ?`
      : `SELECT DOM_ID FROM STD_DOM WHERE ${field}=?`
    row = excludeId
      ? db.prepare(sql).get(value, excludeId)
      : db.prepare(sql).get(value)
  }

  return NextResponse.json({ duplicate: !!row })
}
