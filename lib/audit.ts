import { getDb } from './db'
import { randomUUID } from 'crypto'
import { type NextRequest } from 'next/server'
import { isAdminSession } from './admin-auth'

export type EntityType  = 'STD_DIC' | 'STD_DOM'
export type ActionType  = 'INSERT'  | 'UPDATE' | 'DELETE'

let tableReady = false

function ensureTable() {
  if (tableReady) return
  getDb().prepare(`
    CREATE TABLE IF NOT EXISTS STD_AUDIT_LOG (
      LOG_ID       TEXT NOT NULL PRIMARY KEY,
      ENTITY_TYPE  TEXT NOT NULL,
      ENTITY_ID    TEXT NOT NULL,
      ENTITY_NM    TEXT,
      ACTION_TYPE  TEXT NOT NULL,
      BEFORE_DATA  TEXT,
      AFTER_DATA   TEXT,
      CHANGED_BY   TEXT NOT NULL,
      CHANGED_AT   TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    )
  `).run()
  tableReady = true
}

export function writeAudit({
  entityType, entityId, entityNm, actionType, before, after, changedBy,
}: {
  entityType: EntityType
  entityId:   string
  entityNm:   string
  actionType: ActionType
  before?:    Record<string, unknown>
  after?:     Record<string, unknown>
  changedBy:  string
}) {
  ensureTable()
  getDb().prepare(`
    INSERT INTO STD_AUDIT_LOG
      (LOG_ID, ENTITY_TYPE, ENTITY_ID, ENTITY_NM, ACTION_TYPE, BEFORE_DATA, AFTER_DATA, CHANGED_BY, CHANGED_AT)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now', 'localtime'))
  `).run(
    randomUUID(), entityType, entityId, entityNm, actionType,
    before ? JSON.stringify(before) : null,
    after  ? JSON.stringify(after)  : null,
    changedBy,
  )
}

// 요청에서 변경자 추출
export function getChangedBy(req: NextRequest): string {
  if (isAdminSession(req)) return 'ADMIN'
  const auth = req.headers.get('authorization')
  if (auth) return 'USER'
  return 'SYSTEM'
}
