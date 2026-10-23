# 07-Adobe Sign / 3d — Agreement Creation Flow

Context: Richard marks a shared document as "requires signature" from the admin panel. The app uploads the Drive file to Adobe Sign, creates an agreement with the client's email as the signer, and records the agreement ID in the database.

Parent: [07-adobe-sign.md](../07-adobe-sign.md)

**Prerequisites:** Phase 3b (mock mode) and Phase 3c (DB schema) must be complete first.

---

## Tasks

- [x] Add `createAgreement(fileId, signerEmail)` to `lib/adobe-sign-client.ts` — downloads the Drive file, uploads it to Adobe Sign, creates an agreement, returns `{ agreementId }`
- [x] Add "Send for signature" button to shared file rows in the admin portal controls panel — visible only when no active sign request exists for that file
- [x] Create API route `POST /api/admin/portal-tokens/[portalTokenId]/sign-request` — accepts `{ fileId }`, resolves the client's email from the portal token, calls `createAgreement()`, writes a row to `portal_file_sign_requests`
- [x] Show "Awaiting signature" badge on the file row in the admin panel once an agreement is created (reads `signature_status = 'pending'` from the new table)
- [x] Run `npm run typecheck -w panda-realty` — exits 0
