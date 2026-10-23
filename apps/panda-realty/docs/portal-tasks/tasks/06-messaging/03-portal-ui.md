# 06-Messaging / 03 — Portal Client UI

Context: The client-facing messaging section in the portal — a simple thread view with a send form. Uses polling (fetch every 30s) unless the Realtime decision changes.

Parent: [06-messaging.md](../06-messaging.md)

---

## Tasks

- [ ] Build `PortalMessages` component in `apps/panda-realty/app/portal/[token]/_components/messages.tsx`
- [ ] Fetch thread on mount via `GET /api/portal/[token]/messages`
- [ ] Poll every 30 seconds to check for new messages from Richard (or swap for Supabase Realtime subscription if that decision is made)
- [ ] Render agent messages left-aligned, client messages right-aligned
- [ ] Show `sentAt` as relative time ("2 minutes ago") on each bubble
- [ ] Show unread indicator on agent messages not yet marked read
- [ ] Build send form — textarea + send button; POST to `/api/portal/[token]/messages`; optimistically appends message to thread on success
- [ ] Empty state: "No messages yet. Send a message to Richard below."
- [ ] Run `npm run typecheck -w panda-realty` — exits 0
