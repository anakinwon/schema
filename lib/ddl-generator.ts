// TASK-010: DDL 스크립트 생성 로직

export type Dbms = 'postgresql' | 'mysql'

export interface TermColumn {
  DIC_ID: string
  DIC_LOG_NM: string       // 논리명
  DIC_PHY_FLL_NM: string   // 물리명 풀네임 (컬럼명)
  DATA_TYPE: string | null  // 데이터타입 코드
  DATA_LEN: number | null
  DATA_SCALE: number | null
}

// 데이터타입 코드 → SQL 타입 문자열
const PG_TYPE: Record<string, (len: number | null, scale: number | null) => string> = {
  '0003':  (l)      => `VARCHAR(${l ?? 100})`,
  '0003T': ()       => 'TEXT',
  '0013':  ()       => 'INTEGER',
  '0015':  (l, s)   => `NUMERIC(${l ?? 18},${s ?? 0})`,
  '0018':  ()       => 'DATE',
  '0020':  ()       => 'TIMESTAMPTZ',
}

const MYSQL_TYPE: Record<string, (len: number | null, scale: number | null) => string> = {
  '0003':  (l)      => `VARCHAR(${l ?? 100})`,
  '0003T': ()       => 'TEXT',
  '0013':  ()       => 'INT',
  '0015':  (l, s)   => `DECIMAL(${l ?? 18},${s ?? 0})`,
  '0018':  ()       => 'DATE',
  '0020':  ()       => 'DATETIME',
}

function toSqlType(col: TermColumn, dbms: Dbms): string {
  const map = dbms === 'postgresql' ? PG_TYPE : MYSQL_TYPE
  const fn = col.DATA_TYPE ? map[col.DATA_TYPE] : null
  if (!fn) return dbms === 'postgresql' ? 'VARCHAR(100)' : 'VARCHAR(100)'
  return fn(col.DATA_LEN, col.DATA_SCALE)
}

function quoteCol(name: string, dbms: Dbms): string {
  return dbms === 'mysql' ? `\`${name}\`` : `"${name}"`
}

export function generateDDL(
  tableName: string,
  columns: TermColumn[],
  dbms: Dbms,
): string {
  if (columns.length === 0) return '-- 선택된 용어가 없습니다.'

  const tbl = dbms === 'mysql' ? `\`${tableName}\`` : `"${tableName}"`
  const maxColLen = Math.max(...columns.map(c => c.DIC_PHY_FLL_NM.length))

  const colLines = columns.map(col => {
    const colName  = quoteCol(col.DIC_PHY_FLL_NM, dbms)
    const colType  = toSqlType(col, dbms)
    const padding  = ' '.repeat(Math.max(1, maxColLen - col.DIC_PHY_FLL_NM.length + 2))
    const comment  = `-- ${col.DIC_LOG_NM}`
    return `  ${colName}${padding}${colType.padEnd(20)} ${comment}`
  })

  if (dbms === 'postgresql') {
    return [
      `CREATE TABLE ${tbl} (`,
      colLines.join(',\n'),
      ');',
    ].join('\n')
  } else {
    return [
      `CREATE TABLE ${tbl} (`,
      colLines.join(',\n'),
      `) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='${tableName}';`,
    ].join('\n')
  }
}
