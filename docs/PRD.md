# PRD: 표준데이터 관리 프로그램

> **버전**: v1.0 MVP  
> **작성일**: 2026-05-31  
> **작성자**: anakin  
> **상태**: MVP 구현 완료 / v2 계획 중

---

## 1. 개요 (Executive Summary)

| 항목 | 내용 |
|------|------|
| 제품명 | 표준데이터 관리 프로그램 (DA Standard Data Management) |
| 핵심 가치 | 쇼핑몰 DB 물리설계 표준을 단일 UI에서 관리하고 RBAC로 접근을 제어 |
| 타겟 사용자 | DA(Data Architect) 담당자, 쇼핑몰 데이터 관리 팀 |
| MVP 목표 기간 | 완료 (2026-05 기준 1차 MVP 배포) |
| 현재 단계 | MVP 기능 구현 완료 — 보안 취약점 수정 완료, v2 설계 진입 |

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
- [x] AC5: 인증 없는 API 접근 차단 (CRITICAL 취약점 수정 완료)

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
| 보안 | SQL Injection 방어 | 허용목록(allowlist) 기반 필드 검증 | ✅ 수정 완료 |
| 보안 | API 인증·인가 | 미인증 접근 차단 (CRITICAL x4 수정) | ✅ 수정 완료 |
| 보안 | OWASP Top 10 대응 | 주요 취약점 없음 | ✅ 검토 완료 |
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
| 보안 취약점 | 0건 (수정 완료) | 0건 유지 | 코드 리뷰 |
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
| M3: 보안 강화 | 2026-05 | SQL Injection · 인증 취약점 수정 | ✅ 완료 |
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

## 13. 변경 이력 (Changelog)

| 버전 | 날짜 | 변경 내용 | 작성자 |
|------|------|---------|-------|
| v1.0 | 2026-05-31 | MVP PRD 초안 작성 (코드베이스 역분석 기반) | anakin |
