# PRD: 스키마 프로그램

> **버전**: v1.2  
> **작성일**: 2026-05-31  
> **작성자**: anakin  
> **상태**: v4 전체 완료 (다국어·보안 강화·E2E 검증) / 신규 작업 대기

---

## 1. 개요 (Executive Summary)

| 항목 | 내용 |
|------|------|
| 제품명 | 스키마 프로그램 (DA Standard Data Management) |
| 핵심 가치 | 쇼핑몰 DB 물리설계 표준을 단일 UI에서 관리하고 RBAC로 접근을 제어 |
| 타겟 사용자 | DA(Data Architect) 담당자, 쇼핑몰 데이터 관리 팀 |
| MVP 목표 기간 | 완료 (2026-05 기준 1차 MVP 배포) |
| 현재 단계 | v4 전체 완료 — 다국어 14개 언어·E2E 77개 통과·보안 강화 v2 완료 (Critical/High 0건). 신규 작업 대기 |

**엘리베이터 피치**  
표준이 없던 쇼핑몰 데이터베이스에 DA 표준 단어·도메인·용어 체계를 구축하고, RBAC 권한 모델로 팀 내 역할별 접근을 제어하는 내부 관리 도구입니다. 로컬 SQLite 메타DB와 Supabase PostgreSQL을 이중으로 운용해 오프라인에서도 표준 편집이 가능합니다.

---

## 2. 문제 정의 (Problem Statement)

### 현재 상황 (As-Is)

- 쇼핑몰 DB 컬럼명이 팀원마다 제각각 — 동일 개념에 `user_id`, `usr_id`, `userId` 혼용
- DA 표준 사전이 엑셀 파일로 분산 관리되어 최신 버전 파악 어려움
- 새 테이블 설계 시 기존 표준 확인 수단 없어 중복 정의 발생
- 권한 관리 부재로 누구나 표준을 수정·삭제 가능 → 의도치 않은 표준 훼손

### 해결 후 모습 (To-Be)

- 표준단어(STD_DIC) · 도메인(STD_DOM) · 용어(DA_TERM)를 단일 UI에서 조회·등록·수정
- RBAC 5계층(ADMIN > MASTER > MANAGER > SUBMANAGER > USER)으로 역할별 편집 권한 제어
- 중복 단어 실시간 체크 API로 표준 오염 방지
- Supabase PostgreSQL 연동으로 팀 전체가 동일 표준 공유

### 왜 지금인가?

신규 쇼핑몰 피처 개발 전 DA 표준 체계 확립이 선행 조건이며, 이미 40개 표준단어·22개 도메인·51개 용어가 등록되어 실 운용 중입니다.

---

## 3. 타겟 사용자 (Target Users)

### 핵심 페르소나

**DA 리드 (Data Architect Lead)**
- 직업/역할: 데이터 표준 체계 설계 및 승인
- 주요 목표: 팀 전체가 일관된 물리명 규칙을 따르게 만들기
- 겪는 불편함: 표준 정의·배포·관리가 엑셀 + 구두 전달로 이루어져 버전 관리 불가
- 기술 수준: 고급 (SQL 능숙, DB 설계 경험 5년+)
- 권한: ADMIN / MASTER

**개발 팀원 (Developer / DBA)**
- 직업/역할: 쇼핑몰 기능 개발 및 DB 스키마 설계
- 주요 목표: 새 컬럼 추가 시 표준 단어·용어 빠르게 검색
- 겪는 불편함: 표준이 어디 있는지 몰라 임의로 명명
- 기술 수준: 중급
- 권한: USER / MANAGER

---

## 4. MVP 범위 (Scope)

### In Scope — 구현 완료된 기능

| 우선순위 | 기능 | 설명 | 상태 |
|---------|------|------|------|
| P0 | 표준단어 관리 | STD_DIC CRUD, 영문약어·논리명·물리명·도메인 연결 | ✅ 완료 |
| P0 | 표준도메인 관리 | STD_DOM CRUD, 도메인 유형·데이터타입·길이 관리 | ✅ 완료 |
| P0 | 표준용어 관리 | DA_TERM CRUD, 단어 조합으로 용어 자동 생성 | ✅ 완료 |
| P0 | RBAC 권한 관리 | 역할-권한 매트릭스, 사용자 역할 부여, 그룹 관리 | ✅ 완료 |
| P1 | 중복 체크 API | 단어/도메인 등록 전 중복 여부 실시간 검증 | ✅ 완료 |
| P1 | 이중 DB 연동 | SQLite(로컬 메타) + Supabase PostgreSQL(클라우드) | ✅ 완료 |

