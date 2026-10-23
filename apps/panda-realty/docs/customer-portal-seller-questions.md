# Customer Portal — Seller Portal Questions

Following your confirmation that **sellers also get a portal** — a separate private link, unique to each seller — I need to understand what the seller portal should look like before I build it.

The buyer portal is already designed. Your answers below determine how the seller portal differs from it.

---

## Question 1 — What does the seller see on their portal?

The buyer portal shows: property summary, a conditions timeline (finance deadline, B&P deadline, settlement date), documents, and messages.

A seller's situation is different — they're not the one satisfying conditions, the buyer is. So I need to know what a seller actually needs to see when they open their portal.

**Option A — Same structure as the buyer portal (property summary, timeline, documents, messages)**
The seller sees everything the buyer sees, including the buyer's condition deadlines (finance, building & pest, etc.).
- Seller stays fully informed of where the deal stands
- Less design work — one layout for both

**Option B — Simpler seller-specific layout (property summary, key dates only, documents, messages)**
The seller sees the property they're selling, the key milestone dates (contract date, unconditional date, settlement), documents you've shared with them, and messages. They do NOT see the buyer's condition breakdown.
- Cleaner — only shows what's relevant to a seller
- Avoids confusion ("why does it show 'finance approval' — isn't that the buyer's problem?")

> **Your answer:** Option A or Option B?

---

## Question 2 — Does the seller see the sale price on their portal?

**Option A — Yes, show the price**
It's their property and they agreed the price — showing it makes sense and helps them feel informed.

**Option B — No, leave price out**
Price is left out of both the buyer portal and seller portal — keeps things simple and avoids any awkwardness.

**Option C — Show price to seller only, not to buyer**
The seller sees the agreed sale price; the buyer portal does not show it.

> **Your answer:** Option A, B, or C?

---

## Question 3 — Do buyer and seller see different documents?

Currently I have planned a single "Share with client" toggle per file — when you turn it on, the file appears in the portal. But if buyers and sellers are getting separate portals, they may need to see different documents.

For example: you might want to share the building inspection report with the buyer but not the seller. Or share the vendor disclosure statement with the seller but not the buyer.

**Option A — Separate toggles: "Share with buyer" and "Share with seller" per file**
Each file has two switches — one for buyer visibility, one for seller visibility. Full control over who sees what.
- Maximum flexibility
- Slightly more work in the admin panel (two toggles per file instead of one)

**Option B — One toggle per file, shown to both buyer and seller**
When you share a file, both buyer and seller can see it. You manage one switch per file.
- Simpler admin experience
- No way to share something with one side but not the other

**Option C — Completely separate file lists per portal**
The buyer portal and seller portal each have their own independent set of documents. You upload and share files separately for each.
- Maximum isolation
- More admin work — you manage two separate document areas

> **Your answer:** Option A, B, or C?

---

## Question 4 — Does the seller see offers on their portal?

The buyer portal doesn't show offers (the buyer already knows what they offered). But for the seller, it might be useful to see a summary of the offers received.

**Option A — No offers shown**
The seller's portal focuses on the current deal only — no offer history shown. If they want to know about other offers, they call you.
- Simple and clean
- Avoids any potential sensitivity around showing competing bids

**Option B — Show the accepted offer only**
The seller sees the accepted offer amount and date. Nothing about declined offers.
- Keeps the seller informed of the deal without showing the full picture

**Option C — Show all offers received**
The seller sees every offer that came in, which was accepted, and the amounts.
- Full transparency
- May create awkward questions ("why did you reject the higher offer?")

> **Your answer:** Option A, B, or C?

---

## Question 5 — Messaging: are buyer and seller message threads kept completely separate?

When a buyer sends a message through their portal, does the seller ever see it — or are these completely private, separate conversations?

**Option A — Completely separate (buyer talks only to you, seller talks only to you)**
Each portal has its own private message thread with you. The buyer never sees the seller's messages and vice versa.
- Private and clean
- Standard expectation for both sides

