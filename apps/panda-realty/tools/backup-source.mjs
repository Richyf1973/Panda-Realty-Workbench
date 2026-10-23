/**
 * backup-source.mjs
 *
 * Creates a zip archive of the panda-realty app + its shared packages,
 * then commits and pushes it to the client's GitHub repo.
 *
 * Usage:  node tools/backup-source.mjs
 *         npm run backup:source -w panda-realty
 *
 * Pre-requisites:
 *   - Git credentials for https://github.com/Richie531/Panda-Realty.git saved
 *     in the OS credential store (Windows Credential Manager / Git Credential Manager).
 *   - No extra env vars needed — remote URL is hardcoded below.
 */

import archiver from "archiver"
import { execSync } from "node:child_process"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const CLIENT_REMOTE = "https://github.com/Richie531/Panda-Realty.git"
const BACKUP_FILENAME = "panda-realty-backup.zip"
const TARGET_BRANCH = "main"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
/** apps/panda-realty */
const APP_DIR = path.resolve(__dirname, "..")
/** monorepo root */
const REPO_ROOT = path.resolve(APP_DIR, "../..")

// Folders to include in the zip, relative to REPO_ROOT
const INCLUDE_PATHS = [
  "apps/panda-realty",
  "packages/admin",
  "packages/ui",
  "packages/auth-redirect",
]

// Glob patterns to exclude (archiver uses glob-style)
const EXCLUDE_GLOBS = [
  "**/node_modules/**",
  "**/.next/**",
  "**/.env*.local",
  "**/.env.local",
  "**/*.tsbuildinfo",
  "**/playwright-report/**",
  "**/test-results/**",
  "**/.vercel/**",
]

// ---------------------------------------------------------------------------
// Logging helpers (NDJSON — one JSON object per line)
// ---------------------------------------------------------------------------

const startTime = Date.now()

function log(level, step, msg, detail) {
  const entry = { level, step, msg, ts: new Date().toISOString() }
  if (detail !== undefined) entry.detail = detail
  process.stdout.write(JSON.stringify(entry) + "\n")
}

