# Customer Portal — Master Task List

One-sentence context: Build a client-facing portal for Panda Realty where Richard's clients (buyers and sellers) access property documents, condition timelines, and communicate with Richard via a private bookmark link — no login required; buyers and sellers each get a separate unique link.

Related: [Portal Investigation](../../../docs/richard-customer-portal-investigation.md) · [Viability Review](../customer-portal-viability-review.md) · [Proposed Design](../customer-portal-proposed-design.md)

---

## Phase 1 — Core Portal

- [x] New portal token system (separate from offer form tokens) → [sub-tasks](./tasks/01-portal-token-system.md) — _spec: [panda-portal-token-system.md](../../../specs/panda-portal-token-system.md)_
- [x] Property summary section → [sub-tasks](./tasks/02-property-summary.md) — _spec: [panda-portal-property-summary.md](../../../specs/panda-portal-property-summary.md)_
- [x] Condition timeline section → [sub-tasks](./tasks/03-condition-timeline.md) — _spec: [panda-portal-condition-timeline.md](../../../specs/panda-portal-condition-timeline.md)_
- [x] Documents section + "Share with client" toggle → [sub-tasks](./tasks/04-documents.md) — _spec: [panda-portal-documents.md](../../../specs/panda-portal-documents.md)_
- [x] Admin controls (generate link, revoke, last-opened) → [sub-tasks](./tasks/05-admin-controls.md) — _spec: [panda-portal-admin-controls.md](../../../specs/panda-portal-admin-controls.md)_

## Phase 2 — Messaging

- [x] Two-way messaging — complete: DB, API, client UI, admin UI, email notification, 20 E2E tests passing → [sub-tasks](./tasks/06-messaging.md) — _spec: [panda-realty-portal-messaging.md](../../../specs/panda-realty-portal-messaging.md)_

## Phase 3 — Adobe Sign

Build incrementally — each sub-phase is independently shippable and tested before the next starts.

- [x] 3a — Credentials, client wrapper, and health monitoring → [sub-tasks](./tasks/07-adobe-sign.md)
- [x] 3b — Mock mode + sandbox (safe testing before touching live account) → [sub-tasks](./tasks/07-adobe-sign/06-mock-and-sandbox.md)
- [x] 3c — DB schema: sign request columns and migration → [sub-tasks](./tasks/07-adobe-sign/07-db-schema.md)
- [x] 3d — Agreement creation (admin sends a document for signing) → [sub-tasks](./tasks/07-adobe-sign/02-agreement-creation.md)
- [x] 3e — Webhook handler (Adobe Sign notifies us when client signs or declines) → [sub-tasks](./tasks/07-adobe-sign/03-webhook.md)
- [x] 3f — Status tracking (admin panel badges, resend reminder, cancel) → [sub-tasks](./tasks/07-adobe-sign/04-status-tracking.md)
- [x] 3g — Portal client UI (sign button, status badges on document rows) → [sub-tasks](./tasks/07-adobe-sign/05-portal-ui.md)
- [x] 3h — E2E test coverage (mock mode Playwright tests + sandbox smoke test) → [sub-tasks](./tasks/07-adobe-sign/08-e2e-tests.md)

## Phase 4 — Seller Portal

- [x] Seller portal experience — all 5 phases complete (52 E2E tests passing, contract crash shipped) → [sub-tasks](./tasks/08-seller-portal.md) — _spec: [panda-portal-seller.md](../../../specs/panda-portal-seller.md)_

## Phase 5 — Client Uploads

- [x] Buyer and seller file uploads — buyers upload via Your Uploads card on buyer portal; sellers upload via Uploads tab on seller portal; Google Drive resumable upload; admin sees uploads in a separate Client Uploads section (no share toggles, agent-delete only); assigned agent notified via Gmail on each upload — _spec: [panda-realty-portal-client-uploads.md](../../../specs/panda-realty-portal-client-uploads.md)_

## Deferred / Open Decisions

- [-] Multi-property client (one link per deal vs master link) — **blocked:** needs Jonathan decision

---

*Last updated: 2026-05-30 — Phase 1 complete (tasks 01–05); Phase 2 complete (two-way messaging shipped, 20 E2E tests passing); Phase 3 complete — 3a (IMS session auth, client wrapper, health cron + admin banner); 3b (mock mode guards + sandbox env wiring, test webhook route, .env.test); 3c (portal_file_sign_requests table migrated + Drizzle schema); 3d (createAgreement real impl, Send for signature UI, sign-request + shared-files API routes, Awaiting signature badge, 9 E2E tests passing); 3e (webhook handler — AGREEMENT_ACTION_COMPLETED/DECLINED/RECALLED, Drive upload of signed PDF, fail-closed URL token auth with timingSafeEqual); 3f (getAgreementStatus/sendReminder/cancelAgreement real impl, sign-status drift-detection route, remind/cancel API routes, admin UI — Signed/Cancelled badges + signedAt date + Remind/Cancel buttons); 3g (portal buyer UI — Sign required badge + Sign document button, GET /api/portal/[token]/sign-url/[fileId] route, Signed ✅ + Cancelled states, 15 E2E tests passing); 3h (8 mock-mode E2E tests passing, session refresh script tools/refresh-adobe-sign-session.mjs, meta-refresh auth bug fix — manual smoke test still pending); Phase 4 seller portal all 5 phases complete; Phase 5 complete — buyer and seller portal file uploads via Google Drive, admin Client Uploads section, Gmail notification on upload*
