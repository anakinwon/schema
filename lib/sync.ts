import { getDb } from './db'
import { supabaseAdmin } from './supabase'

export interface SyncResult {
  entity: string
  inserted: number
  updated: number
  errors: number
  elapsed_ms: number
}

// SQLite STD_DIC → Supabase std_dic_sync 단방향 동기화
async function syncStdDic(): Promise<SyncResult> {
  const t0 = Date.now()
  const db = getDb()

  const rows = db.prepare(`
    SELECT DIC_ID, DIC_LOG_NM, DIC_PHY_NM, DIC_PHY_FLL_NM, DIC_DESC,
           DIC_GBN_CD, ENT_CLSS_YN, ATTR_CLSS_YN, DOM_USE_YN, DOM_ID,
           DATA_TYPE, DATA_LEN, DATA_SCALE, STORED_TERM_COMP_IDS
    FROM STD_DIC
  `).all() as Record<string, unknown>[]

  let inserted = 0, updated = 0, errors = 0

  // 청크 단위로 upsert (Supabase 한 요청 크기 제한 대비)
  const CHUNK = 50
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK).map(r => ({
      dic_id:               r.DIC_ID,
      dic_log_nm:           r.DIC_LOG_NM,
      dic_phy_nm:           r.DIC_PHY_NM,
      dic_phy_fll_nm:       r.DIC_PHY_FLL_NM,
      dic_desc:             r.DIC_DESC,
      dic_gbn_cd:           r.DIC_GBN_CD,
      ent_clss_yn:          r.ENT_CLSS_YN,
      attr_clss_yn:         r.ATTR_CLSS_YN,
      dom_use_yn:           r.DOM_USE_YN,
      dom_id:               r.DOM_ID,
      data_type:            r.DATA_TYPE,
      data_len:             r.DATA_LEN,
      data_scale:           r.DATA_SCALE,
      stored_term_comp_ids: r.STORED_TERM_COMP_IDS,
      synced_at:            new Date().toISOString(),
    }))

    const { error } = await supabaseAdmin
      .from('std_dic_sync')
      .upsert(chunk, { onConflict: 'dic_id' })

    if (error) { errors += chunk.length }
    else { inserted += chunk.length }
  }

  return { entity: 'STD_DIC', inserted, updated, errors, elapsed_ms: Date.now() - t0 }
}

// SQLite STD_DOM → Supabase std_dom_sync 단방향 동기화
async function syncStdDom(): Promise<SyncResult> {
  const t0 = Date.now()
  const db = getDb()

  const rows = db.prepare(`
    SELECT DOM_ID, KEY_DOM_NM, KEY_DOM_PHY_NM, DOM_NM,
           DOM_TYPE_CD, DATA_TYPE_CD, DATA_LEN, DATA_SCALE, DOM_DESC
    FROM STD_DOM
  `).all() as Record<string, unknown>[]

  let inserted = 0, errors = 0
  const CHUNK = 50

  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK).map(r => ({
      dom_id:         r.DOM_ID,
      key_dom_nm:     r.KEY_DOM_NM,
      key_dom_phy_nm: r.KEY_DOM_PHY_NM,
      dom_nm:         r.DOM_NM,
      dom_type_cd:    r.DOM_TYPE_CD,
      data_type_cd:   r.DATA_TYPE_CD,
      data_len:       r.DATA_LEN,
      data_scale:     r.DATA_SCALE,
      dom_desc:       r.DOM_DESC,
      synced_at:      new Date().toISOString(),
    }))

    const { error } = await supabaseAdmin
      .from('std_dom_sync')
      .upsert(chunk, { onConflict: 'dom_id' })

    if (error) { errors += chunk.length }
    else { inserted += chunk.length }
  }

  return { entity: 'STD_DOM', inserted, updated: 0, errors, elapsed_ms: Date.now() - t0 }
}

// 전체 동기화 실행 + sync_log 기록
export async function runFullSync(): Promise<SyncResult[]> {
  const results = await Promise.all([syncStdDic(), syncStdDom()])

  // sync_log에 결과 기록
  for (const r of results) {
    await supabaseAdmin.from('sync_log').insert({
      entity_type:  r.entity,
      synced_count: r.inserted + r.updated,
      status:       r.errors === 0 ? 'SUCCESS' : 'PARTIAL',
      error_msg:    r.errors > 0 ? `${r.errors}건 오류` : null,
    })
  }

  return results
}

// 최근 동기화 이력 조회
export async function getSyncHistory(limit = 10) {
  const { data } = await supabaseAdmin
    .from('sync_log')
    .select('*')
    .order('synced_at', { ascending: false })
    .limit(limit)
  return data ?? []
}
