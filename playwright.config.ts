import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright E2E 테스트 설정
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  // 테스트 파일 위치
  testDir: './tests/e2e',

  // 전체 타임아웃 설정
  timeout: 30 * 1000,

  // 단언(assertion) 타임아웃
  expect: {
    timeout: 5000,
  },

  // 실패 시 재시도 없음 (CI에서는 2회)
  retries: process.env.CI ? 2 : 0,

  // 병렬 실행 워커 수
  workers: process.env.CI ? 1 : undefined,

  // 테스트 리포터
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],

  // 공통 설정 (모든 프로젝트에 적용)
  use: {
    // 기본 URL
    baseURL: 'http://localhost:3000',

    // 실패 시 스크린샷
    screenshot: 'only-on-failure',

    // 실패 시 비디오 녹화
    video: 'retain-on-failure',

    // 실패 시 트레이스
    trace: 'retain-on-failure',

    // 헤더 설정
    extraHTTPHeaders: {
      'Accept-Language': 'ko-KR,ko;q=0.9',
    },
  },

  // 브라우저 프로젝트 구성
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    // 모바일 테스트
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],

  // 테스트 실행 전 개발 서버 자동 시작
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
})
