# 01 — Portal Token System

Context: Create a dedicated portal token table (separate from `offerFormTokens` which is for the buyer offer form) that maps a unique private URL to a client entity + property pair. Includes revocation and last-accessed tracking.

Parent: [task-list.md](../task-list.md)

---

## Decisions

- **Separate table** — `portalTokens` rather than reusing `offerFormTokens`. The two serve different purposes and will diverge (portal tokens need revocation + last-accessed; offer form tokens do not).
- **Token format** — UUID (crypto.randomUUID), same as offer form tokens. Unique constraint in DB.
- **One token per entity-property pair** — same scoping as offer form. Multi-property clients get one token per active deal (master-link decision deferred).
- **Revocation** — soft delete via `revokedAt` timestamp. Portal returns a "link no longer active" page when set.

---

## Tasks

- [x] Run SQL to create `panda_realty.portal_tokens` table: columns `portalTokenId` (bigint PK identity), `token` (text unique), `propertyEntityId` (bigint FK → property_entities, cascade delete), `propertyListId` (bigint FK → panda_properties, cascade delete), `revokedAt` (timestamp nullable), `lastAccessedAt` (timestamp nullable), `createdAt` (timestamp default now)
- [x] Add drizzle schema definition for `portalTokens` in `apps/panda-realty/db/schema-portal.ts` (new file)
- [x] Export `portalTokens` from `apps/panda-realty/db/schema.ts`
- [x] Create public portal route `apps/panda-realty/app/portal/[token]/page.tsx` — resolves token, checks `revokedAt`, renders portal shell
- [x] Create portal token GET handler `apps/panda-realty/app/api/portal/[token]/route.ts` — validates token, updates `lastAccessedAt`, returns entity + property data
- [x] Return 410 Gone response when token is revoked; render user-facing "This link is no longer active" page
- [x] Create admin token generation API `apps/panda-realty/app/api/admin/portal-tokens/route.ts` — POST creates token for a given propertyEntityId + propertyListId
- [x] Create admin token revocation API — PATCH sets `revokedAt` on an existing token
- [x] Run `npm run typecheck -w panda-realty` — exits 0
