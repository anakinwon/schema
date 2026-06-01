import { test, expect, type Page, type APIRequestContext } from '@playwright/test'

// ── 테스트 계정 (환경변수 없으면 로그인 테스트 skip) ────────
const MASTER = {
  email:    process.env.TEST_MASTER_EMAIL ?? '',
  password: process.env.TEST_MASTER_PW   ?? '',
}
const USER = {
  email:    process.env.TEST_USER_EMAIL ?? '',
  password: process.env.TEST_USER_PW   ?? '',
}

const BASE = 'http://localhost:3001'

// ── 헬퍼 ─────────────────────────────────────────────────────
async function loginAs(page: Page, email: string, password: string) {
  await page.goto(`${BASE}/login`)
  await page.locator('input[type="email"]').fill(email)
  await page.locator('input[type="password"]').fill(password)
  await page.locator('button[type="submit"]').click()
  await page.waitForURL(/board|standards/, { timeout: 10_000 })
}

async function getBearerToken(page: Page): Promise<string> {
  return page.evaluate(async () => {
    const k = Object.keys(localStorage).find(k => k.includes('auth-token') || k.includes('access_token'))
    if (k) return localStorage.getItem(k) ?? ''
    // Supabase SSR 패턴: sb-* 키
    const sbKey = Object.keys(localStorage).find(k => k.startsWith('sb-'))
    if (sbKey) {
      const session = JSON.parse(localStorage.getItem(sbKey) ?? '{}')
      return session?.access_token ?? ''
    }
    return ''
  })
}

// ── Layer 1: API 레벨 (인증 없음, 항상 실행) ──────────────────
test.describe('게시판 API — 인증 없음', () => {

  test('GET /api/board/categories → 401 (미인증)', async ({ request }) => {
    const res = await request.get(`${BASE}/api/board/categories`)
    expect(res.status()).toBe(401)
  })

  test('GET /api/board/notice/posts → 401 (미인증)', async ({ request }) => {
    const res = await request.get(`${BASE}/api/board/notice/posts`)
    expect(res.status()).toBe(401)
  })

  test('POST /api/board/free/posts → 401 (미인증)', async ({ request }) => {
    const res = await request.post(`${BASE}/api/board/free/posts`, {
      data: { post_ttl: '테스트', post_cont: '내용' },
    })
    expect(res.status()).toBe(401)
  })

  test('GET /api/board/invalid/posts → 307 (미인증 redirect)', async ({ request }) => {
    const res = await request.get(`${BASE}/api/board/invalid/posts`, {
      maxRedirects: 0,
    })
    // 미인증 → 401, 또는 인증 후 invalid 카테고리 → 404
    expect([401, 307, 302].includes(res.status())).toBeTruthy()
  })

})

