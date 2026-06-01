export const CATEGORY_NAME: Record<string, string> = {
  NOTICE:  '공지사항',
  ARCHIVE: '자료실',
  FREE:    '자유게시판',
  QNA:     'Q&A',
}

export const VALID_CATEGORIES = Object.keys(CATEGORY_NAME)

// 카테고리별 쓰기 가능 최소 역할 목록 (brd_ctgr.wr_min_role_cd 기준 계층 포함)
export const BOARD_WRITE_ROLES: Record<string, string[]> = {
  NOTICE:  ['MASTER',  'ADMIN'],
  ARCHIVE: ['MANAGER', 'MASTER', 'ADMIN'],
  FREE:    ['USER',    'MANAGER', 'MASTER', 'ADMIN', 'SUBMANAGER'],
  QNA:     ['USER',    'MANAGER', 'MASTER', 'ADMIN', 'SUBMANAGER'],
}

export function canWrite(ctgrCd: string, roleCd: string): boolean {
  return (BOARD_WRITE_ROLES[ctgrCd] ?? []).includes(roleCd)
}

// 게시글 소유자 또는 관리자 여부 확인
export function isOwnerOrAdmin(
  rgstUsrId: string,
  currentUserId: string,
  roleCd: string,
): boolean {
  return rgstUsrId === currentUserId || ['ADMIN', 'MASTER'].includes(roleCd)
}

