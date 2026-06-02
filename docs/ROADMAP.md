# 표준데이터 관리 프로그램 개발 로드맵

쇼핑몰 DB 물리설계 표준을 단일 UI에서 관리하고 RBAC로 접근을 제어하는 DA 내부 관리 도구

> **기준일**: 2026-06-02 (최종 업데이트: 2026-06-02)
> **현재 버전**: v3 Phase 2 완료 / v4 다국어 시스템 설계 완료 — 구현 대기
> **기술 스택**: Next.js 16.2.6 (App Router) · React 19.2 · TypeScript · Tailwind CSS v4 · SQLite(better-sqlite3) · Supabase PostgreSQL

---

## 개요

**표준데이터 관리 프로그램**은 DA(Data Architect) 담당자와 쇼핑몰 데이터 관리 팀을 위한 표준 거버넌스 도구로 다음 기능을 제공합니다:

- **표준 사전 관리**: 표준단어(STD_DIC) · 도메인(STD_DOM) · 용어(DA_TERM)를 단일 UI에서 조회·등록·수정
- **RBAC 권한 제어**: 5계층 역할(ADMIN > MASTER > MANAGER > SUBMANAGER > USER)별 편집 권한 제어
- **표준 오염 방지**: 중복 단어 실시간 체크 API로 일관된 물리명 규칙 유지
- **이중 DB 운용**: 로컬 SQLite(메타 편집) + Supabase PostgreSQL(인증·권한)으로 오프라인 편집 지원

---

## 개발 워크플로우

1. **작업 계획**
   - 기존 코드베이스를 학습하고 현재 상태를 파악
   - 새로운 작업을 포함하도록 `ROADMAP.md` 업데이트
   - 우선순위 작업은 마지막 완료된 작업 다음에 삽입

2. **작업 생성**
   - `/tasks` 디렉토리에 새 작업 파일 생성 (명명 형식: `XXX-description.md`)
   - 고수준 명세서, 관련 파일, 수락 기준, 구현 단계 포함
   - **API/비즈니스 로직 작업 시 "## 테스트 계획" 섹션 필수 포함** (Playwright MCP 테스트 시나리오 작성)
   - 직전 완료 작업을 예시로 참조, 초기 상태 샘플은 `000-sample.md` 참조

3. **작업 구현** (구현-테스트 사이클 필수)
   - **구현 → 테스트 설계 → 테스트 실행 → 검증** 사이클 준수
   - Playwright MCP 테스트 시나리오 작성 (정상/에러/엣지 케이스)
   - 모든 테스트 통과 확인 후 다음 단계 진행 (테스트 없이 진행 불가)
   - 각 구현-테스트 사이클 완료 후 중단하고 추가 지시 대기

4. **로드맵 업데이트**
   - 로드맵에서 완료된 작업을 ✅로 표시

---

## 개발 단계

### Phase 0: 프로젝트 부트스트랩 ✅ (완료: 2026-04, M0)

- **TASK-001: Next.js 16 + SQLite 환경 셋업** ✅ - 완료
  - ✅ Next.js 16.2.6 App Router 프로젝트 초기화 (Turbopack 기본)
  - ✅ Tailwind CSS v4 + shadcn/ui(radix-ui) 디자인 시스템 구성
  - ✅ better-sqlite3 메타DB 연결 및 WAL 모드 설정
  - ✅ Supabase PostgreSQL 클라이언트 연동 (인증·권한 테이블)
  - ✅ TypeScript strict mode 및 경로 별칭(`@/*`) 설정

---

### Phase 1-Legacy: 표준 CRUD 구현 ✅ (완료: 2026-05, M1)

- **TASK-002: 애플리케이션 골격 및 탭 라우팅** ✅ - 완료
  - ✅ `StandardsPage` 탭 UI 골격 구현 (`'use client'` + `useState`)
  - ✅ 표준단어/도메인/용어/권한 4탭 구조 구성
  - ✅ 공통 레이아웃 및 네비게이션

- **TASK-003: 표준단어 관리 (WordTab)** ✅ - 완료
  - ✅ STD_DIC CRUD — 영문약어·논리명·물리명·도메인 연결
  - ✅ 논리명/물리명 검색
  - ✅ 엔터티 분류(`ENT_CLSS_YN`) / 속성 분류(`ATTR_CLSS_YN`) 구분 설정
  - ✅ 관련: `components/standards/WordTab.tsx`, `app/api/std-dic/route.ts`

- **TASK-004: 표준도메인 관리 (DomainTab)** ✅ - 완료
  - ✅ STD_DOM CRUD — 도메인 유형·데이터타입(VARCHAR/NUMBER/DATE)·길이·소수점
  - ✅ 도메인명 기준 검색
  - ✅ 단어 등록 화면에서 도메인 연결 선택
  - ✅ 관련: `components/standards/DomainTab.tsx`, `app/api/std-dom/route.ts`

