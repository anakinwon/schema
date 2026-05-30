import Database from 'better-sqlite3'
import path from 'path'

const DB_PATH = path.join(
  process.cwd(),
  '.claude', 'skills', 'data-architecture-team',
  '1-chief-data-architect', 'da-common-sqlite-ops',
  'references', 'SQLiteDB_for_META_v5.db'
)

let _db: Database.Database | null = null

export function getDb(): Database.Database {
  if (!_db) {
    _db = new Database(DB_PATH)
    _db.pragma('journal_mode = WAL')
  }
  return _db
}

export const STD_AREA = '{837B8059-C2C4-46DC-97DD-C64661CA447B}'
