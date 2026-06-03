import { getDb } from './db'
import { randomUUID } from 'crypto'
import { type NextRequest } from 'next/server'
import { isAdminSession } from './admin-auth'
import { supabase } from './supabase'

export type EntityType   = 'STD_DIC' | 'STD_DOM' | 'APPROVAL' | 'SYS_CODE_GRP' | 'SYS_CODE_VAL' | 'SECURITY'
export type ActionType   = 'INSERT'  | 'UPDATE' | 'DELETE'
export type SecurityEvent = 'LOGIN_FAILURE' | 'ADMIN_LOGIN' | 'ROLE_CHANGE' | 'UNAUTHORIZED_ACCESS'

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

/** 보안 이벤트 감사 로그 기록 (로그인 실패·역할 변경·권한 위반 등) */
export function writeSecurityAudit(event: {
  eventType: SecurityEvent
  actor:     string
  target?:   string
  detail?:   string
  ip?:       string
}) {
  ensureTable()
  getDb().prepare(`
    INSERT INTO STD_AUDIT_LOG
      (LOG_ID, ENTITY_TYPE, ENTITY_ID, ENTITY_NM, ACTION_TYPE, BEFORE_DATA, AFTER_DATA, CHANGED_BY, CHANGED_AT)
    VALUES (?, 'SECURITY', ?, ?, ?, ?, ?, ?, datetime('now', 'localtime'))
  `).run(
    randomUUID(),
    event.eventType,
    event.target ?? '',
    event.eventType,
    event.ip    ? JSON.stringify({ ip: event.ip })         : null,
    event.detail ? JSON.stringify({ detail: event.detail }) : null,
    event.actor,
  )
}

// 요청에서 변경자 추출 — Bearer 토큰이 있으면 실제 이메일 반환
export async function getChangedBy(req: NextRequest): Promise<string> {
  if (isAdminSession(req)) return 'ADMIN'
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) return 'SYSTEM'
  const { data: { user } } = await supabase.auth.getUser(token)
  return user?.email ?? 'USER'
}