- **TASK-005: 표준용어 관리 (TermTab)** ✅ - 완료
  - ✅ DA_TERM CRUD — 단어 조합으로 용어 자동 생성
  - ✅ 논리명/물리명 검색
  - ✅ 복수 단어 순서 지정 조합 등록(`STORED_TERM_COMP_IDS`)
  - ✅ 물리명 풀네임(`DIC_PHY_FLL_NM`) 자동 생성
  - ✅ 관련: `components/standards/TermTab.tsx`

- **TASK-006: 중복 체크 API 및 이중 DB 연동** ✅ - 완료
  - ✅ 단어/도메인 등록 전 중복 여부 실시간 검증 (`/api/check-dup`)
  - ✅ SQLite(로컬 메타) + Supabase PostgreSQL(클라우드) 이중 운용

---

### Phase 2-Legacy: RBAC 시스템 ✅ (완료: 2026-05, M2)

- **TASK-007: RBAC 권한 관리 (AuthTab)** ✅ - 완료
  - ✅ 역할 5계층 정의 — ADMIN > MASTER > MANAGER > SUBMANAGER > USER
  - ✅ 역할-권한 매트릭스 시각화 (행=역할, 열=기능)
  - ✅ 사용자 역할 부여/변경
  - ✅ 그룹 생성·구성원 등록, SubManager 권한 위임
  - ✅ 관련: `components/auth/AuthTab.tsx`, `components/auth/RoleMatrix.tsx`

---

### Phase 3-Legacy: 보안 강화 ✅ (완료: 2026-05, M3)

- **TASK-008: 보안 취약점 수정** ✅ - 완료
  - ✅ SQL Injection 방어 — 허용목록(allowlist) 기반 필드 검증
  - ✅ API 인증·인가 취약점 수정 (CRITICAL x4, HIGH x1)
  - ✅ 인증 없는 API 접근 차단
  - ✅ OWASP Top 10 주요 취약점 검토 완료

---

## 🚀 v2 개발 계획

### Phase 0 (v2): 인증 시스템 구축 ✅ (완료: 2026-05-31, M4)

> **목표**: Supabase Auth 기반 회원가입·로그인·구글 소셜 로그인·관리자 Back Office 구축

- **TASK-017: 회원가입 (이메일/비밀번호)** ✅ - 완료
  - ✅ Supabase Auth `signUp()` 연동 회원가입 폼
  - ✅ 이메일 인증 메일 발송 및 확인 처리
  - ✅ 가입 완료 후 RBAC 기본 역할(USER) 자동 부여 (`user_info` 테이블)
  - ✅ 유효성 검증: 이메일 형식, 비밀번호 8자 이상
  - ✅ 관련: `app/(auth)/signup/page.tsx`, `components/auth/SignupForm.tsx`

- **TASK-018: 로그인 처리 (이메일/비밀번호)** ✅ - 완료
  - ✅ Supabase Auth `signInWithPassword()` 연동 로그인 폼
  - ✅ `@supabase/ssr` 기반 쿠키 세션 관리 (`proxy.ts` 세션 갱신)
  - ✅ 보호된 라우트 설정: 미인증 접근 시 `/login` 리다이렉트
  - ✅ 로그아웃 처리: `supabase.auth.signOut()`
  - ✅ 관련: `app/(auth)/login/page.tsx`, `components/auth/LoginForm.tsx`, `proxy.ts`

- **TASK-019: 구글 소셜 로그인 (Google OAuth)** ✅ - 코드 완료 (수동 설정 필요)
  - ✅ `signInWithOAuth({ provider: 'google' })` 연동 UI 구현
  - ✅ OAuth 콜백 라우트: `app/auth/callback/route.ts`
  - ✅ 최초 로그인 시 USER 역할 자동 부여
  - ⚙️ **수동 설정 필요**: Google Cloud Console OAuth 2.0 클라이언트 등록 + Supabase Provider 활성화

- **TASK-020: 관리자 Back Office 구축** ✅ - 완료
  - ✅ 관리자 전용 레이아웃 (`app/admin/(protected)/layout.tsx`)
  - ✅ Supabase `profiles.main_role` 기반 역할 접근 제어 (admin/master만 진입)
  - ✅ 관리자 대시보드: SQLite·Supabase 통계 카드
  - ✅ 표준관리시스템 관리자 화면 포함 (`/admin/standards`)
  - ✅ 사용자 역할 관리 — profiles 기반 5역할 그루핑 + 역할 변경
  - ✅ 그룹 관리 — 5개 시스템 그룹 코드화(G_SUPER~G_USER) + profiles 연동
  - ✅ 관련: `app/admin/`, `components/auth/UserRoleTab.tsx`, `components/auth/GroupTab.tsx`

