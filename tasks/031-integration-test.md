# Task 031: 통합 테스트 (E2E)

## 개요
게시판 전체 플로우 통합 테스트.
레이어 1: API 레벨 (인증 없음 → 4xx, 항상 실행 가능)
레이어 2: 브라우저 E2E (로그인 필요, 환경변수 있을 때만)

## 테스트 파일
- `tests/e2e/board-flow.spec.ts`

## 환경변수 (.env.test)
```
TEST_MASTER_EMAIL=master@example.com
TEST_MASTER_PW=Master1234!
TEST_USER_EMAIL=user@example.com
TEST_USER_PW=User1234!
```

## 실행 명령
```bash
npx playwright test tests/e2e/board-flow.spec.ts
npx playwright test tests/e2e/board-flow.spec.ts --reporter=list
```

## 시나리오
- [x] 미인증 API → 401
- [x] 카테고리 목록 → 4건 구조 확인
- [x] NOTICE 미인증 POST → 401
- [x] INVALID 카테고리 → 404
- [x] 로그인 후 게시글 작성→조회→삭제 플로우 (환경변수 필요)
- [x] USER→NOTICE 쓰기 시도 → 403 (환경변수 필요)
- [x] 관리자 강제 삭제 (환경변수 필요)
- [x] QNA 채택 플로우 (환경변수 필요)
