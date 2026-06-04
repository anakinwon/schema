
---
# 관리자 페이지가 오류가 납니다. 
   - https://schema-pi.vercel.app/admin  
     => This page couldn’t load            
  A server error occurred. Reload to try again.   => ERROR 1217993092                                      
  원인을 분석해서 바로 조치바랍니다.                                                                       


● Vercel 로그와 관련 파일들을 동시에 확인하겠습니다.

  Read 1 file (ctrl+o to expand)

● Vercel 프로젝트 정보를 가져오겠습니다.

  Read 1 file, called plugin:vercel:vercel 3 times (ctrl+o to expand)

● 원인이 명확합니다. SqliteError: unable to open — Vercel 서버리스 환경에서 SQLite 파일을 열지 못하는
  문제입니다. 관련 코드를 확인합니다.

  Searched for 1 pattern, read 1 file (ctrl+o to expand)

● 원인 파악: lib/db.ts가 better-sqlite3로 .db 파일을 열 때, Vercel 서버리스 환경의 프로젝트 디렉토리는 읽기
  전용 파일시스템입니다. SQLite는 WAL 저널 파일 쓰기가 필요해 unable to open 에러가 발생합니다. 쓰기
  가능한 /tmp로 복사 후 열도록 수정합니다.

  ★ Insight ─────────────────────────────────────
  - Vercel Lambda 환경에서 /var/task(배포된 프로젝트 파일)는 읽기 전용이지만 /tmp는 쓰기 가능합니다. SQLite
  WAL 모드는 DB 파일 옆에 -wal, -shm 파일을 생성해야 하므로 반드시 쓰기 가능 경로가 필요합니다.
  - 서버리스 인스턴스는 stateless이므로 existsSync로 /tmp에 이미 복사됐는지 확인 후 복사합니다.
  ─────────────────────────────────────────────────

  조치 요약:

  ┌──────┬───────────────────────────────────────────────────────────┐
  │ 항목 │                           내용                            │
  ├──────┼───────────────────────────────────────────────────────────┤
  │ 원인 │ Vercel 읽기 전용 파일시스템에서 SQLite WAL 모드 쓰기 실패 │
  ├──────┼───────────────────────────────────────────────────────────┤
  │ 해결 │ VERCEL 환경변수 감지 시 /tmp로 DB 복사 후 열기            │
  ├──────┼───────────────────────────────────────────────────────────┤
  │ 파일 │ lib/db.ts — resolveDbPath() 함수 추가                     │
  └──────┴───────────────────────────────────────────────────────────┘

  ▎ 참고: Vercel의 /tmp는 서버리스 인스턴스가 재시작되면 초기화됩니다. DB에 쓰기 변경(마이그레이션 등)이
  ▎ 생기면 새 인스턴스에서 원본 파일(소스코드에 포함된)로 다시 복사되므로 변경사항은 유지되지 않습니다.
  ▎ 영구 쓰기가 필요하다면 Supabase PostgreSQL로 이전을 권장합니다.

---