---

### Phase 1 (v2): 핵심 기능 고도화 🔄 (진행 중, M5)

> **예상 기간**: 2026-06 ~ 2026-07
> **목표**: Audit Trail · DDL Export · 검색 고도화 · MVP 잔여 항목 완성

- **TASK-009: Audit Trail (변경 이력 추적)** ✅ - 완료 (2026-06-01)
  - ✅ `STD_AUDIT_LOG` 테이블 자동 생성 (`lib/audit.ts`)
  - ✅ `writeAudit()` — STD_DIC/STD_DOM 전 CRUD에 훅 삽입
  - ✅ `getChangedBy()` async 개선 — Bearer 토큰에서 실제 이메일 추출
  - ✅ 변경 이력 조회 API (`GET /api/audit`) — `requireAuth(['ADMIN','MASTER','MANAGER'])`
  - ✅ `AuditPanel.tsx` — 개별 항목 변경 이력 diff 뷰 (Bearer 토큰 포함 fetch)
  - ✅ `AuditLogViewer.tsx` — 관리자 전체 이력 뷰 (엔터티·행위 필터, 200건)
  - ✅ 관리자 라우트: `/admin/audit` + 네비게이션·대시보드 등록

- **TASK-010: DDL Export (DDL 스크립트 다운로드)** ✅ - 완료
  - ✅ 표준용어 선택 후 PostgreSQL/MySQL DDL 스크립트 생성
  - ✅ 용어 → 컬럼 매핑 로직 (`lib/ddl-generator.ts`)
  - ✅ DDL 생성 API (`POST /api/ddl/export`) — DBMS 방언 분기
  - ✅ DDL 미리보기 모달 + 클립보드 복사 + 파일 다운로드
  - ✅ 도메인 미연결 용어 422 검증
  - ✅ 관련: `components/standards/DdlExportDialog.tsx`, `app/api/ddl/export/route.ts`

- **TASK-011: 표준 검색 고도화** ✅ - 완료
  - ✅ 초성 검색 (한글 자모 분해, `lib/korean-utils.ts`)
  - ✅ 영문 약어 역방향 검색 (약어 → 논리명 매칭)
  - ✅ 통합 검색 API (`GET /api/search?q=&mode=`)
  - ✅ 글로벌 검색 UI — 헤더 드롭다운, 300ms 디바운싱, 탭 이동 연동
  - ✅ 관련: `components/standards/GlobalSearch.tsx`

- **TASK-012: MVP 잔여 항목 완성** ✅ - 완료
  - ✅ 단어 삭제 시 참조 용어 목록 경고 (409 차단)
  - ✅ 도메인별 표준단어 연결 현황 집계 (`GET /api/stats/domain-words`)
  - ✅ 용어 역추적 API — 단어 → 사용 용어 목록 (`GET /api/stats/word-terms/[id]`)

---

### Phase 2 (v2): 동기화·워크플로우·UX ✅ (완료: 2026-05-31, M6)

- **TASK-013: Supabase 동기화 배치** ✅ - 완료
  - ✅ SQLite STD_DIC / STD_DOM → Supabase `std_dic_sync` / `std_dom_sync` upsert
  - ✅ 50건 청크 단위 배치 처리 + 재시도 없이 오류 카운팅
  - ✅ 동기화 API: `POST /api/sync`, `GET /api/sync` (이력 조회)
  - ✅ `sync_log` 테이블로 동기화 이력 자동 기록
  - ✅ 관리자 동기화 페이지: `/admin/sync` (실행 버튼 + 이력 테이블)
  - ✅ 관련: `lib/sync.ts`, `app/api/sync/route.ts`, `app/admin/(protected)/sync/page.tsx`

- **TASK-014: 승인 워크플로우** ✅ - 완료
  - ✅ Supabase `approval_queue` 테이블 (PENDING→APPROVED/REJECTED 상태 모델)
  - ✅ 승인 요청 API: `POST /api/approval`
  - ✅ 승인/반려 API: `PUT /api/approval/[id]` (action: APPROVE/REJECT + 사유)
  - ✅ 관리자 승인 페이지: `/admin/approval` (상태 필터 + 결재 UI)
  - ✅ 관련: `app/api/approval/route.ts`, `app/api/approval/[id]/route.ts`, `app/admin/(protected)/approval/page.tsx`

