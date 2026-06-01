# Task 030: 관리자 게시판 + 진입점

## 개요
관리자 Back Office에서 게시판을 관리하는 페이지 구현.
좌측: 카테고리별 글 수 목록 / 우측: 게시글 목록 + 강제 삭제.
admin 세션(user_id=null)에서도 ADMIN 역할 기반 삭제·수정 가능하도록 API 수정.

## 구현 사항

- [x] `app/api/board/[category]/posts/[id]/route.ts` — PUT/DELETE admin 세션 권한 처리
- [x] `components/admin/BoardAdmin.tsx` — 좌우 패널 관리 UI
- [x] `app/admin/(protected)/board/page.tsx` — 관리자 게시판 라우트
- [x] `app/admin/(protected)/layout.tsx` — NAV_LINKS 게시판관리 추가
- [x] `components/standards/StandardsPage.tsx` — 헤더 게시판 링크 추가

## 수락 기준
- /admin/board 접속 → 카테고리별 글 목록
- 관리자가 타인 글 삭제 → 200
- 일반 사용자 강제 삭제 불가 → 403
- StandardsPage 헤더에 게시판 링크 표시

## 단계별 구현 ⭐
- Step 1: API PUT/DELETE admin 세션 권한 처리 ✅
- Step 2: BoardAdmin.tsx 구현
- Step 3: 라우트 + NAV_LINKS + 헤더 링크 추가
