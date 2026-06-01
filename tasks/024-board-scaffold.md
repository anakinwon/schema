# Task 024: 게시판 DB 스키마 + 기반 구조 + 빈 페이지 스캐폴딩

## 개요
통합게시판 v3 Phase 2의 골격 구축. DB 마이그레이션, 기반 유틸, 전체 빈 페이지 구조를 완성하여 이후 Phase가 독립적으로 진행 가능한 상태를 만든다.

## 구현 사항

### DB & 표준 (DA 워크플로우 완료)
- [x] STD_DOM 5종 등록 (CONT·TTL·TP·SZ·URL) — 메타DB SQLite
- [x] STD_DIC 기본어 10종 등록 (BRD·CTGR·POST·CMNT·ATTCH·PIN·ANSW·ACPT·FL·VW)
- [x] STD_DIC 분류어 5종 등록 (CONT·TTL·TP·SZ·URL)
- [x] Supabase 마이그레이션: brd_ctgr·brd_post·brd_cmnt·brd_attch 4테이블
- [x] mod_dts 트리거 4종 생성 (fn_update_mod_dts)
- [x] 카테고리 시드 (NOTICE·ARCHIVE·FREE·QNA)

### DA QA 감리 결과 ✅
- [x] 시스템컬럼 4종 (reg_usr_id, reg_dts, mod_usr_id, mod_dts) 맨 마지막 위치
- [x] ~여부 컬럼 varchar(1) NOT NULL DEFAULT 'Y'/'N'
- [x] 모든 Object 소문자
- [x] RLS enabled + 정책 없음 (supabaseAdmin 서비스롤 전용)
- [x] FK + INDEX 설정 완료

### 기반 유틸
- [x] `lib/auth-guard.ts` — AuthResult에 user_id 추가 (비파괴적)
- [x] `lib/board.ts` 신규 — CATEGORY_NAME, BOARD_WRITE_ROLES, isOwnerOrAdmin

### 빈 페이지 스캐폴딩
- [x] `app/board/layout.tsx` — 헤더 + 4탭바 레이아웃
- [x] `app/board/page.tsx` — /board/notice redirect
- [x] `app/board/not-found.tsx` — 없는 카테고리 404
- [x] `app/board/[category]/page.tsx` — 빈 껍데기 + generateMetadata
- [x] `app/board/[category]/loading.tsx` — animate-pulse 스켈레톤
- [x] `app/board/[category]/error.tsx` — 'use client' 에러 바운더리
- [x] `app/board/[category]/new/page.tsx` — 빈 껍데기
- [x] `app/board/[category]/new/loading.tsx`
- [x] `app/board/[category]/[id]/page.tsx` — 빈 껍데기 + generateMetadata
- [x] `app/board/[category]/[id]/loading.tsx`
- [x] `app/board/[category]/[id]/error.tsx`
- [x] `app/board/[category]/[id]/edit/page.tsx` — 빈 껍데기

## 수락 기준
- Supabase에 4개 테이블 존재 확인
- `/board/notice` 접속 시 200 응답 (리다이렉트 포함)
- `/board/invalid` 접속 시 not-found 페이지 표시
- TypeScript 컴파일 에러 없음

## 테스트 계획 ⭐
- 테스트 목표: 라우팅 구조 정상 동작, DB 테이블 존재 확인
- 테스트 시나리오:
  - /board → /board/notice 리다이렉트 확인
  - /board/notice, /board/archive, /board/free, /board/qna 각각 200
  - /board/invalid → not-found
  - /board/notice/new → 200 (빈 페이지)
- 테스트 도구: 브라우저 직접 확인 (빈 페이지이므로 Playwright E2E는 TASK-031)

## 단계별 구현 및 테스트 ⭐
- Step 1: DB + lib → Supabase 테이블 확인 ✅
- Step 2: 레이아웃 + 리다이렉트 → /board 접속 시 탭바 표시
- Step 3: [category] 동적 라우트 → 4개 카테고리 URL 정상
- Step 4: [id] 중첩 라우트 → 상세/작성/수정 URL 정상

## 변경 파일 요약
| 파일 | 변경 유형 |
|------|----------|
| lib/auth-guard.ts | 수정 — user_id 추가 |
| lib/board.ts | 신규 |
| app/board/** | 신규 12개 파일 |
