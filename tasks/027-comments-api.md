# Task 027: 댓글 + QNA 채택 API

## 개요
게시판 댓글 CRUD + Q&A 채택 기능 API. cmnt_yn='Y'인 게시판(FREE·QNA)만 댓글 허용.
QNA 채택은 CTE INSERT→UPDATE 가시성 이슈로 순차 2쿼리로 구현.

## 구현 사항

- [x] `app/api/board/[category]/posts/[id]/comments/route.ts` — GET / POST
- [x] `app/api/board/[category]/posts/[id]/comments/[cmntId]/route.ts` — DELETE
- [x] `app/api/board/[category]/posts/[id]/accept/route.ts` — POST (QNA 채택)

## 수락 기준
- GET .../comments → 댓글 목록 배열
- POST .../comments (FREE) → 201
- POST .../comments (NOTICE, cmnt_yn=N) → 403
- DELETE .../comments/[id] (타인) → 403 | (본인/ADMIN) → 200
- POST .../accept (글 작성자) → 200, answ_yn='Y', acpt_cmnt_id 설정
- POST .../accept (타인) → 403

## 테스트 계획 ⭐
- NOTICE 댓글 시도 → 403
- FREE 댓글 등록 → 201, acpt_yn='N'
- QNA 채택 → answ_yn='Y' + 댓글 acpt_yn='Y' 동시 확인
- 타인 댓글 채택 시도 → 403

## 단계별 구현 및 테스트 ⭐
- Step 1: comments GET/POST → 권한별 응답 확인 ✅
- Step 2: comments DELETE → 소유권 403 확인
- Step 3: accept POST → answ_yn/acpt_yn 동시 업데이트 확인