- **TASK-015: 반응형 UI 최적화** ✅ - 완료
  - ✅ WordTab / DomainTab / TermTab 테이블: `overflow-x-auto` + `min-w-[680px]`
  - ✅ StandardsPage 탭 버튼: `px-3 sm:px-6`, `text-xs sm:text-sm`
  - ✅ 헤더 DB정보 텍스트: `hidden lg:block`
  - ✅ AuthTab 서브탭: `px-2 sm:px-4`, `text-[11px] sm:text-xs`

- **TASK-016: v2 통합 테스트** ✅ - 완료 (구조 완성)
  - ✅ `playwright.config.ts` — baseURL, 타임아웃, 스크린샷 설정
  - ✅ `tests/e2e/auth.spec.ts` — 인증 흐름 E2E (로그인/회원가입/리다이렉트)
  - ✅ `tests/e2e/standards.spec.ts` — 표준 CRUD E2E
  - ✅ `tests/e2e/admin.spec.ts` — 관리자 역할 접근 제어
  - ✅ `tests/e2e/search.spec.ts` — 초성/약어 검색

---

---

## 🚀 v3 개발 계획

### Phase 1 (v3): 기반 강화 ✅ (완료: 2026-06-01, M7)

> **목표**: 공통코드 관리 · Audit Trail · 개인 프로필 구현

- **TASK-021: 공통코드 관리 (DA §40 표준코드)** ✅ - 완료
  - ✅ SQLite `STD_CODE_GRP` / `STD_CODE` 테이블 생성 (DA 물리DB 표준: 시스템컬럼 4종 포함)
  - ✅ 서버 기동 시 자동 마이그레이션 + 초기 시드 데이터 7개 그룹 26개 코드값 (`lib/db.ts`)
  - ✅ 코드 그룹 CRUD API (`GET/POST/PUT /api/codes`)
  - ✅ 코드값 CRUD API + 논리 삭제 (`GET/POST/PUT/DELETE /api/codes/[grpId]`)
  - ✅ 공통코드 관리 UI (`components/admin/CodesPage.tsx`) — 좌측 그룹 목록 + 우측 코드값 테이블
  - ✅ 관리자 라우트: `/admin/codes`
  - ✅ 관리자 네비게이션 + 대시보드 빠른 이동 등록
  - 초기 코드 그룹: `ROLE_CD`, `DATA_TYPE_CD`, `DOM_TYPE_CD`, `DIC_GBN_CD`, `APV_STATUS_CD`, `AUDIT_ACT_CD`, `GRP_CD`

- **TASK-022: 개인 프로필 / 설정** ✅ - 완료 (2026-06-01)
  - ✅ 프로필 조회/수정 API (`GET/PATCH /api/profile`) — Bearer 토큰 기반 인증
  - ✅ 개인 프로필 페이지 (`/profile`) — 이름·사용자명·연락처·자기소개 수정
  - ✅ 비밀번호 변경 (`supabase.auth.updateUser`) — 클라이언트 사이드 처리
  - ✅ 역할 정보 읽기 전용 표시 (관리자만 변경 가능)
  - ✅ 헤더 개선: 이메일 → 이름+역할 표시 + 프로필 아바타 링크

- **TASK-023: Audit Trail 구현** ✅ - 완료 (TASK-009와 통합 완료)

---

### Phase 2 (v3): 통합게시판 ✅ (완료: 2026-06-01, M8)

> **목표**: 팀 내 커뮤니케이션·자료공유용 통합게시판 (공지/자료실/자유/Q&A)
> **DA 표준**: brd_ctgr·brd_post·brd_cmnt·brd_attch 4테이블 (시스템컬럼·여부컬럼·소문자 준수)

- **TASK-024: DB 스키마 + 기반 구조 + 빈 페이지 스캐폴딩** ✅ - 완료 (2026-06-01)
  - ✅ STD_DOM 5종 + STD_DIC 17종 메타DB 등록 (DA 워크플로우 5단계 완료)
  - ✅ Supabase 4테이블 마이그레이션 + mod_dts 트리거 + increment_vw_cnt RPC
  - ✅ 카테고리 시드 (NOTICE·ARCHIVE·FREE·QNA)
  - ✅ `lib/auth-guard.ts` — AuthResult에 user_id 추가
  - ✅ `lib/board.ts` 신규 — CATEGORY_NAME·BOARD_WRITE_ROLES·canWrite·isOwnerOrAdmin
  - ✅ `app/board/` 12개 파일 스캐폴딩 (layout·redirect·not-found·[category]·[id]·edit·new)
  - ✅ DA QA 감리 통과 (시스템컬럼·여부컬럼·소문자·트리거·RLS 전원 확인)
  - See: `/tasks/024-board-scaffold.md`

