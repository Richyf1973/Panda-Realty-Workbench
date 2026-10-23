# Customer Portal — Deep Viability Review

**Purpose:** A thorough review of every decision made so far — technical gaps, business logic gaps, missing questions, and what needs to be resolved before building starts. Conducted 2026-05-26.

---

## Overall Status

| Area | Status | Effort to resolve |
|------|--------|-------------------|
| Private link auth | ✅ Viable — small gap | Low |
| Google Drive file serving | ✅ Viable — already works | Low |
| Condition timeline | ⚠️ Viable — one data gap | Low |
| Two-way messaging | 🔴 Not built — significant work | Very High |
| Adobe Sign integration | 🔴 Not built — significant work | Very High |
| Seller portal experience | ✅ Fully decided — 2026-05-27 | High |
| Multi-property clients | ❓ Not discussed — decision needed | Low |

---

## 1. Private Link Auth (Token-Based)

### What we decided
Each client gets a unique private URL. The token maps to their entity and property in the database. No login screen.

### What already exists
The `offerFormTokens` table already does exactly this — UUID token, links to `propertyEntityId` and `propertyListId`, unique constraint prevents collisions. The offer form already works this way in production.

### Gaps found

**Gap 1 — No token expiry or revocation (Low effort to fix)**
Tokens live forever. There is no expiry date and no way to deactivate a token without deleting the database row. If a deal falls through and Richard needs to cut off a client's portal access, there is no mechanism today. We need to add a simple `revokedAt` timestamp column — when set, the portal rejects the token and shows a "this link is no longer active" page.

**Gap 2 — Multi-property clients (Decision needed)**
A buyer can have deals on multiple properties with Richard, meaning they would have multiple tokens — one per deal. This raises a UX question: does a client get a separate portal link per property deal, or one master portal link that shows all their active deals?

- **One link per deal:** Simpler to build. Client manages multiple bookmarks if they have multiple active deals. Consistent with how the offer form already works.
- **One master link per client:** Better experience but significantly more complex — the token would need to map to an entity rather than a property-entity pair, and the portal would aggregate data across all their active deals.

> **Decision needed from Jonathan:** One link per deal, or one master link per client?

**Gap 3 — Cascade deletes**
If a property or entity record is deleted from the app, the portal token is also deleted (cascade). The client's link goes dead immediately with no warning. This is probably the right behaviour but worth knowing — if Richard accidentally deletes a property record, the client's portal access is gone.

---

## 2. Google Drive File Serving

### What we decided
Files are served through the app — clients never see raw Drive URLs. Files already tracked in the app can be toggled as visible to clients.

### What already exists
This is the strongest area technically. The app already:
- Proxies all Drive file access through the server (no client-side Drive URLs)
- Has full OAuth token refresh logic with a 60-second pre-expiry refresh and concurrent-call collapse
- Has resumable upload support
- Enforces a 100 MB file size limit

The portal's file serving is effectively already built — we surface it in the portal UI, add the "Share with client" toggle column to the files table, and filter on it.

### Gaps found

**Gap 1 — No rate limit backoff (Low effort to fix)**
If many Drive API calls fail due to Google's quota limits, the app logs the error but does not retry. At Richard's scale (dozens of clients, occasional file views) this will not be a problem in practice. Worth adding a simple retry with backoff before the portal launches but not a blocker.

**Gap 2 — 100 MB file limit**
Real estate contracts and inspection reports are almost always well under this. Not a concern for Richard's use case, but worth noting in case he tries to share large video walkthroughs.

**Gap 3 — "Share with client" toggle does not exist yet** *(now: two separate toggles)*
The toggle concept is agreed and now expanded: buyers and sellers see different documents. This requires **two** boolean columns — `sharedWithBuyer` and `sharedWithSeller` — on the entity and property files tables, with separate UI controls in the admin panel for each. Straightforward but needs to be explicitly planned as a build task.

---

## 3. Condition Timeline

### What we decided
The portal displays a timeline of condition deadlines (cooling off, finance, building & pest, settlement) computed automatically from the offer on record.

