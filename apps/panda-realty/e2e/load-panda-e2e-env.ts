/**
 * Loads Panda Realty E2E env from disk. Tries:
 * 1. Paths derived from this file (`apps/panda-realty/e2e` → app + monorepo roots)
 * 2. `process.cwd()` as monorepo root (`apps/panda-realty/.env.local`)
 * 3. `process.cwd()` as app root (`.env.local` when `npm run test:e2e` runs in the workspace)
 *
 * Playwright `globalSetup` also calls this so the parent process has vars before workers fork
 * (workers inherit `process.env`).
 */
import { config as loadEnv } from "dotenv"
import { existsSync, readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const e2eDir = dirname(fileURLToPath(import.meta.url))
const appDirFromFile = resolve(e2eDir, "..")
const monorepoRootFromFile = resolve(appDirFromFile, "..")

function loadEnvFile(path: string): void {
  loadEnv({ path, override: true, quiet: true })
}

function loadMonorepoThenApp(monorepoRoot: string, appDir: string): void {
  loadEnvFile(resolve(monorepoRoot, ".env"))
  loadEnvFile(resolve(monorepoRoot, ".env.local"))
  loadEnvFile(resolve(appDir, ".env"))
  loadEnvFile(resolve(appDir, ".env.local"))
}

export function loadPandaRealtyE2eEnv(): void {
  loadMonorepoThenApp(monorepoRootFromFile, appDirFromFile)

  const cwd = process.cwd()
  // Monorepo root as cwd → app env under apps/panda-realty/
  loadMonorepoThenApp(cwd, resolve(cwd, "apps/panda-realty"))
  // `npm run test:e2e -w panda-realty` uses cwd = apps/panda-realty
  const pkgPath = resolve(cwd, "package.json")
  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as { name?: string }
      if (pkg.name === "panda-realty") {
        loadMonorepoThenApp(resolve(cwd, ".."), cwd)
      }
    } catch {
      /* ignore malformed package.json */
    }
  }
}