- **TASK-025: 게시판 전체 UI (더미 데이터)** ✅ - 완료 (2026-06-01)
  - ✅ `BoardList.tsx` — 목록 테이블, 📌 고정글, 답변상태 뱃지, 댓글수
  - ✅ `Pagination.tsx` — 페이지 이동 버튼
  - ✅ `PostDetail.tsx` — 본문(`pre whitespace-pre-wrap`), 첨부다운로드, 수정/삭제
  - ✅ `PostForm.tsx` — 등록/수정 모드 분기, 글자수, AttachmentUploader 포함
  - ✅ `CommentSection.tsx` — 댓글목록·작성폼·QNA 채택버튼
  - ✅ `AttachmentUploader.tsx` — 드래그앤드롭, 20MB/5개 제한
  - ✅ page.tsx 4종에 컴포넌트 연결 완료
  - See: `/tasks/025-board-ui.md`

- **TASK-026: 게시글 CRUD API** ✅ - 완료 (2026-06-01)
  - ✅ `GET /api/board/categories` — 카테고리 4건
  - ✅ `GET /api/board/[category]/posts` — 페이지네이션(`.range()`+`count:'exact'`), 검색
  - ✅ `POST /api/board/[category]/posts` — canWrite() 권한 검증, 403 차단
  - ✅ `GET /api/board/[category]/posts/[id]` — 조회수 RPC + is_owner 반환
  - ✅ `PUT /api/board/[category]/posts/[id]` — isOwnerOrAdmin() 소유권 검증
  - ✅ `DELETE /api/board/[category]/posts/[id]` — Storage 명시 삭제 + CASCADE
  - ✅ PostgREST Filter Injection 보안 패치 (`sanitizeSearch()`)
  - See: `/tasks/026-posts-api.md`

- **TASK-027: 댓글 + QNA 채택 API** ✅ - 완료 (2026-06-01)
  - ✅ `GET/POST /api/board/[category]/posts/[id]/comments` — cmnt_yn='Y' 게시판만 허용
  - ✅ `DELETE /api/board/[category]/posts/[id]/comments/[cmntId]` — 소유권 검증
  - ✅ `POST /api/board/[category]/posts/[id]/accept` — 순차 2쿼리 (CTE 가시성 이슈 해결)
  - ✅ 채택 권한: 글 작성자만 가능 (관리자 포함 불가 — 질문자 의도 존중)
  - See: `/tasks/027-comments-api.md`

- **TASK-028: 첨부파일 API** ✅ - 완료 (2026-06-01)
  - ✅ `GET /api/board/[category]/posts/[id]/attachments`
  - ✅ `POST /api/board/[category]/posts/[id]/attachments` — multipart FormData, 20MB/5개 서버 검증
  - ✅ `DELETE /api/board/[category]/posts/[id]/attachments/[attId]` — Storage 먼저 삭제 후 DB
  - ✅ `board-attachments` Storage 버킷 생성 (public, 20MB, 14개 MIME)
  - ✅ DB 실패 시 Storage 자동 롤백
  - See: `/tasks/028-attachments-api.md`

- **TASK-029: UI-API 연동** ✅ - 완료 (2026-06-01)
  - ✅ `BoardList` — Bearer fetch + 검색(sanitizeSearch) + 페이지네이션 + 스켈레톤 로딩
  - ✅ `PostDetail` — API `is_owner` 반환값으로 수정/삭제 버튼 제어
  - ✅ `PostForm` — POST·PUT + 첨부파일 순차 multipart 업로드, 수정 모드 초기값 API 로드
  - ✅ `CommentSection` — GET·POST·DELETE comments + POST accept 연동
  - ✅ 인증 우선순위 버그 수정: Bearer 토큰 > admin 쿠키 순서 변경 (`lib/auth-guard.ts`)
  - See: `/tasks/029-ui-api-connect.md`

- **TASK-030: 관리자 게시판 + 진입점** ✅ - 완료 (2026-06-01)
  - ✅ `components/admin/BoardAdmin.tsx` — 좌측 카테고리 + 우측 게시글 목록
  - ✅ 관리자 강제 삭제 + 📌 핀 토글 (선택적 필드 업데이트 — 본문 보존)
  - ✅ `app/admin/(protected)/board/page.tsx` + NAV_LINKS 추가
  - ✅ `StandardsPage` 헤더 게시판 링크 추가
  - ✅ PUT API 선택적 업데이트 (`'key' in body` 패턴)
  - See: `/tasks/030-board-admin.md`