**Option B — Shared thread (both buyer and seller see the same conversation)**
One message thread for the whole deal — buyer, seller, and you all see the same messages.
- Unusual and potentially problematic (parties can see each other's private questions to you)
- Not recommended

> **Your answer:** Option A or Option B?

---

## Question 6 — Where do you generate the seller portal link?

When you want to give a seller their portal link, where would you expect to do it in the app?

**Option A — From the property record (same place you manage the property)**
On the property page in the admin panel, there's a "Seller Portal" section where you generate the link for the seller(s) of that property.
- Natural — the seller is associated with the property they're selling

**Option B — From the seller's entity/contact record**
On the seller's contact page, there's a "Portal Access" section where you generate their link.
- Natural if you think of it as "giving a contact their link"

**Option C — Both — accessible from either the property or the contact**
The link can be generated and managed from the property page OR the seller's contact page — whichever you happen to be on.
- Most convenient but slightly more to build

> **Your answer:** Option A, B, or C?

---

## Decisions — 2026-05-27

| Question | Decision | Date |
|----------|----------|------|
| Seller portal layout | **Option A** — Same structure as buyer (property summary, conditions timeline, documents, messages) | 2026-05-27 |
| Sale price visibility | **Option A** — Yes, show the sale price to the seller | 2026-05-27 |
| Document visibility | **Option A** — Separate "Share with buyer" and "Share with seller" toggles per file | 2026-05-27 |
| Offers shown to seller | **Option C** — Show all offers received (amounts, which was accepted) — full transparency | 2026-05-27 |
| Messaging separation | **Option A** — Completely separate threads (buyer ↔ you, seller ↔ you) | 2026-05-27 |
| Where to generate seller link | **Option B** — From the seller's entity/contact record | 2026-05-27 |

---

## Additional Requirement — Contract Crash (2026-05-27)

> "If the contract crashes then we need to be able to set up a new portal for the next buyer and the previous buyer can no longer see the contents. The originals buyers folder should stay in tact and the access could also stay in tact for newest buyer however, obviously the old buyer can only see the old folder and visa-vera."

**What this means technically:**
- When a deal falls through and a new buyer is found for the same property, the old buyer's portal token is revoked
- The old buyer's documents and history are preserved — not deleted
- The new buyer gets a fresh portal token and a fresh document set (they cannot see the old buyer's files)
- The seller's portal presumably stays active and reflects the current active deal

---

## Follow-up Questions — Contract Crash Scenario

Your note about what happens when a contract crashes raised a few details that need to be pinned down before this can be built.

---

### Follow-up 1 — What does the old buyer see after their deal crashes?

When a contract falls through and the link is revoked, what happens if the old buyer opens their portal?

**Option A — Link goes dead ("this link is no longer active")**
The old buyer opens their bookmark and sees a clear message that the link has expired. They can no longer view any content.
- Clean and unambiguous
- Old buyer cannot accidentally see anything about the new deal

**Option B — Link stays open, frozen as-is**
The old buyer can still open their portal but everything is read-only and locked at the moment the deal fell through. No new content, no updates.
- Old buyer retains access to documents you shared with them
- Slightly more complex to build (frozen state vs. hard revoke)

> **Your answer:** Option A or Option B?

---

### Follow-up 2 — When you look at offers in the seller's portal, which deals are included?

You chose to show all offers received on the seller's portal. But when a contract crashes and a new buyer comes along, does the seller see offers from all deals or only the current one?

**Option A — Current deal only**
The seller only sees offers from the active contract. Once a deal crashes and a new one starts, the offer history resets.
- Cleaner — no confusion from historical bids

**Option B — All-time offer history**
The seller sees every offer ever received on the property across all deals, past and present.
- Full transparency — seller sees the complete picture of all interest received

> **Your answer:** Option A or Option B?

---

### Follow-up 3 — Does the seller keep the same portal link when a new buyer comes in?

When a contract crashes and a new buyer is found, what happens to the seller's link?

**Option A — Seller keeps the same link, it updates automatically**
The seller's portal just reflects the current active deal — conditions, buyer offers, documents all update in place. Same bookmark, new deal content.
- No hassle for the seller — they don't need a new link each time

**Option B — Seller gets a new link for each new deal**
When a new buyer is found, you generate a fresh seller portal link. The old link goes dead.
- More manual work each time a new buyer comes in

> **Your answer:** Option A or Option B?

---

### Follow-up 4 — Does the seller's conditions timeline update automatically when a new buyer takes over?

The seller's portal shows the conditions timeline (finance, building & pest, settlement) pulled from the accepted buyer's offer. When a new buyer comes in with different condition days, does the seller's timeline update on its own?

**Option A — Yes, updates automatically to reflect the new buyer's conditions**
As soon as a new offer is accepted, the seller's timeline shows the new buyer's deadlines.
- No manual work on your end

**Option B — You control when the seller's timeline refreshes**
The timeline only updates when you trigger it — gives you a chance to review before the seller sees the new conditions.
- More control but more steps when a new deal starts

> **Your answer:** Option A or Option B?

---

### Follow-up 5 — When a new buyer starts, does the "Share with buyer" file toggle reset?

You chose separate "Share with buyer" and "Share with seller" toggles per file. When a contract crashes and a new buyer comes in, what happens to those buyer toggles?

**Option A — Resets to off — you decide what to share with the new buyer from scratch**
Every file's "Share with buyer" toggle goes back to off when a new buyer's deal begins. You explicitly choose what the new buyer sees.
- Deliberate — no risk of accidentally sharing the wrong files with the new buyer

**Option B — Carries over from the previous buyer**
Whatever was shared with the old buyer is automatically shared with the new one.
- Less work but higher risk of the new buyer seeing documents meant for the old deal

> **Your answer:** Option A or Option B?

---

## Follow-up Decisions — 2026-05-27

| Question | Decision | Date |
|----------|----------|------|
| Old buyer after crash — link dead or frozen? | **Option A** — Link goes dead immediately ("this link is no longer active") | 2026-05-27 |
| Seller offer history — current deal or all-time? | **Option B** — All-time: seller sees every offer ever received on the property across all deals | 2026-05-27 |
| Seller link — same link updates or new link per deal? | **Option B** — New link generated for each new deal; old seller link goes dead | 2026-05-27 |
| Seller timeline — auto-updates or manual trigger? | **Option A** — Auto-updates as soon as a new offer is accepted | 2026-05-27 |
| Buyer file toggles on crash — reset or carry over? | **Option A** — Resets to off; you explicitly choose what to share with the new buyer | 2026-05-27 |

---

*Prepared: 2026-05-27 | Part of: Customer Portal — Seller Experience | Related: [Portal Investigation](../../docs/richard-customer-portal-investigation.md) · [Buyer Questions](customer-portal-richard-questions.md) · [Proposed Design](customer-portal-proposed-design.md)*