### Out of Scope — 이번 MVP에서 제외

- [ ] 표준 변경 이력 추적 (Audit Trail) — v2 예정
- [ ] DDL 자동 생성 (표준용어 → CREATE TABLE 스크립트) — v2 예정
- [ ] 표준 승인 워크플로우 (MASTER 결재) — v2 예정
- [ ] 외부 ERD 도구 연동 (DBeaver, DataGrip) — v3 예정
- [ ] 다국어 지원 (영문 UI) — 미정
- [ ] 모바일 반응형 최적화 — v2 일부 포함

---

## 5. 기능 요구사항 (Functional Requirements)

### FR-01: 표준단어 관리 (WordTab)

**사용자 스토리**  
> DA 리드로서, DB 컬럼 물리명 설계 표준을 유지하기 위해, 논리명·물리명·약어가 포함된 표준단어를 등록·수정·삭제하고 싶다.

**수용 기준 (Acceptance Criteria)**
- [x] AC1: 단어 목록을 논리명/물리명으로 검색할 수 있다
- [x] AC2: 새 단어 등록 시 물리명 중복 여부를 사전 체크한다 (`/api/check-dup`)
- [x] AC3: 단어에 도메인(STD_DOM)을 연결할 수 있다
- [x] AC4: 엔터티 분류(`ENT_CLSS_YN`) / 속성 분류(`ATTR_CLSS_YN`) 구분 설정 가능
- [ ] AC5: 단어 삭제 시 해당 단어를 사용하는 용어 목록을 경고로 표시 (미구현)

**관련 컴포넌트**: [components/standards/WordTab.tsx](components/standards/WordTab.tsx), [app/api/std-dic/route.ts](app/api/std-dic/route.ts)

---

### FR-02: 표준도메인 관리 (DomainTab)

**사용자 스토리**  
> DA 담당자로서, 컬럼 데이터 유형을 표준화하기 위해, 도메인별 데이터타입·길이·소수점 자리를 관리하고 싶다.

**수용 기준 (Acceptance Criteria)**
- [x] AC1: 도메인명·물리명·데이터타입(VARCHAR/NUMBER/DATE 등)·길이 등록
- [x] AC2: 도메인 목록을 이름 기준으로 검색
- [x] AC3: 단어 등록 화면에서 도메인 연결 선택 가능
- [ ] AC4: 도메인별 표준단어 연결 현황 집계 (미구현)

**관련 컴포넌트**: [components/standards/DomainTab.tsx](components/standards/DomainTab.tsx), [app/api/std-dom/route.ts](app/api/std-dom/route.ts)

---

### FR-03: 표준용어 관리 (TermTab)

**사용자 스토리**  
> 개발자로서, 새 테이블 컬럼명을 정할 때 표준 용어를 검색하고, 없으면 단어 조합으로 신규 용어를 생성하고 싶다.

**수용 기준 (Acceptance Criteria)**
- [x] AC1: 용어 논리명/물리명으로 검색
- [x] AC2: 복수의 표준단어를 순서 지정하여 조합 등록 (`STORED_TERM_COMP_IDS`)
- [x] AC3: 조합된 단어 목록에서 물리명 풀네임(`DIC_PHY_FLL_NM`) 자동 생성
- [ ] AC4: 용어 사용 위치(테이블명·컬럼명) 역추적 (미구현)

**관련 컴포넌트**: [components/standards/TermTab.tsx](components/standards/TermTab.tsx)

---

### FR-04: RBAC 권한 관리 (AuthTab)

**사용자 스토리**  
> ADMIN으로서, 팀원별로 표준 데이터 편집 권한을 세분화하여 부여하고, 그룹 단위로 권한을 일괄 관리하고 싶다.

**수용 기준 (Acceptance Criteria)**
- [x] AC1: 역할 5계층 정의 — ADMIN > MASTER > MANAGER > SUBMANAGER > USER
- [x] AC2: 역할별 기능별 권한을 매트릭스(행=역할, 열=기능)로 시각화
- [x] AC3: 사용자에게 역할 부여/변경 가능
- [x] AC4: 그룹 생성 및 구성원 등록, SubManager 권한 위임
- [ ] AC5: 인증 없는 API 접근 차단 — `/api/check-dup`, `/api/search`, `/api/ddl/export` 미적용 (SEC-003 조치 필요)

**관련 컴포넌트**: [components/auth/AuthTab.tsx](components/auth/AuthTab.tsx), [components/auth/RoleMatrix.tsx](components/auth/RoleMatrix.tsx)

