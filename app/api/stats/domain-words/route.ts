import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

// TASK-012: 도메인별 표준단어 연결 현황 집계 (FR-02 AC4)
export async function GET() {
  const db = getDb()

  const rows = db.prepare(`
    SELECT
      d.DOM_ID,
      d.DOM_NM,
      d.KEY_DOM_PHY_NM,
      COUNT(w.DIC_ID) AS word_count
    FROM STD_DOM d
    LEFT JOIN STD_DIC w ON w.DOM_ID = d.DOM_ID AND w.DIC_GBN_CD = '0001'
    GROUP BY d.DOM_ID, d.DOM_NM, d.KEY_DOM_PHY_NM
    ORDER BY word_count DESC, d.KEY_DOM_PHY_NM
  `).all()

  return NextResponse.json(rows)
}
