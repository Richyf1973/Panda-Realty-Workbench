/** Scratch config — runs .scratch specs that are excluded from the default suite. */
import { defineConfig, devices } from "@playwright/test"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

import { loadPandaRealtyE2eEnv } from "./e2e/load-panda-e2e-env"

const appDir = dirname(fileURLToPath(import.meta.url))

loadPandaRealtyE2eEnv()

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${process.env.PORT ?? "3004"}`

export default defineConfig({
  globalSetup: resolve(appDir, "e2e/global-setup.ts"),
  testDir: "./e2e/.scratch",
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: "list",
  use: {
    baseURL,
    headless: !!process.env.CI,
    trace: "on-first-retry",
    serviceWorkers: "block",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        headless: !!process.env.CI,
        viewport: { width: 1280, height: 900 },
      },
    },
  ],
  webServer: process.env.PLAYWRIGHT_SKIP_WEBSERVER
    ? undefined
    : {
        command: "npm run dev:playwright",
        cwd: appDir,
        url: baseURL,
        reuseExistingServer: true,
      },
})