### What already exists
`compute-condition-events.ts` already does the date calculation and handles null day values gracefully — if `financeDays` is null, the finance condition is simply omitted from the timeline. No crash risk.

### Gaps found

**Gap 1 — `contractDate` lives on the property, not the offer (Low effort to fix)**
`compute-condition-events.ts` requires a `contractDate` to calculate all condition deadlines. This date exists on `pandaProperties` (the property record), not on `buyer_offers`. The fix is a database join when loading the portal — fetch the offer's day counts from `buyer_offers` and the `contractDate` from the linked `pandaProperties` record. No new column needed, just a join. Already possible with existing data.

**Gap 2 — No condition status (met / waived / failed)**
The offer records the deadline for each condition but not whether it was satisfied. When a finance condition passes its deadline in the real world, the app has no field to record "finance approved" or "finance waived." The timeline can show deadlines but cannot show outcomes.

This is a product gap that exists in the main app today, not just the portal. Options:
- Build the portal timeline showing deadlines only (no status) — honest and simple
- Add a status field to conditions in the main app — bigger scope, bigger value, not a portal-only change

> **Decision needed from Jonathan:** Show deadlines only in V1, or extend the main app to track condition outcomes first?

**Gap 3 — Multiple offers per property-entity**
There is no unique constraint preventing a buyer from having multiple `buyer_offers` records against the same property (e.g. an original offer, a revised offer). The portal needs to know which one to show. The `isAccepted` boolean exists — portal should show the accepted offer if one exists, otherwise the most recent.

> **Confirm:** Use `isAccepted = true` as the primary filter, fall back to most recent by `createdAt`?

---

## 4. Two-Way Messaging

### What we decided
Both Richard and the client can send messages inside the portal. Richard gets notified when a client replies.

### What already exists
Nothing. There is no messaging table, no comment/thread system, no real-time infrastructure, and no notification pipeline for in-app messages anywhere in the Panda Realty schema.

The app does have an email notification system (used for offer form submissions) — this can be repurposed to notify Richard when a client sends a message.

### What needs to be built

**New database table:** A `portal_messages` table with at minimum: `id`, `portalTokenId` (which deal/client), `senderRole` (agent or client), `body` (text), `sentAt`, `readAt` (nullable — marks when the other side read it).

**Real-time vs polling:** Two options:
- **Polling (simple):** The portal checks for new messages every 30 seconds. No new infrastructure needed. Slight delay between message sent and received. Fine for a low-frequency communication channel like a property deal.
- **Real-time (Supabase Realtime):** Messages appear instantly. Requires enabling Supabase Realtime on the new table and a subscription in the portal UI. More work but the app is already on Supabase so the infrastructure is available.

**Notification to Richard:** When a client sends a message, an email is sent to Richard (reusing the existing mailer). Richard does not need to be in the app to know a message arrived.

> **Decision needed from Jonathan:** Polling or real-time? Polling is faster to build and perfectly adequate for this use case.

### Risk
This is the highest-effort new feature in the portal. It is entirely new infrastructure. Recommend treating this as **Phase 2** — launch the portal with the property summary, conditions timeline, and documents first, then add messaging once the core is stable.

---

## 5. Adobe Sign Integration

### What we decided
Richard already has an Adobe Sign account. The portal will integrate with it so clients can e-sign documents without leaving the portal.

### What already exists
Nothing. No Adobe Sign or any signing service code exists in the codebase. No webhook handler infrastructure. No credentials configured.

### What needs to be built

**Adobe Sign API flow:**
1. Richard selects a document in the admin panel and marks it for signing
2. The app calls the Adobe Sign API to create an "agreement" and gets back a signing URL
3. The client sees the document in their portal with a "Sign" button — clicking it opens the Adobe Sign interface (either embedded in the portal or in a new tab)
4. Adobe Sign calls back to our app via a webhook when the client completes signing
5. The app records the signed status and optionally downloads the signed PDF back to Google Drive

