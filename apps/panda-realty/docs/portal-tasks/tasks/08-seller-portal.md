# 08 — Seller Portal

Context: Sellers get their own private portal link (separate from the buyer's) giving them a mirror of the buyer experience, plus sale price visibility, all-time offer history, and a dedicated messaging thread with Richard. All decisions are confirmed; ready to spec and build.

Parent: [task-list.md](../task-list.md)

Reference: [Seller Questions + Decisions](../../customer-portal-seller-questions.md)

---

## Decisions (confirmed)

- **Layout:** same structure as buyer portal (property summary, conditions timeline, documents, messages)
- **Sale price:** visible to seller (not shown to buyer)
- **Documents:** separate "Share with seller" toggle per file (existing "Share with buyer" toggle unchanged)
- **Offers:** all-time list of every offer received on the property
- **Messaging:** completely separate threads — buyer ↔ agent and seller ↔ agent are isolated
- **Link generation:** from seller's entity/contact record (not the buyer's)
- **Contract crash:** old buyer link goes dead; seller gets a new link per new deal; buyer file toggles reset to off; seller timeline auto-updates to new buyer's conditions; seller sees full all-time offer history

---

## Phase 1 — Foundation

Spec + token infrastructure + admin entry point. Nothing is visible to the seller yet; this phase wires up the back-end identity and the admin workflow to generate seller links.

- [x] Write spec (`panda-portal-seller.md`) covering all sub-areas and contract crash rules — _spec: [panda-portal-seller.md](../../../../specs/panda-portal-seller.md)_
- [x] Extend portal token system — add `seller` role/type to `portalTokens`; enforce buyer and seller tokens are independent per deal
- [x] Admin controls (seller) — "Generate seller link" from entity/contact record; copy to clipboard, last-accessed display, revoke with confirmation — mirrors buyer admin controls
- [x] Seller portal route + shell layout — `/portal/seller/[token]` page: auth guard, property header, tab nav (same shell structure as buyer)

## Phase 2 — Content Sections

Seller-facing data panels. Each tab should be functional and independently testable by end of this phase.
_spec: [panda-portal-seller-phase2-content.md](../../../../specs/panda-portal-seller-phase2-content.md)_

- [x] Property summary (seller view) — same fields as buyer + sale price row
- [x] Conditions timeline (seller view) — reads existing buyer conditions; scoped to current deal's buyer
- [x] Documents (seller view) — add "Share with seller" toggle per document in admin; seller portal shows only seller-shared files; buyer and seller toggles are independent
- [x] Offers history section — all-time list of offers on the property (date, amount, status); read-only
- [x] Messages tab (seller view) — reuse PortalMessages with seller token UUID; existing role-agnostic messages API works without changes

## Phase 3 — Messaging

Reuse the existing messaging infrastructure; the only new work is isolating the seller thread from the buyer thread.

- [x] Seller messaging thread — scope thread to `seller` portal token; fully isolated from buyer thread in both API queries and UI; Richard sees both threads in admin under separate tabs — _spec: [panda-realty-seller-portal-phase3-messaging.md](../../../../specs/panda-realty-seller-portal-phase3-messaging.md)_

## Phase 4 — Contract Crash

Cross-cutting behaviour that ties the earlier phases together when a deal falls through and a new buyer enters.

- [x] Contract crash handler — when deal is replaced: mark old buyer token revoked; reset all "Share with buyer" document flags to off; create new seller token for new deal; seller conditions timeline re-reads new buyer's conditions; seller offer history still shows all-time records — _spec: [panda-realty-seller-portal-phase4-contract-crash.md](../../../../specs/panda-realty-seller-portal-phase4-contract-crash.md)_

## Phase 5 — QA

- [x] E2E tests — happy path for each section (property summary, timeline, documents, offers, messaging) plus contract crash scenario
- [x] Run `npm run typecheck -w panda-realty` — exits 0
