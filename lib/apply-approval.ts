import { getDb } from './db'

type ApplyOk  = { ok: true;  before: Record<string, unknown> }
type ApplyErr = { ok: false; error: string }
export type ApplyResult = ApplyOk | ApplyErr

/**
 * 승인(APPROVE) 결정 후 req_data를 원본 SQLite 테이블에 반영합니다.
 * before 스냅샷을 반환해 호출자가 Audit을 기록할 수 있게 합니다.
 *
 * STD_DIC / STD_DOM 만 반영 대상이며, 나머지 entity_type은 ok:true를 반환합니다.
 */
export function applyApprovalToDb(
  entityType: string,
  entityId:   string,
  reqData:    Record<string, unknown>,
): ApplyResult {
  const db = getDb()

  try {
    if (entityType === 'STD_DIC') {
      const before = db.prepare('SELECT * FROM STD_DIC WHERE DIC_ID = ?').get(entityId) as Record<string, unknown> | undefined
      if (!before) return { ok: false, error: `STD_DIC(${entityId}) 레코드 없음` }

      // std-dic/[id] PUT 로직과 동일
      const applyDic = db.transaction(() => {
        db.prepare(`
          UPDATE STD_DIC SET
            DIC_LOG_NM=?, DIC_PHY_NM=?, DIC_PHY_FLL_NM=?, DIC_DESC=?,
            ENT_CLSS_YN=?, ATTR_CLSS_YN=?,
            DOM_USE_YN=?, DOM_ID=?,
            DATA_TYPE=?, DATA_LEN=?, DATA_SCALE=?,
            STORED_TERM_COMP_IDS=?, SORTED_TERM_COMP_IDS=?
          WHERE DIC_ID=?
        `).run(
          reqData.DIC_LOG_NM,        reqData.DIC_PHY_NM,
          reqData.DIC_PHY_FLL_NM ?? '',  reqData.DIC_DESC ?? '',
          reqData.ENT_CLSS_YN  ?? 'N',  reqData.ATTR_CLSS_YN ?? 'Y',
          reqData.DOM_USE_YN   ?? 'N',  reqData.DOM_ID   ?? null,
          reqData.DATA_TYPE    ?? null,  reqData.DATA_LEN ?? null,
          reqData.DATA_SCALE   ?? null,
          reqData.STORED_TERM_COMP_IDS ?? null,
          reqData.SORTED_TERM_COMP_IDS ?? null,
          entityId,
        )

        if (Array.isArray(reqData.wordIds)) {
          db.prepare('DELETE FROM STD_WORD_COMBI WHERE TERM_ID=?').run(entityId)
          const stmt = db.prepare(`
            INSERT INTO STD_WORD_COMBI
              (STD_AREA_ID, TERM_ID, TGT_GBN_CD, ORDER_NO, WORD_ID, AVAL_END_DT, AVAL_ST_DT)
            VALUES(?,?,?,?,?,?,?)
          `)
          const now = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14)
          ;(reqData.wordIds as string[]).forEach((wid, i) => {
            stmt.run(
              '{837B8059-C2C4-46DC-97DD-C64661CA447B}',
              entityId, '0001', i + 1, wid,
              '99991231235959', now,
            )
          })
        }
      })

      applyDic()
      return { ok: true, before }
    }

    if (entityType === 'STD_DOM') {
      const before = db.prepare('SELECT * FROM STD_DOM WHERE DOM_ID = ?').get(entityId) as Record<string, unknown> | undefined
      if (!before) return { ok: false, error: `STD_DOM(${entityId}) 레코드 없음` }

      // std-dom/[id] PUT 로직과 동일
      db.prepare(`
        UPDATE STD_DOM SET
          KEY_DOM_NM=?, DOM_NM=?, DOM_DESC=?,
          DOM_TYPE_CD=?, DATA_TYPE_CD=?, DATA_LEN=?, DATA_SCALE=?,
          DATA_FORMAT=?, DATA_MIN=?, DATA_MAX=?,
          KEY_DOM_PHY_NM=?
        WHERE DOM_ID=?
      `).run(
        reqData.KEY_DOM_NM,      reqData.DOM_NM,
        reqData.DOM_DESC ?? null,
        reqData.DOM_TYPE_CD  ?? null,  reqData.DATA_TYPE_CD ?? null,
        reqData.DATA_LEN     ?? null,  reqData.DATA_SCALE   ?? null,
        reqData.DATA_FORMAT  ?? null,
        reqData.DATA_MIN     ?? null,  reqData.DATA_MAX     ?? null,
        reqData.KEY_DOM_PHY_NM,
        entityId,
      )

      return { ok: true, before }
    }

    // APPROVAL, SYS_CODE_* 등 나머지 엔티티 — DB 반영 불필요
    return { ok: true, before: {} }

  } catch (e) {
    return { ok: false, error: String(e) }
  }
}
