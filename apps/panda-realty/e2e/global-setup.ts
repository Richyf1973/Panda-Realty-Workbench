import { execFileSync } from "node:child_process"
import { mkdir } from "node:fs/promises"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

import { chromium, type FullConfig } from "@playwright/test"

import { loadPandaRealtyE2eEnv } from "./load-panda-e2e-env"

/**
 * Runs once in the Playwright **main** process before workers start so `.env.local` is
 * applied before `process.env` is inherited by test workers.
 * When `DATABASE_URL` is set, seeds pipeline E2E fixtures (idempotent).
 * When admin credentials are set, logs in and saves session state to e2e/.auth/admin.json
 * so each test starts with a valid session cookie (avoids slow per-test logins).
 */
export default async function globalSetup(config: FullConfig): Promise<void> {
  loadPandaRealtyE2eEnv()
  const e2eDir = dirname(fileURLToPath(import.meta.url))
  const appDir = resolve(e2eDir, "..")

  const db = process.env.DATABASE_URL?.trim()
  if (!db) {
    console.warn("[panda-realty e2e] DATABASE_URL unset — globalSetup skipped DB seed")
  } else {
    const seedScript = resolve(e2eDir, "scripts/seed-sellers-pipeline-accepted-offer.mjs")
    execFileSync(process.execPath, [seedScript], { stdio: "inherit", cwd: appDir })
  }

  const email = process.env.E2E_ADMIN_EMAIL?.trim()
  const password = process.env.E2E_ADMIN_PASSWORD?.trim()
  if (!email || !password) return

  const authDir = resolve(e2eDir, ".auth")
  await mkdir(authDir, { recursive: true })

  const baseURL =
    config.projects[0]?.use?.baseURL ??
    `http://localhost:${process.env.PORT ?? "3004"}`

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext()
  const page = await context.newPage()

  await page.goto(`${baseURL}/login`, { waitUntil: "domcontentloaded" })
  await page.waitForFunction(
    () => {
      const el = document.querySelector('[data-testid="login-email-input"]')
      return el !== null && Object.keys(el).some((k) => k.startsWith("__reactProps") || k.startsWith("__reactFiber"))
    },
    { timeout: 30_000 },
  )
  await page.fill('[data-testid="login-email-input"]', email)
  await page.fill('[data-testid="login-password-input"]', password)
  await page.click('[data-testid="login-submit"]')
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 30_000 })

  await context.storageState({ path: resolve(authDir, "admin.json") })
  await browser.close()
  console.log("[panda-realty e2e] Admin session saved → e2e/.auth/admin.json")
}
