import { getDb } from './db'

// TASK-014: SQLite STD_DIC에 APV_STATUS 컬럼 추가 (없을 경우)
let columnReady = false

export function ensureApvStatusColumn() {
  if (columnReady) return
  const db = getDb()
  try {
    db.prepare("ALTER TABLE STD_DIC ADD COLUMN APV_STATUS TEXT DEFAULT 'APPROVED'").run()
  } catch {
    // 이미 컬럼 존재 → 무시
  }
  columnReady = true
}

// 승인 상태 레이블
export const APV_STATUS_LABEL: Record<string, string> = {
  APPROVED: '승인',
  PENDING:  '대기',
  REJECTED: '반려',
  DRAFT:    '임시',
}

export const APV_STATUS_COLOR: Record<string, string> = {
  APPROVED: 'bg-green-100 text-green-700',
  PENDING:  'bg-amber-100 text-amber-700',
  REJECTED: 'bg-red-100 text-red-700',
  DRAFT:    'bg-gray-100 text-gray-500',
}
