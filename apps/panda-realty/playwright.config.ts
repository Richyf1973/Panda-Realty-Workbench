import { existsSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

import { defineConfig, devices } from "@playwright/test"

import { loadPandaRealtyE2eEnv } from "./e2e/load-panda-e2e-env"

const appDir = dirname(fileURLToPath(import.meta.url))
const adminAuthPath = resolve(appDir, "e2e/.auth/admin.json")

loadPandaRealtyE2eEnv()

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${process.env.PORT ?? "3004"}`

const playwrightWorkers =
  process.env.PLAYWRIGHT_WORKERS != null && process.env.PLAYWRIGHT_WORKERS !== ""
    ? Number(process.env.PLAYWRIGHT_WORKERS)
    : 2

/** Headless only in CI or when `PLAYWRIGHT_HEADLESS=1`; headed by default locally. */
const playwrightHeadless =
  process.env.PLAYWRIGHT_HEADLESS === "1" || process.env.PLAYWRIGHT_HEADLESS === "true"
    ? true
    : process.env.PLAYWRIGHT_HEADED === "1" || process.env.PLAYWRIGHT_HEADED === "true"
      ? false
      : !!process.env.CI

const chromiumLaunchArgs: string[] = []
if (playwrightHeadless) {
  chromiumLaunchArgs.push("--disable-dev-shm-usage")
}

/** Default 1 ms so the browser is visibly paced; set `PLAYWRIGHT_SLOWMO=0` to disable. */
const playwrightSlowMoMs = (() => {
  const raw = process.env.PLAYWRIGHT_SLOWMO
  if (raw != null && raw !== "") {
    const n = Number(raw)
    if (Number.isFinite(n) && n >= 0) return n
  }
  return 1
})()

const chromiumLaunchOptions: { args?: string[]; slowMo?: number } = {}
if (chromiumLaunchArgs.length > 0) {
  chromiumLaunchOptions.args = chromiumLaunchArgs
}
if (playwrightSlowMoMs > 0) {
  chromiumLaunchOptions.slowMo = playwrightSlowMoMs
}

/** Wider than stock `Desktop Chrome` (~1280×720) so admin dialogs fit; override with env. */
function playwrightViewport(): { width: number; height: number } {
  const w = process.env.PLAYWRIGHT_VIEWPORT_WIDTH
  const h = process.env.PLAYWRIGHT_VIEWPORT_HEIGHT
  if (w != null && w !== "" && h != null && h !== "") {
    const width = Number(w)
    const height = Number(h)
    if (Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0) {
      return { width, height }
    }
  }
  return { width: 1920, height: 1080 }
}

export default defineConfig({
  globalSetup: resolve(appDir, "e2e/global-setup.ts"),
  testDir: "./e2e",
  /** Disposable screenshot / debug specs — run with an explicit path, not in the default suite. */
  testIgnore: ["**/.scratch/**"],
  timeout: 60_000,
  fullyParallel: playwrightWorkers > 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: playwrightWorkers,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL,
    headless: playwrightHeadless,
    trace: "on-first-retry",
    serviceWorkers: "block",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        /** Must be set here; device preset merge can otherwise leave headless wrong under `CI`. */
        headless: playwrightHeadless,
        viewport: playwrightViewport(),
        /** Pre-loaded by globalSetup — avoids per-test logins under parallel load. */
        ...(existsSync(adminAuthPath) ? { storageState: adminAuthPath } : {}),
        ...(Object.keys(chromiumLaunchOptions).length > 0
          ? { launchOptions: chromiumLaunchOptions }
          : {}),
      },
    },
  ],
  webServer: process.env.PLAYWRIGHT_SKIP_WEBSERVER
    ? undefined
    : {
        command: "npm run dev:playwright",
        cwd: appDir,
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
        stdout: "pipe",
        stderr: "pipe",
      },
})
