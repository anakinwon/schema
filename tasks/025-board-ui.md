# Task 025: 게시판 전체 UI (더미 데이터)

## 개요
API 없이 하드코딩된 더미 데이터로 전체 UI 완성. 레이아웃·반응형·권한별 버튼 표시를 검증한다.
TASK-026 API 응답 구조와 동일한 타입을 미리 정의하여 교체 시 초기값만 변경하면 되도록 설계.

## 구현 사항

### 공통 타입 (컴포넌트 내 인라인 정의)
- [ ] Post, Comment, Attachment, PagedResult 타입
- [ ] 더미 데이터 상수 (DUMMY_POSTS, DUMMY_COMMENTS, DUMMY_ATTACHMENTS)

### components/board/
- [ ] `BoardList.tsx` — 목록 테이블 + 글쓰기 버튼 + Pagination
- [ ] `Pagination.tsx` — 페이지 이동 버튼
- [ ] `PostDetail.tsx` — 상세 + 수정/삭제 버튼 + AttachmentList + CommentSection
- [ ] `PostForm.tsx` — 작성/수정 폼 + AttachmentUploader
- [ ] `CommentSection.tsx` — 댓글 목록 + 작성 폼 + QNA 채택
- [ ] `AttachmentUploader.tsx` — 파일 선택 UI

### page.tsx 연결
- [ ] `app/board/[category]/page.tsx` — BoardList 마운트
- [ ] `app/board/[category]/[id]/page.tsx` — PostDetail 마운트
- [ ] `app/board/[category]/new/page.tsx` — PostForm 마운트
- [ ] `app/board/[category]/[id]/edit/page.tsx` — PostForm (수정 모드) 마운트

## 수락 기준
- /board/notice 접속 시 더미 게시글 5건 테이블 표시
- 고정글(📌)이 목록 최상단에 표시
- /board/notice/[id] 접속 시 상세 + 댓글 표시
- /board/notice/new 접속 시 작성 폼 표시
- 모바일 반응형 overflow-x-auto 적용
- TypeScript 컴파일 에러 없음

## 테스트 계획 ⭐
- 테스트 목표: 더미 UI 전체 동작 확인
- 테스트 시나리오:
  - 목록 페이지 → 5건 표시, 핀 글 최상단
  - 글 클릭 → 상세 페이지 이동
  - 글쓰기 클릭 → 폼 페이지
  - 파일 선택 → 목록 표시
  - QNA 카테고리 → 채택 버튼 표시
- 테스트 도구: 개발 서버 브라우저 확인

## 단계별 구현 및 테스트 ⭐
- Step 1: BoardList + Pagination → 목록 페이지 렌더링 확인
- Step 2: PostDetail + CommentSection → 상세 페이지 확인
- Step 3: PostForm + AttachmentUploader → 작성 폼 확인
- Step 4: page.tsx 4종 연결 → 전체 플로우 확인
