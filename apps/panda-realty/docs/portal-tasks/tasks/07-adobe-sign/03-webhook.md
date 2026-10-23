# 07-Adobe Sign / 3e — Webhook Handler

Context: Adobe Sign calls our app when a client completes or declines signing. The webhook updates the signature status in the database and optionally saves the signed PDF back to the property's Google Drive folder.

Parent: [07-adobe-sign.md](../07-adobe-sign.md)

**Prerequisites:** Phase 3c (DB schema) and Phase 3d (agreement creation) must be complete first.

---

## Tasks

- [x] Create webhook route `POST /api/webhooks/adobe-sign/route.ts` — public endpoint (no session auth), protected by URL token auth instead
- [x] Validate webhook authenticity: fail-closed URL token (`?token=ADOBE_SIGN_WEBHOOK_TOKEN`) checked with `timingSafeEqual` via SHA-256 hashes; `x-adobesign-clientid` == `EchoSign2` as secondary sanity check
- [x] Parse event type from payload: `AGREEMENT_ACTION_COMPLETED` (signed) or `AGREEMENT_ACTION_DECLINED` / `AGREEMENT_RECALLED`
- [x] On completion: look up sign request by `adobe_sign_agreement_id`, set `signature_status = 'signed'` and `signed_at = now()`
- [x] On decline/cancel: set `signature_status = 'cancelled'` and `cancelled_at = now()`
- [x] On completion: download signed PDF from Adobe Sign and upload to the property's Google Drive folder (named `<original>_signed.pdf`)
- [x] Register the webhook URL in Adobe Sign account settings — one-time manual step; setup note in `docs/AGENT-NOTES.md`
- [x] Run `npm run typecheck -w panda-realty` — exits 0
