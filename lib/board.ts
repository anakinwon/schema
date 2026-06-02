// 유효 카테고리 코드 — 단일 소스 (CATEGORY_NAME은 messages/ko.json board.categories.* 로 이전)
export const VALID_CATEGORIES: string[] = ['NOTICE', 'ARCHIVE', 'FREE', 'QNA']

// 카테고리별 쓰기 가능 최소 역할 목록
export const BOARD_WRITE_ROLES: Record<string, string[]> = {
  NOTICE:  ['MASTER',  'ADMIN'],
  ARCHIVE: ['MANAGER', 'MASTER', 'ADMIN'],
  FREE:    ['USER',    'MANAGER', 'MASTER', 'ADMIN', 'SUBMANAGER'],
  QNA:     ['USER',    'MANAGER', 'MASTER', 'ADMIN', 'SUBMANAGER'],
}

export function canWrite(ctgrCd: string, roleCd: string): boolean {
  return (BOARD_WRITE_ROLES[ctgrCd] ?? []).includes(roleCd)
}

export function isOwnerOrAdmin(
  rgstUsrId: string,
  currentUserId: string,
  roleCd: string,
): boolean {
  return rgstUsrId === currentUserId || ['ADMIN', 'MASTER'].includes(roleCd)
}