function info(step, msg, detail) {
  log("info", step, msg, detail)
}
function success(step, msg, detail) {
  log("success", step, msg, detail)
}
function warn(step, msg, detail) {
  log("warn", step, msg, detail)
}
function fatal(step, msg, detail) {
  log("error", step, msg, detail)
  const duration_ms = Date.now() - startTime
  process.stdout.write(
    JSON.stringify({
      level: "error",
      step: "summary",
      msg: `backup-source FAILED at step '${step}': ${msg}`,
      exitCode: 1,
      duration_ms,
    }) + "\n"
  )
  process.exit(1)
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function exec(cmd, opts = {}) {
  try {
    return execSync(cmd, { encoding: "utf8", stdio: "pipe", ...opts }).trim()
  } catch (err) {
    return { __error: true, stderr: err.stderr ?? "", stdout: err.stdout ?? "", status: err.status ?? 1 }
  }
}

function fileSize(filePath) {
  try {
    return fs.statSync(filePath).size
  } catch {
    return null
  }
}

function formatBytes(bytes) {
  if (bytes == null) return "unknown"
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

// ---------------------------------------------------------------------------
// Step 1: env-check
// ---------------------------------------------------------------------------

info("env-check", "Checking environment", {
  repoRoot: REPO_ROOT,
  appDir: APP_DIR,
  clientRemote: CLIENT_REMOTE,
  includePaths: INCLUDE_PATHS,
})

for (const rel of INCLUDE_PATHS) {
  const abs = path.join(REPO_ROOT, rel)
  if (!fs.existsSync(abs)) {
    fatal("env-check", `Source path does not exist: ${abs}`, { path: abs })
  }
}

success("env-check", "All source paths exist")

// ---------------------------------------------------------------------------
// Step 2: zip
// ---------------------------------------------------------------------------

const zipPath = path.join(REPO_ROOT, BACKUP_FILENAME)
info("zip", "Creating zip archive", { output: zipPath })

await new Promise((resolve, reject) => {
  const output = fs.createWriteStream(zipPath)
  const archive = archiver("zip", { zlib: { level: 9 } })
  let fileCount = 0

  archive.on("entry", () => fileCount++)
  archive.on("warning", (err) => {
    if (err.code === "ENOENT") {
      warn("zip", "Archive warning (ENOENT)", { message: err.message })
    } else {
      reject(err)
    }
  })
  archive.on("error", reject)
  output.on("close", () => resolve(fileCount))

  archive.pipe(output)

  for (const rel of INCLUDE_PATHS) {
    const abs = path.join(REPO_ROOT, rel)
    archive.glob("**/*", {
      cwd: abs,
      dot: true,
      ignore: EXCLUDE_GLOBS,
      // Preserve the folder structure inside the zip
    }, { prefix: rel })
  }

  archive.finalize()
}).then((fileCount) => {
  const size = fileSize(zipPath)
  success("zip", "Archive created", {
    path: zipPath,
    files: fileCount,
    size: formatBytes(size),
    sizeBytes: size,
  })
}).catch((err) => {
  fatal("zip", "Archive creation failed", { message: err.message })
})

// ---------------------------------------------------------------------------
// Step 3: git-clone / git-pull into temp dir
// ---------------------------------------------------------------------------

const tmpDir = path.join(os.tmpdir(), "panda-realty-client-repo")
info("git-init", "Preparing client repo clone", { tmpDir })

if (fs.existsSync(path.join(tmpDir, ".git"))) {
  info("git-init", "Existing clone found — pulling latest", { tmpDir })
  const pullResult = exec(`git -C "${tmpDir}" pull origin ${TARGET_BRANCH}`)
  if (pullResult?.__error) {
    fatal("git-init", "git pull failed", {
      stderr: pullResult.stderr,
      hint: "Ensure git credentials for the client repo are saved in the OS credential store.",
    })
  }
  info("git-init", "Pull complete", { output: pullResult })
} else {
  info("git-init", "No existing clone — cloning fresh", { remote: CLIENT_REMOTE })
  fs.mkdirSync(tmpDir, { recursive: true })
  const cloneResult = exec(`git clone ${CLIENT_REMOTE} "${tmpDir}"`)
  if (cloneResult?.__error) {
    fatal("git-init", "git clone failed", {
      stderr: cloneResult.stderr,
      hint: "Ensure git credentials for the client repo are saved in the OS credential store.",
    })
  }
  info("git-init", "Clone complete")
}

success("git-init", "Client repo ready", { tmpDir })

// ---------------------------------------------------------------------------
// Step 4: copy zip into clone
// ---------------------------------------------------------------------------

const destZip = path.join(tmpDir, BACKUP_FILENAME)
info("git-commit", "Copying zip into clone", { src: zipPath, dest: destZip })

try {
  fs.copyFileSync(zipPath, destZip)
} catch (err) {
  fatal("git-commit", "Failed to copy zip into clone", { message: err.message })
}

// ---------------------------------------------------------------------------
// Step 5: git commit
// ---------------------------------------------------------------------------

const timestamp = new Date().toISOString()
const commitMsg = `backup: ${timestamp}`

const addResult = exec(`git -C "${tmpDir}" add "${BACKUP_FILENAME}"`)
if (addResult?.__error) {
  fatal("git-commit", "git add failed", { stderr: addResult.stderr })
}

// Check if there's anything to commit (zip may be identical)
const statusResult = exec(`git -C "${tmpDir}" status --porcelain`)
if (!statusResult?.__error && statusResult.trim() === "") {
  warn("git-commit", "No changes to commit — zip is identical to last backup. Skipping push.")
  const duration_ms = Date.now() - startTime
  process.stdout.write(
    JSON.stringify({
      level: "success",
      step: "summary",
      msg: "backup-source completed — no changes since last run",
      exitCode: 0,
      duration_ms,
    }) + "\n"
  )
  process.exit(0)
}

const commitResult = exec(`git -C "${tmpDir}" commit -m "${commitMsg}"`)
if (commitResult?.__error) {
  fatal("git-commit", "git commit failed", { stderr: commitResult.stderr })
}

// Extract commit hash from output
const hashMatch = commitResult.match(/\[.+?([a-f0-9]{7,})\]/)
const commitHash = hashMatch?.[1] ?? "unknown"
success("git-commit", "Committed", { hash: commitHash, message: commitMsg })

// ---------------------------------------------------------------------------
// Step 6: git push
// ---------------------------------------------------------------------------

info("git-push", "Pushing to client remote", { remote: CLIENT_REMOTE, branch: TARGET_BRANCH })

const pushResult = exec(`git -C "${tmpDir}" push origin ${TARGET_BRANCH}`)
if (pushResult?.__error) {
  fatal("git-push", "git push failed", {
    stderr: pushResult.stderr,
    hint: "Ensure git credentials for https://github.com/Richie531/Panda-Realty.git are saved in the OS credential store (Windows Credential Manager).",
  })
}

success("git-push", "Pushed successfully", {
  remote: CLIENT_REMOTE,
  branch: TARGET_BRANCH,
  output: pushResult,
})

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

const duration_ms = Date.now() - startTime
process.stdout.write(
  JSON.stringify({
    level: "success",
    step: "summary",
    msg: "backup-source completed successfully",
    exitCode: 0,
    duration_ms,
    details: {
      zipPath,
      zipSize: formatBytes(fileSize(zipPath)),
      commitHash,
      remote: CLIENT_REMOTE,
      branch: TARGET_BRANCH,
    },
  }) + "\n"
)
