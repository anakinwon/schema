import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

// TASK-012: 단어 역추적 — 이 단어를 사용하는 용어 목록 (FR-03 AC4)
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const db = getDb()

  const terms = db.prepare(`
    SELECT d.DIC_ID, d.DIC_LOG_NM, d.DIC_PHY_NM, d.DIC_PHY_FLL_NM,
           c.ORDER_NO
    FROM STD_WORD_COMBI c
    JOIN STD_DIC d ON c.TERM_ID = d.DIC_ID
    WHERE c.WORD_ID = ?
    ORDER BY d.DIC_PHY_NM
  `).all(id)

  return NextResponse.json(terms)
}
