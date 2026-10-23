# 06-Messaging / 01 — Database Schema

Context: Create the `portal_messages` table to store two-way messages between Richard and portal clients.

Parent: [06-messaging.md](../06-messaging.md)

---

## Schema design

```
portal_messages
  portalMessageId   bigint PK identity
  portalTokenId     bigint FK → portal_tokens (cascade delete)
  senderRole        text CHECK ('agent' | 'client')
  body              text NOT NULL
  sentAt            timestamp default now()
  readAt            timestamp nullable  -- set when the other party reads it
```

---

## Tasks

- [ ] Run SQL to create `panda_realty.portal_messages` table with columns above
- [ ] Add drizzle schema definition to `apps/panda-realty/db/schema-portal.ts`
- [ ] Add index on `portalTokenId, sentAt DESC` for efficient thread queries
- [ ] Run `npm run typecheck -w panda-realty` — exits 0