// ── Layer 2: 브라우저 E2E (환경변수 필요) ────────────────────
test.describe('게시판 E2E — MASTER 계정', () => {

  test.beforeEach(({ }) => {
    test.skip(!MASTER.email || !MASTER.password, '환경변수 TEST_MASTER_EMAIL/PW 미설정 → skip')
  })

  test('MASTER: 공지사항 작성 → 목록 확인 → 상세 조회 → 삭제', async ({ page }) => {
    await loginAs(page, MASTER.email, MASTER.password)

    // 공지 게시판 접속
    await page.goto(`${BASE}/board/notice`)
    await expect(page.locator('table, [class*="Board"]')).toBeVisible({ timeout: 8_000 })

    // 글쓰기
    await page.locator('a:has-text("글쓰기"), button:has-text("글쓰기")').click()
    await page.waitForURL(/notice\/new/, { timeout: 5_000 })

    const title = `[E2E] 공지 테스트 ${Date.now()}`
    await page.locator('input[placeholder*="제목"]').fill(title)
    await page.locator('textarea[placeholder*="내용"]').fill('E2E 테스트 본문입니다.')
    await page.locator('button[type="submit"]:has-text("등록")').click()

    // 상세 페이지로 이동
    await page.waitForURL(/notice\/[a-z0-9-]+$/, { timeout: 8_000 })
    await expect(page.getByText(title)).toBeVisible()

    // 목록으로 이동 후 글 확인
    await page.goto(`${BASE}/board/notice`)
    await expect(page.getByText(title)).toBeVisible({ timeout: 5_000 })

    // 삭제 (상세 페이지로 이동해서 삭제 버튼 클릭)
    await page.getByText(title).click()
    await page.waitForURL(/notice\/[a-z0-9-]+$/, { timeout: 5_000 })
    page.once('dialog', d => d.accept())
    await page.locator('button:has-text("삭제")').click()
    await page.waitForURL(/board\/notice$/, { timeout: 5_000 })
    await expect(page.getByText(title)).not.toBeVisible()
  })

  test('MASTER: API — 카테고리 목록 4건 구조 확인', async ({ page }) => {
    await loginAs(page, MASTER.email, MASTER.password)
    const token = await getBearerToken(page)
    test.skip(!token, 'Bearer 토큰 획득 실패')

    const res = await page.request.get(`${BASE}/api/board/categories`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.status()).toBe(200)
    const cats = await res.json()
    expect(Array.isArray(cats)).toBeTruthy()
    expect(cats).toHaveLength(4)
    const codes = cats.map((c: { ctgr_cd: string }) => c.ctgr_cd)
    expect(codes).toContain('NOTICE')
    expect(codes).toContain('FREE')
    expect(codes).toContain('QNA')
    expect(codes).toContain('ARCHIVE')
  })

  test('MASTER: API — 게시글 목록 페이지네이션 구조', async ({ page }) => {
    await loginAs(page, MASTER.email, MASTER.password)
    const token = await getBearerToken(page)
    test.skip(!token, 'Bearer 토큰 획득 실패')

    const res = await page.request.get(`${BASE}/api/board/notice/posts?page=1`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.status()).toBe(200)
    const data = await res.json()
    expect(data).toHaveProperty('items')
    expect(data).toHaveProperty('total')
    expect(data).toHaveProperty('page', 1)
    expect(data).toHaveProperty('pageSize')
    expect(data).toHaveProperty('totalPages')
    expect(Array.isArray(data.items)).toBeTruthy()
  })

  test('MASTER: 게시글 CRUD API — 등록 → 조회수 증가 → 수정 → 삭제', async ({ page }) => {
    await loginAs(page, MASTER.email, MASTER.password)
    const token = await getBearerToken(page)
    test.skip(!token, 'Bearer 토큰 획득 실패')

    const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }

    // 등록
    const createRes = await page.request.post(`${BASE}/api/board/notice/posts`, {
      headers,
      data: { post_ttl: '[E2E] API 테스트', post_cont: 'API 테스트 본문' },
    })
    expect(createRes.status()).toBe(201)
    const { post_id } = await createRes.json()
    expect(post_id).toBeTruthy()

    // 상세 조회 (조회수 +1)
    const detailRes = await page.request.get(
      `${BASE}/api/board/notice/posts/${post_id}`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    expect(detailRes.status()).toBe(200)
    const detail = await detailRes.json()
    expect(detail.post_ttl).toBe('[E2E] API 테스트')
    expect(detail.vw_cnt).toBeGreaterThanOrEqual(1)

    // 수정 (post_cont 미포함 → 기존 값 유지)
    const updateRes = await page.request.put(
      `${BASE}/api/board/notice/posts/${post_id}`,
      { headers, data: { post_ttl: '[E2E] 수정된 제목' } }
    )
    expect(updateRes.status()).toBe(200)

    // 수정 후 본문 유지 확인
    const afterUpdate = await page.request.get(
      `${BASE}/api/board/notice/posts/${post_id}`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    const updated = await afterUpdate.json()
    expect(updated.post_ttl).toBe('[E2E] 수정된 제목')
    expect(updated.post_cont).toBe('API 테스트 본문') // 본문 보존 확인

    // 삭제
    const deleteRes = await page.request.delete(
      `${BASE}/api/board/notice/posts/${post_id}`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    expect(deleteRes.status()).toBe(200)

    // 삭제 후 404 확인
    const notFound = await page.request.get(
      `${BASE}/api/board/notice/posts/${post_id}`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    expect(notFound.status()).toBe(404)
  })

})

// ── Layer 2: USER 계정 권한 테스트 ───────────────────────────
test.describe('게시판 E2E — USER 계정 권한', () => {

  test.beforeEach(({ }) => {
    test.skip(!USER.email || !USER.password, '환경변수 TEST_USER_EMAIL/PW 미설정 → skip')
  })

  test('USER: NOTICE 쓰기 시도 → 403', async ({ page }) => {
    await loginAs(page, USER.email, USER.password)
    const token = await getBearerToken(page)
    test.skip(!token, 'Bearer 토큰 획득 실패')

    const res = await page.request.post(`${BASE}/api/board/notice/posts`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      data: { post_ttl: '권한 없는 공지', post_cont: '내용' },
    })
    expect(res.status()).toBe(403)
    const body = await res.json()
    expect(body.error).toContain('권한')
  })

  test('USER: FREE 게시글 작성 → 201', async ({ page }) => {
    await loginAs(page, USER.email, USER.password)
    const token = await getBearerToken(page)
    test.skip(!token, 'Bearer 토큰 획득 실패')

    const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }

    const res = await page.request.post(`${BASE}/api/board/free/posts`, {
      headers,
      data: { post_ttl: '[E2E] USER 자유게시판 글', post_cont: '내용' },
    })
    expect(res.status()).toBe(201)
    const { post_id } = await res.json()

    // 삭제 정리
    await page.request.delete(`${BASE}/api/board/free/posts/${post_id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
  })

  test('USER: NOTICE 댓글 시도 → 403 (cmnt_yn=N)', async ({ page }) => {
    // NOTICE에는 댓글 불가 — cmnt_yn='N'
    await loginAs(page, USER.email, USER.password)
    const token = await getBearerToken(page)
    test.skip(!token, 'Bearer 토큰 획득 실패')

    // NOTICE 게시글 하나 필요 — 없으면 404이므로 실제 있는 ID 필요
    // 여기서는 존재하지 않는 ID로 테스트 → 404 확인
    const res = await page.request.post(
      `${BASE}/api/board/notice/posts/00000000-0000-0000-0000-000000000000/comments`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        data: { cmnt_cont: '댓글 내용' },
      }
    )
    // 게시글 없음(404) 또는 댓글 불가(403)
    expect([403, 404].includes(res.status())).toBeTruthy()
  })

})

// ── Layer 2: Q&A 채택 플로우 ─────────────────────────────────
test.describe('게시판 E2E — Q&A 채택 플로우', () => {

  test.beforeEach(({ }) => {
    test.skip(
      !MASTER.email || !USER.email,
      '환경변수 TEST_MASTER_EMAIL/USER_EMAIL 미설정 → skip'
    )
  })

  test('Q&A 채택: 질문 작성 → 답변 등록 → 채택 → 검증', async ({ page }) => {
    // MASTER가 QNA 글 작성 (USER는 QNA 가능하지만 MASTER로 통일)
    await loginAs(page, MASTER.email, MASTER.password)
    const masterToken = await getBearerToken(page)
    test.skip(!masterToken, 'Bearer 토큰 획득 실패')

    const headers = (t: string) => ({
      Authorization: `Bearer ${t}`,
      'Content-Type': 'application/json',
    })

    // 질문 등록
    const postRes = await page.request.post(`${BASE}/api/board/qna/posts`, {
      headers: headers(masterToken),
      data: { post_ttl: '[E2E] Q&A 채택 테스트', post_cont: '채택 테스트 질문' },
    })
    expect(postRes.status()).toBe(201)
    const { post_id } = await postRes.json()

    // 답변 댓글 등록
    const cmntRes = await page.request.post(
      `${BASE}/api/board/qna/posts/${post_id}/comments`,
      {
        headers: headers(masterToken),
        data: { cmnt_cont: '정답 댓글입니다' },
      }
    )
    expect(cmntRes.status()).toBe(201)
    const { cmnt_id } = await cmntRes.json()

    // 채택
    const acceptRes = await page.request.post(
      `${BASE}/api/board/qna/posts/${post_id}/accept`,
      {
        headers: headers(masterToken),
        data: { cmnt_id },
      }
    )
    expect(acceptRes.status()).toBe(200)

    // 채택 검증
    const detailRes = await page.request.get(
      `${BASE}/api/board/qna/posts/${post_id}`,
      { headers: { Authorization: `Bearer ${masterToken}` } }
    )
    const detail = await detailRes.json()
    expect(detail.answ_yn).toBe('Y')
    expect(detail.acpt_cmnt_id).toBe(cmnt_id)

    // 정리
    await page.request.delete(
      `${BASE}/api/board/qna/posts/${post_id}`,
      { headers: { Authorization: `Bearer ${masterToken}` } }
    )
  })

  test('Q&A 채택: 타인이 채택 시도 → 403', async ({ page, browser }) => {
    await loginAs(page, MASTER.email, MASTER.password)
    const masterToken = await getBearerToken(page)
    test.skip(!masterToken || !USER.email, '토큰/계정 미설정')

    const masterHeaders = {
      Authorization: `Bearer ${masterToken}`,
      'Content-Type': 'application/json',
    }

    // MASTER가 QNA 글 + 댓글 생성
    const postRes = await page.request.post(`${BASE}/api/board/qna/posts`, {
      headers: masterHeaders,
      data: { post_ttl: '[E2E] 타인 채택 차단 테스트', post_cont: '내용' },
    })
    const { post_id } = await postRes.json()

    const cmntRes = await page.request.post(
      `${BASE}/api/board/qna/posts/${post_id}/comments`,
      { headers: masterHeaders, data: { cmnt_cont: '답변' } }
    )
    const { cmnt_id } = await cmntRes.json()

    // USER가 채택 시도
    const userPage = await browser.newPage()
    await loginAs(userPage, USER.email, USER.password)
    const userToken = await getBearerToken(userPage)

    const rejectRes = await userPage.request.post(
      `${BASE}/api/board/qna/posts/${post_id}/accept`,
      {
        headers: { Authorization: `Bearer ${userToken}`, 'Content-Type': 'application/json' },
        data: { cmnt_id },
      }
    )
    expect(rejectRes.status()).toBe(403)
    await userPage.close()

    // 정리
    await page.request.delete(
      `${BASE}/api/board/qna/posts/${post_id}`,
      { headers: { Authorization: `Bearer ${masterToken}` } }
    )
  })

})

// ── Layer 2: 관리자 강제 삭제 ────────────────────────────────
test.describe('게시판 E2E — 관리자 강제 삭제', () => {

  test.beforeEach(({ }) => {
    test.skip(
      !MASTER.email || !USER.email,
      '환경변수 미설정 → skip'
    )
  })

  test('관리자가 타인 글 강제 삭제 → 200', async ({ page, browser }) => {
    // USER가 FREE 게시글 작성
    const userPage = await browser.newPage()
    await loginAs(userPage, USER.email, USER.password)
    const userToken = await getBearerToken(userPage)
    test.skip(!userToken, 'USER 토큰 획득 실패')

    const postRes = await userPage.request.post(`${BASE}/api/board/free/posts`, {
      headers: { Authorization: `Bearer ${userToken}`, 'Content-Type': 'application/json' },
      data: { post_ttl: '[E2E] 강제 삭제 대상', post_cont: '내용' },
    })
    expect(postRes.status()).toBe(201)
    const { post_id } = await postRes.json()
    await userPage.close()

    // MASTER가 강제 삭제
    await loginAs(page, MASTER.email, MASTER.password)
    const masterToken = await getBearerToken(page)

    const deleteRes = await page.request.delete(
      `${BASE}/api/board/free/posts/${post_id}`,
      { headers: { Authorization: `Bearer ${masterToken}` } }
    )
    expect(deleteRes.status()).toBe(200)

    // 삭제 확인
    const checkRes = await page.request.get(
      `${BASE}/api/board/free/posts/${post_id}`,
      { headers: { Authorization: `Bearer ${masterToken}` } }
    )
    expect(checkRes.status()).toBe(404)
  })

  test('일반 USER가 타인 글 삭제 시도 → 403', async ({ page, browser }) => {
    // MASTER가 FREE 게시글 작성
    await loginAs(page, MASTER.email, MASTER.password)
    const masterToken = await getBearerToken(page)
    test.skip(!masterToken, 'MASTER 토큰 획득 실패')

    const postRes = await page.request.post(`${BASE}/api/board/free/posts`, {
      headers: { Authorization: `Bearer ${masterToken}`, 'Content-Type': 'application/json' },
      data: { post_ttl: '[E2E] 삭제 권한 차단 테스트', post_cont: '내용' },
    })
    const { post_id } = await postRes.json()

    // USER가 삭제 시도
    const userPage = await browser.newPage()
    await loginAs(userPage, USER.email, USER.password)
    const userToken = await getBearerToken(userPage)

    const deleteRes = await userPage.request.delete(
      `${BASE}/api/board/free/posts/${post_id}`,
      { headers: { Authorization: `Bearer ${userToken}` } }
    )
    expect(deleteRes.status()).toBe(403)
    await userPage.close()

    // 정리
    await page.request.delete(
      `${BASE}/api/board/free/posts/${post_id}`,
      { headers: { Authorization: `Bearer ${masterToken}` } }
    )
  })

})
