# Portal Calendar Sharing + Booking + Notifications — Handoff

**App:** `panda-realty` · **Status:** Requirements agreed with client, NOT yet built · **Last updated:** 2026-06-10

This document captures a feature discussion held with the client (Richard) over Telegram, the
decisions reached, the Twilio cost research, the accounts/credentials inventory, and what is still
open. It is written so a fresh agent can continue with no prior context.

---

## 0. How this work is happening (process)

- This is being driven through the **`/reply-richard`** workflow: the agent reads Richard's latest
  Telegram messages, investigates the codebase to stay grounded, and drafts **client-ready replies**
  for the operator (Jonathan, the sole developer) to copy-paste back to Richard.
- **Read the Telegram thread with:**
  ```
  cd "C:\Users\ACER\Desktop\web-development\portfolio"; python telegram_reader.py --read "richard" --limit 30
  ```
- **Reply style rules (non-negotiable — see `.claude/commands/reply-richard` / the `reply-richard` skill):**
  - Do not address him by name.
  - No em dashes. No exclamation marks. No emoji.
  - First person singular for anything on the developer's side ("I", "my end", "on my side").
    **Never** use "we" / "our" — there is only one developer.
  - Address Richard directly as "you" (he runs the business himself, no team).
  - Clarifying questions: open-ended, each in its own short paragraph, no numbering, no A/B/C options.
    End on the last question, no forced closing line.
  - Plain English, no technical jargon unless Richard used it first.

---

## 1. The feature (what Richard wants)

Trigger: Richard sent a screenshot of the **Add Meeting** dialog (title "Viewing", a buyer
"Louisa Hammerslag" attached) with the note: *"I would like to add this calendar event to the
sellers portal."* The discussion expanded from there into a full calendar-sharing + booking feature.

### 1a. Share calendar events into the portals
- **Every** calendar event added on a property shows in the portals **by default**.
- There is a **per-side on/off switch** so an event can be withheld. Seller side and buyer side are
  controlled **independently** (Richard: *"set each side on its own"* — he wants the ability to share
  specific info to individuals if needed).
- What the portal shows for each event: the **date/time** plus a **description**. The description is
  text the agent **deliberately types to share**. Internal notes stay internal and are **not** shown.
  If extra detail is to be shared, it is written into the shareable description at the time, **not**
  drawn from the internal Notes field.
- No buyer names, no internal specifics leak to the other side.
- Applies to all events on that specific property.

### 1b. Portal access + layout
- Today only **successful** buyers are invited to a portal. Richard wants **all prospective buyers**
  included in the calendar sharing.
- Decision: give prospective buyers the **full portal** (not a stripped calendar-only view), with the
  **calendar as the first thing they land on**.
- **Layout change across ALL portals (seller + buyer):** Calendar and Messaging both sit **at the top,
  equally accessible**, ready to interact with on open.

### 1c. Booking / scheduling (the "request a time" flow)
- After an initial (offline) conversation with the buyer, the agent (Richard) **sets some initial
  proposed times** and an **invitation** goes out requesting a time.
- **Both seller and buyer choose** from the offered times on the invitation (collaboration between the
  parties; the agent seeds the first times).
- If none of the offered times suit, there is a **"find another date"** option that kicks it back to
  Richard to offer a fresh set.
