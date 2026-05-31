# 표준데이터 관리 프로그램 개발 로드맵

쇼핑몰 DB 물리설계 표준을 단일 UI에서 관리하고 RBAC로 접근을 제어하는 DA 내부 관리 도구

> **기준일**: 2026-05-31 (최종 업데이트: 2026-05-31)
> **현재 버전**: v2 Phase 0 완료 → Phase 1 진행 중
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

- **TASK-009: Audit Trail (변경 이력 추적)** ⏳ - **다음 작업**
  - 표준 변경 시 `변경자 / 변경일시 / 변경 전후 값` 자동 기록
  - audit 로그 테이블 스키마 설계 (SQLite: `STD_AUDIT_LOG`)
  - STD_DIC / STD_DOM CRUD API에 이력 기록 훅 삽입
  - 변경 이력 조회 API (`GET /api/audit?entity=&id=`) 구현
  - 이력 조회 UI (변경 전후 diff 표시)
  - See: `/tasks/009-audit-trail.md`

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

## 향후 계획 (Out of Scope — v3+)

- 외부 ERD 도구 연동 (DBeaver, DataGrip)
- 다국어 지원 (영문 UI)
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

---

## 성공 지표 목표

| 지표 | 현재 (2026-05-31) | v2 목표 | 측정 방법 |
|------|-----------------|--------|---------|
| 등록 표준단어 수 | 40건 | 100건 | STD_DIC 레코드 수 |
| 등록 표준도메인 수 | 22건 | 30건 | STD_DOM 레코드 수 |
| 등록 표준용어 수 | 51건 | 200건 | DA_TERM 레코드 수 |
| 보안 취약점 | 0건 | 0건 유지 | 코드 리뷰 |
| 표준 목록 조회 응답 | 미측정 | 1,000건 기준 1초 이내 | 성능 테스트 |
| API/비즈니스 로직 테스트 커버리지 | — | 80% 이상 | Playwright MCP |

---

## 수동 설정 필요 항목

| 항목 | 내용 | 우선순위 |
|------|------|---------|
| **Google OAuth** | Google Cloud Console → OAuth 2.0 클라이언트 등록 → Supabase Authentication → Google Provider 활성화 | 높음 |
| **이메일 템플릿** | Supabase Dashboard → Authentication → Email Templates → 한국어 커스터마이징 | 중간 |

---

## 변경 이력

| 버전 | 날짜 | 변경 내용 | 작성자 |
|------|------|---------|-------|
| v1.0 | 2026-05-31 | PRD 기반 ROADMAP 초안 생성 (MVP 완료 반영, v2 Phase 1~2 수립) | anakin |
| v1.1 | 2026-05-31 | v2 Phase 0 추가 — 회원가입·로그인·구글 OAuth (TASK-017~019) | anakin |
| v2.0 | 2026-05-31 | v2 Phase 0 완료 반영 — TASK-017~020 완료, TASK-010~012 완료, M4 완료 표시 | anakin |
