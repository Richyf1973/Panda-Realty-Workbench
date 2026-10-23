# Customer Portal — Two Questions for Richard

Before we start building, I need your input on two features of the portal. Both are quick answers — no technical knowledge needed. Your answers directly determine how much work goes into each one.

---

## Question 1 — Messaging

The portal will have a place where you and your client can communicate. I need to know how you see this working.

**Option A — One-way updates (you post, they read)**
You post messages, instructions, or updates into the portal and the client can read them. They cannot reply back through the portal — if they want to respond, they use email or phone as usual.

- Simple to build and simple to use
- Good if the portal is primarily a place you push information to clients, not a back-and-forth channel
- No risk of clients sending you messages you might miss

**Option B — Two-way conversation (both sides can reply)**
Both you and the client can send messages inside the portal. It works like a simple chat thread — you post something, they can reply, you can reply back, and so on.

- More interactive — clients feel they have a direct line to you through the portal
- You would receive a notification (email or app alert) when a client sends a message so you don't miss it
- Slightly more to build, but not significantly

**To help you decide, consider:**
- Do your clients currently ask a lot of questions during a deal that you'd rather handle in one place?
- Or is the portal mainly a place for you to keep them informed, with the real communication still happening via phone and email?

> **Your answer:** Option A or Option B?

---

## Question 2 — Document Signing

The prototype you built included a signature pad where clients can draw their signature on screen. I need to understand what level of signing you actually need.

**Option A — Acknowledgement only ("I have read and understood this")**
The client ticks a box or clicks a button to confirm they have seen and read a document. This is a simple confirmation — not a legally binding signature. Good for things like: confirming they've received instructions, acknowledging a timeline, or confirming they've read a notice.

- Fast to build
- Appropriate for most day-to-day communications
- Not suitable for documents that need to hold up in a legal dispute

**Option B — Lightweight e-signature (drawn signature, stored as a record)**
The client draws their signature on screen (like the prototype showed). The signed document and timestamp are saved. This is a step up from a tick box and provides a reasonable record, but it is not the same standard as a certified legal e-signature service.

- Good for internal records and general agreement documents
- Moderate effort to build
- May not meet the formal requirements for contracts in Queensland real estate

**Option C — Formal legal e-signature (DocuSign / Adobe Sign standard)**
For documents that need to be legally enforceable — such as the sales contract, Form 6, or any document that could be contested — a certified e-signature service is required. These services (DocuSign, Adobe Sign) provide a legally recognised audit trail.

- Legally robust and recognised in Queensland
- Requires a paid subscription to a signing service (DocuSign starts at ~AU$20/month)
- I integrate the service into the portal — Richard and clients don't need a separate account

**To help you decide, consider:**
- What types of documents do you expect clients to sign through the portal?
- Are any of those documents ones that could be disputed or need to hold up in a legal proceeding?
- Do you already use DocuSign or Adobe Sign elsewhere in your business?

> **Your answer:** Option A, B, or C? And if helpful — what specific documents do you expect clients to sign?

## Decisions — 2026-05-26

**Messaging:** Richard chose Option B — Two-way conversation. Both sides can send messages inside the portal.

**Document Signing:** Richard chose Option C — Adobe Sign. Richard already has an existing Adobe Sign account — no new subscription needed.

---

*Prepared: 2026-05-26 | Part of: Customer Portal planning | Related: [Portal Investigation](../../docs/richard-customer-portal-investigation.md)*