- **Conflict resolution:** if the seller and buyer pick **different** slots, the **nearest available
  time slot is auto-chosen** (Richard: *"I would imagine that the nearest available time slot would be
  chosen."*).
- **OPEN / unconfirmed:** Jonathan asked whether Richard wants a **heads-up note** when the
  auto-resolution lands on a slot the other party did not actually tick. Richard leaned toward letting
  it settle on its own but has **not explicitly confirmed** this nuance. Confirm before building.

### 1d. Notifications
- **Email** notification is required for **all** portal updates (email infra already exists — sends via
  the connected Gmail account, see `lib/portal-notifications.ts`).
- **SMS** via Twilio as an **optional** extra, with **per-update control** over which updates send a
  text (Richard wants to choose what triggers a text).
- SMS is **no-reply** (goes out under a sender name, not a rented number). The text **points the
  recipient back into the portal** to reply, since messaging already lives in the portal.

---

## 2. Twilio (SMS) — cost research (current as of June 2026)

Source: Twilio AU SMS pricing page `https://www.twilio.com/en-us/sms/pricing/au` and ACMA Sender ID
Register info.

- **Outbound SMS to an AU mobile:** USD **$0.0515** per message segment (~5 US cents, ~8 AUD cents).
  One text = up to 160 characters; longer messages count as multiple segments.
- **Alphanumeric Sender ID (the chosen no-reply route):** **free**, no monthly rental.
- **Number rental (only needed for two-way / replies):** ~USD **$8.25/month** — **NOT** being used.
- **Rough volume feel (AUD):** 50 texts ≈ $4 · 200 ≈ $16 · 500 ≈ $40.
- **Australia SMS Sender ID Register:** registering the sender name is **mandatory from 1 July 2026**.
  It is tied to the **business ABN**, registered inside the **account owner's (Richard's) Twilio
  console**, using his business details. **No government charge.** The developer can do the technical
  setup but the registration is under **Richard's** business/identity.
- **Decision:** Richard sets up his **own** Twilio account/subscription (so billing and ownership sit
  with him). Developer only needs the **access keys** from his account to wire it in.

> Correction already sent to Richard: an earlier message implied "I will handle the registration on
> your behalf." That was softened — the registration is tied to his business/ABN and his own account;
> the developer handles the technical setup and walks him through the fields, but it lives under him.

---

## 3. Accounts / credentials inventory

Richard asked: *"apart from the hosting side of the app are there any other features we are accessing
in the app which utilises your credentials or subscriptions?"* Full grounded answer below (verified
against `apps/panda-realty/.env.example` and the calling code).

### On the developer's (Jonathan's) accounts
| Service | What it powers | Cost | Notes |
|---|---|---|---|
| **Vercel** | Hosting | Hosting plan | Developer's account |
| **Supabase** | Database, auth, file storage | Supabase plan | `DATABASE_URL`, `SUPABASE_*` |
| **OpenRouter** | AI **business-name lookup** in the Add Contact dialog (finds phone/email/address from a name) | Pay-as-you-go ~$0.005–0.01/search | `OPENROUTER_API_KEY`; model `anthropic/claude-haiku-4.5:online`. Code: `app/api/admin/places/search/route.ts` |
| **Google Cloud OAuth app** | The app registration (client ID/secret) behind **all** Google features: Gmail lead import, sending portal alert emails, Google Contacts sync, Google Calendar sync, Google Drive file storage | Free to run | `GOOGLE_CLIENT_ID/SECRET`. The OAuth *app* is the developer's; the Google *account* it connects to is Richard's. This is the item most easily missed. |

### Already on Richard's own accounts
- **Adobe Sign** (e-signature) — his Creative Cloud Pro account (`applications@mypandarealty.com.au`,
  AU1 API). See `.env.example` Adobe Sign section.
- **The connected Google / Gmail account** — the mailbox, calendar, contacts and Drive that the app
  reads and writes are all his (`mypandarealty.com.au`).
- **Twilio** (texts) — being set up under his account now.

### Free, no key, no account at all
- **Address search + map:** OpenStreetMap **Nominatim** (autocomplete, geocoding, reverse geocode to
  suburb/state/postcode) + **OSM tiles**. No API key, no subscription.
  Code: `app/api/streets/*`, tiles in `components/admin/property-map-filter-map.tsx`
  (`https://{s}.tile.openstreetmap.org/...`).
  - **NOTE / correction:** the "address search" is **free** (no key). The API key the operator was
    thinking of (OpenRouter) is the **business-name lookup**, a different feature.