**What's needed:**
- Adobe Sign API credentials added to environment config
- New webhook handler route in the app to receive Adobe Sign callbacks
- New column or table to track document signing state (`agreementId`, `status`, `signedAt`)
- UI in the portal to show signing status and trigger the sign flow

### Risk and important questions

**Question — Which Adobe Sign plan does Richard have?**
Adobe Sign's API access is only available on certain plans (Standard and above). The Acrobat Standard plan does not include API access. If Richard is on a basic plan, he would need to upgrade before integration is possible.

> **Action needed:** Richard should confirm which Adobe Sign plan he is on and whether API access is included.

**Risk:** Like messaging, this is entirely new infrastructure. Recommend **Phase 2** alongside messaging, or **Phase 3** after messaging is stable. The portal is fully usable for documents, timeline, and communication without signing — signing can follow.

---

## 6. Seller Portal Experience — Fully Decided (2026-05-27)

All decisions confirmed via Telegram Q&A on 2026-05-27. See [customer-portal-seller-questions.md](customer-portal-seller-questions.md) for the full decision record.

| Decision | Answer |
|----------|--------|
| Layout | Same structure as buyer (property summary, conditions timeline, documents, messages) |
| Sale price | Shown to seller |
| Document toggles | Separate "Share with buyer" and "Share with seller" per file |
| Offers shown | All-time — every offer ever received on the property across all deals |
| Messaging | Completely separate threads (buyer ↔ agent, seller ↔ agent) |
| Link generation | From seller's entity/contact record |
| Contract crash — old buyer | Link goes dead immediately |
| Contract crash — seller link | New link generated for each new deal |
| Contract crash — buyer file toggles | Reset to off for each new buyer |
| Contract crash — seller timeline | Auto-updates to new buyer's conditions |

### Technical notes
- Sellers are already in `propertyEntities` via `isOriginalOwner` — the existing token system supports them without schema changes
- The conditions timeline pulls from the accepted `buyer_offer` linked to the property; the seller sees the same calculation
- "All-time offer history" requires showing all `buyer_offers` records for the property, not just the current accepted one
- The `sharedWithPortal` boolean planned in Phase 1 is now two columns: `sharedWithBuyer` and `sharedWithSeller`

---

## 7. Phasing Recommendation

Given the effort levels, a phased approach is strongly recommended:

### Phase 1 — Core portal (build now)
- Private link generation and revocation
- Property summary section
- Conditions timeline (deadlines only, no status)
- Documents section with "Share with client" toggle
- Admin controls: generate link, revoke link, toggle file visibility, see last-opened timestamp

### Phase 2 — Communication
- Two-way messaging with email notification to Richard
- Real-time or polling (decide before starting)

### Phase 3 — Signing
- Adobe Sign integration (after confirming Richard's plan includes API access)

### Phase 4 — Sellers + multi-deal clients
- Seller portal experience
- Multi-property client aggregation (if decided)

---

## Decisions Still Needed Before Phase 1 Build

| # | Question | Who decides |
|---|----------|-------------|
| 1 | One portal link per deal, or one master link per client? | Jonathan |
| 2 | Condition timeline: show deadlines only in V1, or add condition status to the main app first? | Jonathan |
| 3 | Multiple offers per property-entity: confirm filter logic (`isAccepted` first, then most recent)? | Jonathan |
| 4 | ~~Is the portal buyer-only in V1, or does it need to serve sellers too?~~ | ✅ Resolved 2026-05-27 — sellers get their own portal |
| 5 | Which Adobe Sign plan does Richard have — does it include API access? | Richard to check |
| 6 | ~~Messaging: polling (simpler, Phase 2) or real-time (Supabase Realtime, Phase 2)?~~ | ✅ Resolved — polling decided |

---

*Review conducted: 2026-05-26 | Related: [Portal Investigation](../../docs/richard-customer-portal-investigation.md) · [Proposed Design](customer-portal-proposed-design.md) · [Storage Options](customer-portal-storage-options.md) · [Questions for Richard](customer-portal-richard-questions.md)*