- **TASK-031: 통합 테스트 (E2E)** ✅ - 완료 (2026-06-01)
  - ✅ `tests/e2e/board-flow.spec.ts` — 15건 (4 passed · 11 skipped/환경변수 대기)
  - ✅ Layer 1: 미인증 API 4건 즉시 실행 (401·307 확인)
  - ✅ Layer 2: MASTER CRUD·USER 권한 차단·Q&A 채택·관리자 강제 삭제 (환경변수 설정 시 활성화)
  - ✅ `playwright.config.ts` — port 3001 + `reuseExistingServer: true`
  - See: `/tasks/031-integration-test.md`

---

---

## 🚀 v4 개발 계획

### Phase 1 (v4): i18n 기반 구축 ⏳ (구현 대기, M9)

> **목표**: next-intl 설치 · 라우팅 재구성 · proxy.ts 인증+i18n 체이닝  
> **PRD**: `docs/PRD_MUL_LAN.md`  
> **지원 언어**: 11개 `ko · en · zh · ja · hi · vi · id · ms · en-ZA · fil · th`  
> **기본 locale**: `ko` (기존 URL `/notice`, `/admin` 무중단 유지)

- **TASK-032: 스킬 파일 생성** ✅ - 완료 (2026-06-02)
  - ✅ `.claude/skills/multi-lang/SKILL.md` — Claude 다국어 처리 가이드
  - ✅ `lang_cd/lang_map.json` — 11개국 country_cd↔locale 매핑
  - ✅ `lang_cd/supported_locales.json` — 지원 locale SSoT (런타임용)
  - 참조: `lang_cd/references/currency_countries.csv` (187개국 원본)

- **TASK-033: next-intl 설치 & 설정 파일** ✅ - 완료 (2026-06-02)
  - ✅ `npm install next-intl@^4.13.0` 설치
  - ✅ `lib/i18n/locales.ts` — LOCALES 상수, Locale 타입, DEFAULT_LOCALE
  - ✅ `i18n/routing.ts` — `defineRouting(11 locales, ko, as-needed prefix)`
  - ✅ `i18n/request.ts` — `getRequestConfig` (파일 기반, TASK-036 이후 DB 전환)
  - ✅ `i18n/navigation.ts` — `createNavigation` (locale-aware Link·useRouter·redirect)
  - ✅ `next.config.ts` — `createNextIntlPlugin('./i18n/request.ts')` 적용
  - ✅ `global.d.ts` — `AppConfig` 타입 등록 (번역 키 누락 컴파일 에러 유도)
  - ✅ `messages/ko.json` — 7개 섹션 초기 번역 키 (~45건)
  - ✅ `messages/{en,zh,ja,hi,vi,id,ms,en-ZA,fil,th}.json` — 10개 파일 생성 (ko 값 초기화)
  - ✅ `npm run build` 통과 — 오류·경고 없음

- **TASK-034: 디렉터리 이동 & 레이아웃 동적화** ⏳ - 대기
  - `app/*` → `app/[locale]/*` 이동 (`app/api/` 제외)
  - `app/[locale]/layout.tsx` 신규 — `<html lang={locale}>`, `generateStaticParams()` 11개
  - `lib/fonts.ts` 신규 — locale별 Noto Sans 서브셋 CSS 변수 스왑
    - ko→Noto_Sans_KR / zh→SC / ja→JP / th→Thai / hi→Devanagari / 나머지→latin
  - `globals.css` — `.font-kr`, `.font-jp`, `.font-sc` 등 유틸 추가
  - 루트 `app/layout.tsx` → 최소 passthrough (html 미포함)

- **TASK-035: proxy.ts 인증 + i18n 미들웨어 체이닝** ⏳ - 대기
  - `createMiddleware(routing)` — next-intl 미들웨어 인스턴스 생성
  - **`export async function proxy` named export 형태 유지** (Next 16 필수)
  - `stripLocale(pathname)` 헬퍼 — `/en/admin` → `/admin` 정규화
  - Supabase `setAll`이 intlMiddleware 응답 위에 쿠키 합성
  - 인증 리다이렉트 locale prefix 보존 (`/en/admin` → `/en/login`)
  - matcher: `api` 정규식 레벨 제외 병행

---

### Phase 2 (v4): 국가 DB + 번역 관리 ⏳ (구현 대기, M10)

> **목표**: 187개국 데이터 DB화 · 국가 선택 콤보박스 · 번역 관리 화면  
> **DA 표준**: `i18n_*` 4개 테이블 모두 v2 시스템 컬럼 (`regr_id→reg_dts→modr_id→mod_dts`)