### Offer made to Richard
Offered to **migrate the developer-side services (Vercel hosting, Supabase, OpenRouter, Google Cloud
OAuth) onto Richard's own accounts**, the same way Twilio is going, so every part of the app sits under
him, billing comes straight to him, and nothing depends on the developer's accounts staying in place.
Awaiting his decision.

---

## 4. Current status / what is pending

**Nothing in this feature is built yet.** It is all at the requirements + approval stage.

Awaiting from Richard:
1. **Booking conflict nuance** (§1c): confirm whether he wants a heads-up when auto-resolution picks a
   slot a party did not tick.
2. **Migration offer** (§3): whether to move the developer-side services onto his own accounts.
3. **Go-ahead to build.** He asked for a *cost breakdown for approval before any work*. The **ongoing
   text running cost** has been delivered (§2). A **build quote** (one-off dev time) has **not** been
   given because **there is no hourly rate recorded anywhere in the repo** — the operator must supply
   their rate (or quote the build themselves from an hours estimate). Confirmed with the operator that
   Richard's "cost breakdown" ask referred to the **Twilio running cost**, which is covered, so a
   formal build quote may not be required right now.

Most recent messages sent to Richard (already delivered):
- The Twilio cost breakdown (with the corrected registration line).
- The accounts/credentials inventory + the migration offer.

---

## 5. Key codebase references

- **Add Meeting dialog** (admin, ties a meeting to a property + optional buyer, syncs to Google
  Calendar): `app/admin/properties/board/add-meeting-dialog.tsx`
- **Add Calendar Event dialog** (admin): `components/admin/add-calendar-event-dialog.tsx`
- **Seller portal panel** (admin side, token generate/revoke/send-link, contract crash):
  `components/admin/property-seller-portal-panel.tsx`
- **Seller portal tabs** (current tabs: Summary, Conditions, Documents, Offers, Messages, Uploads — no
  Calendar yet): `app/portal/seller/[token]/_components/seller-tabs-client.tsx`
- **Seller summary tab:** `app/portal/seller/[token]/_components/seller-summary-tab.tsx`
- **Buyer portal:** under `app/portal/[token]/` and `app/portal/seller/` siblings; buyer portal
  send-link + "Open portal" already exist.
- **Portal email notifications** (sends via connected Gmail): `lib/portal-notifications.ts`
- **Business-name lookup (OpenRouter):** `app/api/admin/places/search/route.ts`
- **Address autocomplete / geocoding (Nominatim, free):** `app/api/streets/route.ts`,
  `app/api/streets/autocomplete/route.ts`, `app/api/streets/lookup/route.ts`
- **Map (Leaflet + OSM tiles):** `components/admin/property-map-filter-map.tsx`
- **All env / credentials:** `apps/panda-realty/.env.example`
- **Meeting scheduling timezone:** fixed in code to `Australia/Brisbane`
  (`lib/meeting-scheduled-at.ts`).

---

## 6. Implementation notes for whoever builds this

When the build is approved, expect to touch (at minimum):
- A **portal Calendar view/tab** for both seller and buyer portals, surfaced at the **top** alongside
  Messaging (layout change to `seller-tabs-client.tsx` and the buyer equivalent).
- A **share-to-portal model** on calendar events: per-event, per-side (seller/buyer) visibility flags,
  plus a separate **shareable description** field distinct from internal notes.
- A flow to **invite prospective buyers** into the full portal (today only successful buyers get a
  token — see the portal-token system and `property-seller-portal-panel.tsx` patterns).
- A **booking/invitation** model: proposed time slots, per-party selection, "find another date",
  nearest-slot auto-resolution.
- **Notification fan-out:** email (existing Gmail path in `lib/portal-notifications.ts`) plus a new
  **Twilio SMS** sender (no-reply, alphanumeric sender ID), with per-update opt-in toggles. Twilio
  credentials will come from **Richard's** account.
- Follow repo conventions: read `CLAUDE.md`, use `/run-sql` for migrations (not drizzle-kit push), and
  the galaxy testing/E2E skills. Confirm the open items in §4 before writing code.
