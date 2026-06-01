# Task 026: 게시글 CRUD API

## 개요
게시판 핵심 API 구현. 카테고리 조회, 게시글 목록(페이지네이션), 상세(조회수 증가), 등록/수정/삭제.
모든 API는 Bearer 인증 필수. 쓰기 권한·소유권은 API 레이어에서 강제.

## 구현 사항

- [x] `app/api/board/categories/route.ts` — GET
- [x] `app/api/board/[category]/posts/route.ts` — GET(페이지네이션) / POST
- [x] `app/api/board/[category]/posts/[id]/route.ts` — GET(+조회수 RPC) / PUT / DELETE

## 수락 기준
- GET /api/board/categories → 4건 카테고리 배열
- GET /api/board/notice/posts?page=1 → { items, total, page, pageSize }
- POST /api/board/free/posts (USER) → 201
- POST /api/board/notice/posts (USER) → 403
- DELETE .../posts/[id] (타인) → 403 | (ADMIN) → 200
- GET .../posts/[없는id] → 404

## 테스트 계획 ⭐
계획 문서 `/tasks/026-posts-api.md` 내 테스트 시나리오 참조.
Playwright E2E는 TASK-031에서 종합 수행.

## 단계별 구현 및 테스트 ⭐
- Step 1: categories API → 4건 반환 확인 ✅
- Step 2: posts GET 목록+페이지네이션 → 응답 구조 검증
- Step 3: posts POST → 권한별 201/403
- Step 4: posts/[id] GET/PUT/DELETE → 조회수+1, 소유권 403