- **TASK-036: Supabase i18n DB 마이그레이션** ⏳ - 대기
  - **DA 표준 v2** 시스템 컬럼 준수 (2026-05-30 총괄DA 승인 기준)
  - 마이그레이션 8개 순서:
    1. `create_i18n_lang_mst` — 언어 마스터 (11개) + 트리거
    2. `create_i18n_ns_mst` — 네임스페이스 마스터 (7개) + 트리거
    3. `create_i18n_msg` — 번역 메시지 + UNIQUE(ns_cd,msg_key,lang_cd) + 인덱스 + 트리거
    4. `create_i18n_cntry_mst` — 국가·통화 마스터 + FK(locale_cd→i18n_lang_mst) + 트리거
    5. `seed_i18n_lang_mst` — 11개 언어 초기 데이터
    6. `seed_i18n_ns_mst` — 7개 네임스페이스 초기 데이터
    7. `seed_i18n_cntry_mst` — CSV 187개국 (이모지 오염 행 전처리 필터 포함)
    8. `seed_i18n_msg_ko` — `messages/ko.json` → DB 초기 로드 (~50건)
  - DA 감리: 시스템 컬럼 순서·NOT NULL·DEFAULT·트리거 동작 확인
  - RLS: SELECT(USER+) / INSERT·UPDATE·DELETE(ADMIN·MASTER만)

- **TASK-037: 번역 파일 & 한글 키 치환** ⏳ - 대기
  - `messages/ko.json` 작성 (기존 751건 한글에서 7개 섹션으로 추출)
    - `common · auth · board · admin · profile · validation · languageSwitcher`
  - 나머지 10개 `messages/{locale}.json` 생성 (초기엔 ko 값 복사, 이후 번역)
  - `next/link` → `@/i18n/navigation` Link 치환 (14곳)
  - `lib/board.ts` `CATEGORY_NAME` → `t('board.categories.NOTICE')` 전환
  - 핵심 화면 우선 치환: board layout → auth → admin
  - 빌드 타입 검증 (키 누락 컴파일 에러 확인)

- **TASK-038: 국가 선택 콤보박스** ⏳ - 대기
  - `components/i18n/CountrySelector.tsx` — 공통 클라이언트 컴포넌트
  - `lib/i18n/countryToFlag.ts` — `countryToFlag('KR')` → `🇰🇷` 유틸
  - 표시: `🇰🇷 대한민국 KRW ▼` / 드롭다운: 국기+자국어명+통화코드
  - 정렬: dis_ord_seq 1~11 우선 + 구분선 + 나머지 176개국
  - 국가 선택 → locale 전환 (`NEXT_LOCALE` 쿠키 갱신) / 11개 외 → en fallback
  - 삽입: Board 헤더 `BoardUserMenu` 앞 + Admin 헤더 `AdminLogoutButton` 앞
  - `GET /api/i18n/countries` API — `i18n_cntry_mst` 조회, 5분 캐싱

- **TASK-039: 다국어 관리 화면** ⏳ - 대기
  - Admin 네비게이션에 `🌐 다국어관리` 메뉴 추가
  - `app/[locale]/admin/(protected)/i18n/` 라우트 5개:
    - `page.tsx` — 대시보드 (언어별 번역 완료율 % 프로그레스바, 미번역 키 목록)
    - `languages/page.tsx` — `i18n_lang_mst` CRUD + use_yn 토글
    - `countries/page.tsx` — `i18n_cntry_mst` 조회 187개국 + use_yn 토글
    - `messages/page.tsx` — 번역 매트릭스 뷰 (키×언어 인라인 편집, 미번역 ❌ 하이라이트)
    - `sync/page.tsx` — DB→JSON 동기화 실행 + 결과 로그
  - API 8개: `langs` · `countries` · `namespaces` · `messages` · `messages/bulk` · `stats` · `sync`
  - 메시지 수정 → `revalidateTag('i18n')` 자동 캐시 무효화
  - `LanguageSwitcher` 컴포넌트 헤더 연동
  - `generateMetadata` locale화 (login 등 static metadata 전환)
  - Phase 2 환율: `exchangerate-api.com` 연동 (통화코드 → 실시간 환율)

---

## 향후 계획 (Out of Scope — v5+)

- 외부 ERD 도구 연동 (DBeaver, DataGrip)
- 모바일 반응형 완전 최적화
- 양방향 DB 동기화 (Supabase → SQLite)

---

## 마일스톤 요약

