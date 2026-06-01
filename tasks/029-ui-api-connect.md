# Task 029: UI-API 연동 (더미→실제 Bearer fetch)

## 개요
TASK-025 더미 데이터를 실제 API Bearer fetch로 교체.
타입은 TASK-025와 동일 유지 — useState 초기값 + fetch 로직만 교체.

## 구현 사항

- [x] `components/board/BoardList.tsx` — GET /api/board/[category]/posts (페이지네이션·검색)
- [x] `components/board/PostDetail.tsx` — GET /api/board/[category]/posts/[id]
- [x] `components/board/PostForm.tsx` — POST·PUT + 첨부파일 multipart 업로드
- [x] `components/board/CommentSection.tsx` — GET·POST·DELETE comments + POST accept

## 수락 기준
- /board/notice 접속 시 실제 DB 게시글 표시
- 글쓰기 → 등록 → 목록 redirect
- 상세 조회 → 조회수 +1 확인
- 댓글 등록 → 목록에 즉시 반영
- 파일 첨부 후 등록 → Storage + brd_attch 확인
- NOTICE에 USER 계정 → 글쓰기 버튼 숨김
- QNA 채택 버튼 → 글 작성자만 표시

## 단계별 구현 ⭐
- Step 1: BoardList → 목록 실제 데이터 확인 ✅
- Step 2: PostDetail → 상세 + 조회수 증가 확인
- Step 3: PostForm → 등록/수정 → 목록 redirect 확인
- Step 4: CommentSection → 댓글 CRUD + 채택 확인
