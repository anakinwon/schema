# Task 028: 첨부파일 API

## 개요
게시판 첨부파일 업로드·조회·삭제 API. Supabase Storage `board-attachments` 버킷 사용.
업로드: multipart FormData → Buffer → supabaseAdmin.storage.upload.
삭제: Storage + brd_attch 동시 제거.

## 구현 사항

- [x] `app/api/board/[category]/posts/[id]/attachments/route.ts` — GET / POST(multipart)
- [x] `app/api/board/[category]/posts/[id]/attachments/[attId]/route.ts` — DELETE

## 수락 기준
- GET .../attachments → 첨부파일 목록
- POST .../attachments (5MB PNG) → 201, fl_url 반환
- POST .../attachments (25MB) → 400
- POST .../attachments (6번째) → 400
- DELETE .../attachments/[id] → DB + Storage 동시 삭제 확인

## 테스트 계획 ⭐
- 정상 업로드 → brd_attch INSERT + Storage 파일 생성
- 20MB 초과 → 400
- 5개 초과 → 400
- 삭제 → Storage.remove() + brd_attch DELETE 확인

## 단계별 구현 및 테스트 ⭐
- Step 1: GET attachments → 목록 확인
- Step 2: POST attachments (정상) → 201 + Storage 파일 확인
- Step 3: POST attachments (제한 초과) → 400
- Step 4: DELETE attachments → Storage + DB 동시 삭제
