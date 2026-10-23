# 07 — Adobe Sign Integration

Context: Allow Richard to send documents for formal legal e-signature directly from the portal. Clients sign via Adobe Sign's hosted page (opens in a new tab); the signed PDF is saved back to Google Drive. Built incrementally across 8 sub-phases so each can be tested before the next starts.

Parent: [task-list.md](../task-list.md)

---

## Phase 3a — Credentials, client wrapper, health monitoring ✅

- [x] Confirm API access is available on Richard's plan (Creative Cloud Pro — confirmed 2026-05-29)
- [x] Obtain IMS session credentials via Playwright; store in `.env.local` and `.env.example`
- [x] Create `lib/adobe-sign-client.ts` — `getAccessToken()` (IMS silent flow) + `checkAdobeSignHealth()`
- [x] Daily health cron `app/api/cron/adobe-sign-health/route.ts` — emails alert if session is broken
- [x] Admin banner `components/admin/adobe-sign-health-banner.tsx` — shown at top of every admin page when Sign is broken
- [x] Register cron in `vercel.json` (runs 8am UTC daily)

**Auth note:** Richard's account is on Creative Cloud Pro with Sign integrated into DC Web — the classic OAuth app admin is inaccessible. Auth uses IMS implicit flow (`prompt=none`) with the `ims_sid` session cookie. When the session expires (typically weeks), re-run the Playwright setup to refresh `ADOBE_SIGN_IMS_SID` in env.

---

## Phase 3b — Mock mode + sandbox

→ [sub-tasks](./07-adobe-sign/06-mock-and-sandbox.md)

---

## Phase 3c — DB schema

→ [sub-tasks](./07-adobe-sign/07-db-schema.md)

---

## Phase 3d — Agreement creation (admin initiates signing) ✅

→ [sub-tasks](./07-adobe-sign/02-agreement-creation.md)

---

## Phase 3e — Webhook handler (Adobe Sign calls back on completion) ✅

→ [sub-tasks](./07-adobe-sign/03-webhook.md)

---

## Phase 3f — Status tracking (admin panel) ✅

→ [sub-tasks](./07-adobe-sign/04-status-tracking.md)

---

## Phase 3g — Portal client UI (sign button, status badges) ✅

→ [sub-tasks](./07-adobe-sign/05-portal-ui.md)

---

## Phase 3h — E2E test coverage

→ [sub-tasks](./07-adobe-sign/08-e2e-tests.md)