| 마일스톤 | Phase | 완료/예상일 | 주요 산출물 | 상태 |
|---------|-------|-----------|-----------|------|
| M0: 프로젝트 부트스트랩 | Phase 0 | 2026-04 | Next.js 16 + SQLite 셋업 | ✅ 완료 |
| M1: 표준 CRUD 구현 | Phase 1-Legacy | 2026-05 | 표준단어/도메인/용어 3탭 | ✅ 완료 |
| M2: RBAC 시스템 | Phase 2-Legacy | 2026-05 | 역할-권한 매트릭스 | ✅ 완료 |
| M3: 보안 강화 | Phase 3-Legacy | 2026-05 | SQL Injection·인증 취약점 수정 | ✅ 완료 |
| M4: 인증 시스템 + 관리자 | Phase 0 (v2) | 2026-05-31 | 회원가입·로그인·Google OAuth·Back Office | ✅ 완료 |
| M5: 핵심 기능 고도화 | Phase 1 (v2) | 2026-05-31 | DDL Export·검색·MVP잔여·Audit Trail | ✅ 완료 |
| M6: 동기화·승인·반응형 | Phase 2 (v2) | 2026-05-31 | Supabase 동기화·승인 워크플로우·E2E | ✅ 완료 |
| M7: v3 기반 강화 | Phase 1 (v3) | 2026-06-01 | 공통코드·프로필·Audit Trail 통합 | ✅ 완료 |
| M8: 통합게시판 | Phase 2 (v3) | 2026-06-01 | 게시판 8종 CRUD·댓글·첨부·관리자·E2E | ✅ 완료 |
| M9: i18n 기반 구축 | Phase 1 (v4) | 2026-07 예상 | next-intl·라우팅·레이아웃·proxy 체이닝 (TASK-032~035) | ⏳ 대기 |
| M10: 국가DB·번역관리 | Phase 2 (v4) | 2026-07 예상 | 187개국 DB화·콤보박스·번역 관리 화면 (TASK-036~039) | ⏳ 대기 |

---

## 성공 지표 목표

| 지표 | 현재 (2026-06-01) | 목표 | 측정 방법 |
|------|-----------------|------|---------|
| 등록 표준단어 수 | 53건 (+17 게시판용) | 100건 | STD_DIC 레코드 수 |
| 등록 표준도메인 수 | 17건 (+5 게시판용) | 30건 | STD_DOM 레코드 수 |
| 등록 표준용어 수 | 0건 (DA_TERM 비어있음) | 200건 | DA_TERM 레코드 수 |
| 보안 취약점 | 0건 | 0건 유지 | 코드 리뷰 (PostgREST 인젝션 패치 포함) |
| Playwright 테스트 | 15건 (4 passed · 11 skip) | 환경변수 설정 후 15 passed | `npx playwright test` |
| 게시판 API 라우트 | 11개 | — | app/api/board 라우트 수 |
| 지원 언어 수 | 0개 (미구현) | 11개 (ko·en·zh·ja·hi·vi·id·ms·en-ZA·fil·th) | i18n_lang_mst use_yn='Y' 수 |
| 번역 키 수 | 0건 (미구현) | ~50건 (ko 기준) | i18n_msg DISTINCT(ns_cd,msg_key) 수 |
| 국가·통화 DB | 0건 (CSV) | 187개국 | i18n_cntry_mst 레코드 수 |

---

## 수동 설정 필요 항목

| 항목 | 내용 | 우선순위 |
|------|------|---------|
| **Google OAuth** | Google Cloud Console → OAuth 2.0 클라이언트 등록 → Supabase Authentication → Google Provider 활성화 | 높음 |
| **이메일 템플릿** | Supabase Dashboard → Authentication → Email Templates → 한국어 커스터마이징 | 중간 |
| **E2E 테스트 환경변수** | `.env.test` — `TEST_MASTER_EMAIL`, `TEST_MASTER_PW`, `TEST_USER_EMAIL`, `TEST_USER_PW` 설정 → Layer 2 E2E 활성화 | 중간 |
| **환율 API 키** (v4 Phase 2) | `exchangerate-api.com` 또는 `open.er-api.com` 무료 API 키 발급 → `.env.local`에 `EXCHANGE_RATE_API_KEY` 등록 | 낮음 |

---

## 변경 이력

| 버전 | 날짜 | 변경 내용 | 작성자 |
|------|------|---------|-------|
| v1.0 | 2026-05-31 | PRD 기반 ROADMAP 초안 생성 (MVP 완료 반영, v2 Phase 1~2 수립) | anakin |
| v1.1 | 2026-05-31 | v2 Phase 0 추가 — 회원가입·로그인·구글 OAuth (TASK-017~019) | anakin |
| v2.0 | 2026-05-31 | v2 Phase 0 완료 반영 — TASK-017~020 완료, TASK-010~012 완료, M4 완료 표시 | anakin |
| v3.0 | 2026-06-01 | v3 Phase 2 완료 반영 — 통합게시판 TASK-024~031 전체 완료, M7·M8 추가, 성공 지표 업데이트 | anakin |
| v4.0 | 2026-06-02 | v4 다국어 시스템 계획 수립 — PRD_MUL_LAN.md 작성, TASK-032~039 추가, M9·M10 마일스톤 등록, i18n 스킬파일(TASK-032) 완료 | anakin |
