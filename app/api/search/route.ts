import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { matchesQuery, isInitialSearch } from '@/lib/korean-utils'
import { requireAnyAuth } from '@/lib/auth-guard'

// TASK-011: 통합 검색 API (초성 검색 + 약어 역방향 검색)
// GET /api/search?q=사용자&mode=all|word|domain|term
export async function GET(req: NextRequest) {
  const auth = await requireAnyAuth(req)
  if (!auth.ok) return auth.response

  const q = (req.nextUrl.searchParams.get('q') ?? '').trim().slice(0, 100)
  const mode = req.nextUrl.searchParams.get('mode') ?? 'all'

  if (!q) return NextResponse.json({ words: [], domains: [], terms: [] })

  const db = getDb()
  const result: { words: unknown[]; domains: unknown[]; terms: unknown[] } = {
    words: [], domains: [], terms: [],
  }

  // 단어 검색 (논리명·물리명·물리전체명 대상)
  if (mode === 'all' || mode === 'word') {
    const allWords = db.prepare(`
      SELECT DIC_ID, DIC_LOG_NM, DIC_PHY_NM, DIC_PHY_FLL_NM,
             ENT_CLSS_YN, ATTR_CLSS_YN, DOM_ID
      FROM STD_DIC WHERE DIC_GBN_CD = '0001'
    `).all() as { DIC_ID: string; DIC_LOG_NM: string; DIC_PHY_NM: string; DIC_PHY_FLL_NM: string; ENT_CLSS_YN: string; ATTR_CLSS_YN: string; DOM_ID: string | null }[]

    result.words = allWords.filter(w =>
      matchesQuery(w.DIC_LOG_NM, q) ||
      matchesQuery(w.DIC_PHY_NM, q) ||
      matchesQuery(w.DIC_PHY_FLL_NM ?? '', q) ||
      // 약어 역방향: 물리명이 검색어를 포함 (대소문자 무시)
      (!isInitialSearch(q) && w.DIC_PHY_NM.toUpperCase().includes(q.toUpperCase()))
    )
  }

  // 도메인 검색
  if (mode === 'all' || mode === 'domain') {
    const allDomains = db.prepare(`
      SELECT DOM_ID, KEY_DOM_NM, KEY_DOM_PHY_NM, DOM_NM, DATA_TYPE_CD, DATA_LEN
      FROM STD_DOM
    `).all() as { DOM_ID: string; KEY_DOM_NM: string; KEY_DOM_PHY_NM: string; DOM_NM: string; DATA_TYPE_CD: string | null; DATA_LEN: number | null }[]

    result.domains = allDomains.filter(d =>
      matchesQuery(d.KEY_DOM_NM, q) ||
      matchesQuery(d.DOM_NM, q) ||
      (!isInitialSearch(q) && d.KEY_DOM_PHY_NM.toUpperCase().includes(q.toUpperCase()))
    )
  }

  // 용어 검색
  if (mode === 'all' || mode === 'term') {
    const allTerms = db.prepare(`
      SELECT DIC_ID, DIC_LOG_NM, DIC_PHY_NM, DIC_PHY_FLL_NM
      FROM STD_DIC WHERE DIC_GBN_CD = '0002'
    `).all() as { DIC_ID: string; DIC_LOG_NM: string; DIC_PHY_NM: string; DIC_PHY_FLL_NM: string }[]

    result.terms = allTerms.filter(t =>
      matchesQuery(t.DIC_LOG_NM, q) ||
      matchesQuery(t.DIC_PHY_FLL_NM ?? '', q) ||
      (!isInitialSearch(q) && (t.DIC_PHY_NM ?? '').toUpperCase().includes(q.toUpperCase()))
    )
  }

  return NextResponse.json(result)
}
