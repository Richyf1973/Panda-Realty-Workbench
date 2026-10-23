# 07-Adobe Sign / 3c — DB Schema: Sign Request Columns

Context: Add the database columns needed to track signing state per document. These columns are a prerequisite for Phase 3d (agreement creation), 3e (webhook), 3f (status tracking), and 3g (portal UI) — do this first so all subsequent phases build on a stable schema.

Parent: [07-adobe-sign.md](../07-adobe-sign.md)

**Must be done before Phase 3d.**

---

## Decision: separate table vs columns on existing table

Two options:
- **A — Columns on the portal files join table** (`propertyEntityFiles` or equivalent): simpler, one table to query. Works if a file can only ever have one active sign request.
- **B — Separate `portalFileSignRequests` table**: cleaner if a file could be re-sent for signing after a cancellation (preserves history). Slightly more complex joins.

> **Recommended: Option B** — a separate table. A cancelled agreement leaving a tombstone on the file row would make re-sending awkward. A sign-requests table keeps history and allows multiple attempts per file naturally.

---

## Tasks

- [x] Decide: separate table (recommended) or columns on existing table — confirm before writing migration
- [x] Write SQL migration: create `portal_file_sign_requests` table with columns:
  - `id` (serial primary key)
  - `portal_token_id` (integer, FK → `portal_tokens.portal_token_id`)
  - `file_id` (text — Drive file ID)
  - `adobe_sign_agreement_id` (text, not null)
  - `signature_status` (text, not null — `pending` | `signed` | `cancelled`)
  - `signer_email` (text, not null)
  - `created_at` (timestamptz, default now)
  - `signed_at` (timestamptz, nullable)
  - `cancelled_at` (timestamptz, nullable)
  - Index on `adobe_sign_agreement_id` (for fast webhook lookups)
- [x] Apply migration via `node tools/run-sql.mjs --app=panda-realty`
- [x] Add Drizzle schema definition for `portalFileSignRequests` in `db/schema.ts`
- [x] Run `npm run typecheck -w panda-realty` — exits 0
- [x] Run `npm run codegen:check` — exits 0
