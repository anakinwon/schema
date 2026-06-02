export interface StdWord {
  DIC_ID: string
  DIC_LOG_NM: string
  DIC_PHY_NM: string
  DIC_PHY_FLL_NM: string
  DIC_DESC: string
  DIC_GBN_CD: string      // '0001'=단어, '0002'=용어
  ENT_CLSS_YN: string
  ATTR_CLSS_YN: string
  DATA_TYPE: string | null
  DATA_LEN: number | null
  DATA_SCALE: number | null
  DOM_USE_YN: string
  DOM_ID: string | null
  DOM_NM: string | null   // joined
  STORED_TERM_COMP_IDS: string | null
}

export interface StdDomain {
  DOM_ID: string
  KEY_DOM_PHY_NM: string
  KEY_DOM_NM: string
  DOM_NM: string
  DOM_TYPE_CD: string | null
  DATA_TYPE_CD: string | null
  DATA_LEN: number | null
  DATA_SCALE: number | null
  DOM_DESC: string | null
  DATA_FORMAT: string | null
  DATA_MIN: string | null
  DATA_MAX: string | null
  DIC_ID: string | null
}

export interface StdWordCombi {
  STD_AREA_ID: string
  TERM_ID: string
  TGT_GBN_CD: string
  ORDER_NO: number
  WORD_ID: string
  WORD_LOG_NM?: string
  WORD_PHY_NM?: string
}

export const DOM_TYPE_OPTIONS = [
  { value: '0001', label: '코드형' },
  { value: '0002', label: '번호형' },
  { value: '0003', label: '일반형' },
]

export const DATA_TYPE_OPTIONS = [
  { value: '0003', label: 'VARCHAR' },
  { value: '0003T', label: 'TEXT' },
  { value: '0013', label: 'INTEGER' },
  { value: '0015', label: 'NUMERIC' },
  { value: '0018', label: 'DATE' },
  { value: '0020', label: 'TIMESTAMPTZ' },
]

export const DATA_TYPE_LABEL: Record<string, string> = {
  '0003': 'VARCHAR', '0013': 'INTEGER',
  '0015': 'NUMERIC', '0018': 'DATE', '0020': 'TIMESTAMPTZ',
}