---

## 6. 기술 스택 (Tech Stack)

> 코드베이스 분석 결과 기반

| 레이어 | 기술 | 버전 | 비고 |
|--------|------|------|------|
| Framework | Next.js (App Router) | 16.2.6 | Turbopack 기본 번들러 |
| Runtime | React | 19.2.4 | Server/Client Component 혼용 |
| Language | TypeScript | 5.x | strict mode |
| Styling | Tailwind CSS | v4 | `@import "tailwindcss"` 구문 |
| UI Components | shadcn/ui (radix-ui) | 1.4.3 | new-york style |
| 로컬 DB | better-sqlite3 | 12.10.0 | 메타DB (DA#5 SQLiteDB_for_META_v5) |
| 클라우드 DB | Supabase PostgreSQL | 2.106.2 | 권한 관리 테이블 (`role_mst` 등) |
| Deploy | — | — | 미설정 (로컬 운용 중) |

### 핵심 아키텍처 결정사항 (ADR)

- **이중 DB 운용**: SQLite(로컬)은 표준 메타데이터 편집용, Supabase는 인증/권한 테이블 관리용으로 역할 분리. 오프라인 표준 편집이 가능한 대신 동기화 전략 필요.
- **API Routes (not Server Actions)**: 표준 CRUD는 Next.js API Routes로 구현. 향후 외부 CLI 도구에서도 호출 가능하도록 REST 인터페이스 유지.
- **Client Component 방식**: 탭 UI(`StandardsPage`)는 `'use client'` + `useState`로 구현. 데이터 페칭은 각 탭 컴포넌트에서 `fetch` 직접 호출.

---

## 7. 비기능 요구사항 (Non-Functional Requirements)

| 카테고리 | 요구사항 | 측정 기준 | 현재 상태 |
|---------|---------|---------|---------|
| 보안 | SQL Injection 방어 (SEC-009) | better-sqlite3 파라미터 바인딩 적용 | ✅ 양호 |
| 보안 | API 인증·접근 통제 (SEC-003) | 전체 엔드포인트 `requireAuth` 적용 | 🔴 미흡 (3개 미적용) |
| 보안 | 관리자 인증 강화 (SEC-001/005) | 브루트포스 방어, 기본 패스워드 교체 | 🔴 Critical — 즉시 조치 |
| 보안 | 보안 HTTP 헤더 (SEC-006) | CSP·X-Frame-Options·HSTS 등 6종 | 🔴 High — 미설정 |
| 보안 | 중요 정보 보호 (SEC-012/013) | Service Role Key 서버 전용 격리 | 🔴 High — 미적용 |
| 보안 | Rate Limiting (SEC-016) | IP 기반 요청 제한 | 🔴 High — 미적용 |
| 보안 | 쿠키 보안 속성 (SEC-002) | Admin 쿠키 `SameSite: strict` | ⚠️ Medium |
| 보안 | 파일 업로드 검증 (SEC-010) | Magic Byte 서버 검증 추가 | ⚠️ Medium |
| 보안 | 오류 메시지 일반화 (SEC-018) | 내부 DB 구조 클라이언트 노출 방지 | ⚠️ Medium |
| 보안 | OWASP Top 10 준수 | `docs/PRD_SECURITY.md` 25개 항목 기준 | ⚠️ 조치 진행 중 |
| 성능 | 표준 목록 조회 | 1,000건 기준 1초 이내 응답 | 미측정 |
| 안정성 | SQLite WAL 모드 | 동시 읽기/쓰기 충돌 방지 | ✅ 설정 완료 |
| 접근성 | 내부 도구 | 웹 브라우저 접근 (Chrome/Edge 최신) | — |

---

## 8. 사용자 흐름 (User Flow)

### 핵심 플로우: 신규 표준단어 등록

```
[표준단어 탭 진입]
    → [검색창에 후보 단어 입력] → [기존 유사 단어 확인]
    → [없으면 '새 단어 등록' 클릭]
    → [논리명 / 물리명 / 약어 / 도메인 입력]
    → [중복 체크 API 호출] (/api/check-dup)
        ├─ 중복 없음 → [저장] → [목록 갱신]
        └─ 중복 있음 → [경고 표시] → [수정 후 재시도]
```

### 핵심 플로우: 사용자 역할 부여 (ADMIN)

```
[권한 관리 탭] → [사용자 역할 관리 서브탭]
    → [사용자 검색] → [역할 드롭다운 변경]
    → [저장] → Supabase user_role 업데이트
```

---

## 9. 성공 지표 (Success Metrics)

### 정량 지표 (현재 상태 기준)

| 지표 | 현재 (2026-05) | MVP 목표 | 측정 방법 |
|------|-------------|---------|---------|
| 등록 표준단어 수 | 40건 | 100건 | STD_DIC 레코드 수 |
| 등록 표준도메인 수 | 22건 | 30건 | STD_DOM 레코드 수 |
| 등록 표준용어 수 | 51건 | 200건 | DA_TERM 레코드 수 |
| 보안 취약점 (Critical/High) | ✅ 0건 (M-S1·M-S2 완료) | 0건 유지 | `docs/PRD_SECURITY.md` 체크리스트 |
| 관리 역할 수 | 5계층 | 5계층 유지 | role_mst 레코드 수 |

### 정성 지표

- [ ] 팀 내 표준 단어 임의 생성 사례 0건
- [ ] DA 팀 주간 미팅에서 표준 사전 도구로 활용
- [ ] 신규 테이블 설계 시 이 도구에서 용어 검색 후 컬럼명 결정

---

## 10. 마일스톤 (Milestones)

| 마일스톤 | 완료일 | 주요 산출물 | 상태 |
|---------|-------|-----------|------|
| M0: 프로젝트 부트스트랩 | 2026-04 | Next.js 16 + SQLite 셋업 | ✅ 완료 |
| M1: 표준 CRUD 구현 | 2026-05 | 표준단어/도메인/용어 관리 3탭 | ✅ 완료 |
| M2: RBAC 시스템 | 2026-05 | 역할-권한 매트릭스, 사용자·그룹 관리 | ✅ 완료 |
| M3: 보안 1차 강화 | 2026-05 | SQL Injection · 필드 검증 취약점 수정 | ✅ 완료 |
| M-S1: 보안 Critical 조치 | 즉시 | 관리자 브루트포스 방어, 기본 패스워드 교체 (SEC-001/005) | 🔴 조치 필요 |
| M-S2: 보안 High 조치 | 2026-06-06 (72시간) | API 인증 보완·보안 헤더·Rate Limiting (SEC-003/006/012/016) | 🔴 조치 필요 |
| M-S3: 보안 Medium 조치 | 2026-07-03 (30일) | 쿠키·파일 검증·오류 처리 등 13건 (docs/PRD_SECURITY.md 참조) | ⏳ 예정 |
| M4: 변경 이력 추적 | 미정 | Audit Trail (등록/수정/삭제 로그) | ⏳ v2 예정 |
| M5: DDL 자동 생성 | 미정 | 표준용어 → CREATE TABLE 스크립트 | ⏳ v2 예정 |
| M6: 승인 워크플로우 | 미정 | MASTER 결재 후 표준 확정 | ⏳ v2 예정 |

---

## 11. 위험 요소 (Risks)

| 위험 | 가능성 | 영향 | 대응 방안 |
|------|--------|------|---------|
| SQLite 동시 접근 충돌 | 중간 | 높음 | WAL 모드 설정 완료, 단일 사용자 운용 권장 |
| Supabase 연결 장애 | 낮음 | 높음 | 권한 관리 기능만 영향, 표준 CRUD는 SQLite로 독립 동작 |
| 로컬↔클라우드 DB 불일치 | 높음 | 중간 | v2에서 동기화 배치 또는 이벤트 기반 동기화 구현 필요 |
| 브라우저 탭 동시 편집 충돌 | 낮음 | 중간 | 현재 Optimistic UI 없음 — 저장 전 최신 데이터 재조회 |
| Next.js 16 breaking change 영향 | 낮음 | 높음 | async params/cookies 패턴 준수, CLAUDE.md 가이드 존재 |
| 보안 취약점 미조치 (관리자 탈취) | 높음 | 심각 | PRD_SECURITY.md Critical 2건 즉시 조치, M-S1/S2 마일스톤 추적 |
| 환경변수 기본값 운영 배포 | 중간 | 심각 | CI/CD 배포 전 기본 패스워드 감지 스크립트 적용 (SEC-005) |

---

## 12. v2 로드맵 (Next Steps)

### 우선순위 High

1. **Audit Trail** — 표준 변경 시 `변경자 / 변경일시 / 변경 전후 값` 자동 기록
2. **DDL Export** — 표준용어 선택 후 PostgreSQL/MySQL DDL 스크립트 다운로드
3. **표준 검색 고도화** — 초성 검색, 영문 약어 역방향 검색

### 우선순위 Medium

4. **Supabase 동기화** — 로컬 SQLite → Supabase PostgreSQL 단방향 동기화
5. **승인 워크플로우** — MASTER가 신규 표준 등록을 승인하는 2단계 프로세스
6. **반응형 UI** — 1280px 이하 테이블 수평 스크롤 최적화

---

## 13. 보안 요구사항 (Security Requirements)

> 세부 점검 항목 전체: `docs/PRD_SECURITY.md` 참조  
> 점검 기준: 주요정보통신기반시설 기술적 취약점 분석·평가 방법 상세가이드 + OWASP Top 10 2021

### 13.1 점검 현황 요약

| 등급 | 건수 | 조치 기한 | 상태 |
|------|------|----------|------|
| Critical | 2건 | 즉시 | 🔴 미조치 |
| High | 4건 | 72시간 이내 | 🔴 미조치 |
| Medium | 13건 | 30일 이내 | ⚠️ 계획 수립 |
| Low | 4건 | 90일 이내 | ⏳ 예정 |
| Info | 2건 | 권고 | — |

### 13.2 Critical / High 즉시 조치 항목

| ID | 등급 | 항목 | 대상 파일 | 예상 공수 |
|----|------|------|----------|---------|
| SEC-001 | Critical | 관리자 로그인 브루트포스 방어 부재 | `app/api/admin/login/route.ts` | 4시간 |
| SEC-005 | Critical | 기본 패스워드 `admin1234` 운영 사용 | `.env.local` | 1시간 |
| SEC-003 | High | 인증 없는 API 3개 (`/check-dup`, `/search`, `/ddl/export`) | `app/api/` 3개 파일 | 2시간 |
| SEC-006 | High | 보안 HTTP 헤더 전무 (CSP·X-Frame-Options 등 6종) | `next.config.ts` | 3시간 |
| SEC-012 | High | Supabase Service Role Key 클라이언트 노출 위험 | `lib/supabase.ts` | 1시간 |
| SEC-016 | High | 전체 API Rate Limiting 미적용 | `proxy.ts` | 4시간 |

### 13.3 컴플라이언스 매핑 요약

| 주요정보통신기반시설 가이드 항목 | 대응 SEC-ID | 상태 |
|-------------------------------|------------|------|
| WA-01: 취약한 인증 메커니즘 | SEC-001, SEC-005 | 🔴 미흡 |
| WA-02: 취약한 접근 통제 | SEC-003, SEC-004 | 🔴 미흡 |
| WA-05: SQL 인젝션 | SEC-009 | ✅ 양호 |
| WA-08: 파일 업로드 취약점 | SEC-010, SEC-011 | ⚠️ 미흡 |
| WA-11: 중요 정보 노출 | SEC-012, SEC-013 | ⚠️ 미흡 |
| WA-14: 불필요한 정보 노출 | SEC-006, SEC-018 | 🔴 미흡 |
| WA-18: DoS 방지 | SEC-016, SEC-017 | 🔴 미흡 |
| SS-01: 기본 계정·패스워드 | SEC-005 | 🔴 취약 |

### 13.4 보안 조치 체크리스트 (Critical / High)

- [ ] SEC-001: 관리자 로그인 실패 5회 시 IP 잠금 구현
- [ ] SEC-005: `.env.local`의 `ADMIN_PASSWORD`, `ADMIN_SECRET_KEY` 강력한 값으로 교체
- [ ] SEC-003: `/api/check-dup`, `/api/search`, `/api/ddl/export`에 `requireAuth` 추가
- [ ] SEC-006: `next.config.ts`에 보안 헤더 (CSP, X-Frame-Options 등) 설정
- [ ] SEC-012: `lib/supabase.ts`에 `import 'server-only'` 추가
- [ ] SEC-016: Rate Limiting 구현 (최소 `/api/admin/login`에 우선 적용)

---

## 14. 변경 이력 (Changelog)

| 버전 | 날짜 | 변경 내용 | 작성자 |
|------|------|---------|-------|
| v1.0 | 2026-05-31 | MVP PRD 초안 작성 (코드베이스 역분석 기반) | anakin |
| v1.1 | 2026-06-03 | 보안 취약점 점검 결과 반영 — NFR·마일스톤·위험 업데이트, 섹션 13 보안 요구사항 신규 추가 | anakin |
| v1.2 | 2026-06-03 | v4 완료 반영 — 다국어 E2E 77개 통과·보안 강화 v2 전체 완료·번역 버그픽스, 현재 단계·버전 업데이트 | anakin |
