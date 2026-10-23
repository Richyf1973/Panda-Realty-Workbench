# Customer Portal — File Storage Options for Richard to Consider

**What this document is about:** The portal needs a place to store the documents you share with clients — contracts, inspection reports, instructions, and so on. We currently use Google Drive for the main app. For the portal, there is a strong case for switching to a different storage approach. This document explains both options in plain English.

---

## Decision — 2026-05-26

**Richard confirmed Option A: Stay on Google Drive.**

Richard's question before confirming: *"as long as you think Google Drive will be robust enough and not a pain to manage."*

See the [How Google Drive Is Baked Into the Portal](#how-google-drive-is-baked-into-the-portal) section below for the full approach, including how file visibility is controlled, how file links are served securely, and why Google Drive is the right fit at this scale.

---

## Important — Files Already in the App

Before choosing a storage approach, it's worth noting that the app already holds two sets of files that belong to each deal:

- **Entity files** — documents linked directly to the client (buyer, seller, or other party) already stored in Google Drive and tracked in the app.
- **Property files** — documents linked to the property itself, also in Google Drive and tracked in the app.

This means the portal does not need its own separate file storage at all. Instead of asking Richard to re-upload documents into a new system, the portal can simply surface the files that are already there — pulling the Drive links that are already recorded in the app and displaying them to the client in their private portal view.

**What this means in practice:**
- Richard manages files exactly as he does today — uploading to a property or entity record in the app.
- The portal automatically reflects the files he chooses to share with that client. No double-handling, no separate upload step.

---

## Quick Summary

| | Option A: Stay on Google Drive | Option B: Move to Amazon S3 |
|---|---|---|
| Already set up | Yes | No — one-time setup needed |
| Cost for typical usage | Free (up to 15 GB) | Free tier to start, then ~AU$0.04/GB/month |
| You can manage files directly | Yes — via Google Drive on your computer | No — files managed through the portal only |
| Per-client access control | Handled inside the app via toggle | Built-in and automatic |
| Reuses existing entity & property files | Yes — no changes needed | No — files would need to be re-uploaded |
| Best for | Keeping everything in one place you already know | A future where the portal has its own dedicated file library |

---

## Option A — Stay on Google Drive

Google Drive is already wired up in the app. Files you upload to a property or entity today land in a Google Drive folder, and the app already tracks those links. The portal reads from the same source — no new storage, no migration, no duplication.

### What changes for the portal

Nothing on the storage side. The portal reads the Drive file links already recorded against the entity and property, and displays only the ones marked as shared with that client. If Richard wants to add a portal-specific document (e.g. a welcome note or set of instructions), he uploads it to the relevant record in the app as he would any other file.

### Pros

- **Nothing new to learn.** You already use Google Drive. Files live in the same place they always have.
- **Reuses what's already there.** Entity files and property files already in the app appear in the portal automatically — no re-uploading.
- **Free for most usage.** Your Google account includes 15 GB at no cost. Upgrades (100 GB for ~AU$3/month, 2 TB for ~AU$14/month) are straightforward if ever needed.
- **Direct access on your end.** You can browse, organise, and manage your files in Google Drive on your desktop or phone, independent of the app.
- **Already integrated.** Less build time on my end since it's already connected.

### Cons

- **Rate limits.** Google Drive's API has hourly limits on how many times files can be fetched. For a small number of clients this is fine, but worth keeping in mind if the portal grows significantly.
- **File previews depend on Google.** Some file types only preview correctly through Google's own viewer — if that ever has issues, clients see errors rather than the file.
- **Google account dependency.** If Richard's Google account has an issue, it affects both the main app and the portal simultaneously. Mitigated by keeping the Google account in good standing.

---

## Option B — Amazon S3 (Dedicated Portal Storage)

Amazon S3 (Simple Storage Service) is the industry standard for storing files in web applications. With S3, each file is accessed via a short-lived private link that expires after a set time — meaning even if a client copies and shares the link, it stops working within minutes.

### What changes for the portal

Portal-specific files would be uploaded to S3 through the app's admin panel. Existing entity and property files in Google Drive would not automatically carry over — they would need to be re-uploaded, or we build a one-way copy from Drive to S3 (additional work).

### Pros

- **Secure by design.** Every file link generated for a client automatically expires (e.g. after 15 minutes). Even if a client forwards the link, it becomes useless shortly after.
- **Per-client isolation is automatic.** Files are organised by client from the start — no risk of one client accidentally seeing another's documents.
- **Purpose-built for programmatic access.** S3 handles millions of files reliably and without rate limits.

### Cons

- **Doesn't reuse existing files.** All the entity and property files already in the app and in Google Drive would not automatically appear in the portal. This is the biggest practical drawback.
- **You can't browse files in a folder on your desktop.** All file management happens through the admin panel — no drag-and-drop from your computer.
- **One-time setup required.** Setting up S3 and connecting it to the app takes several hours of work on my end.
- **Separate from your Google Drive.** Running two separate file stores adds complexity for no meaningful gain at this scale.

---

## Cost Comparison at Your Scale

Assuming ~50 GB of portal documents across all active clients (a generous estimate for a single-agent agency):

| Service | Monthly Cost |
|---------|-------------|
| Google Drive (15 GB free, then Google One 100 GB plan) | AU$0 – AU$3/month |
| Amazon S3 (50 GB stored + typical download traffic) | ~AU$2–4/month |

Both are effectively the same cost at this scale. Cost is not the deciding factor here.

---

## How Google Drive Is Baked Into the Portal

This section documents the agreed technical approach for how Google Drive is integrated into the portal.

### 1. File visibility — "Share with client" toggle

Richard clarified that clients should not see everything in a property or entity folder. Some files are internal (working documents, notes, private correspondence) and some are meant for the client.

Rather than copying files into separate Drive folders, visibility is controlled inside the app:

- Every file recorded against an entity or property in the app gets a **"Share with client" toggle** — on or off.
- When toggled on, the file appears in that client's portal view.
- When toggled off, it stays internal and the client never sees it.
- No Drive folder reorganisation, no duplicated files, no manual copying.

### 2. File access — served through the app, not direct Drive links

A key concern with Google Drive is that raw Drive sharing links can be copied and forwarded by a client to anyone. To prevent this, files are not served as direct Drive URLs in the portal.

Instead, file access is **routed through the app**:

- When a client clicks a file in their portal, the request goes to the app first.
- The app checks that the client's private portal token is valid and that the file is marked as shared with them.
- Only then does the app fetch the file from Google Drive and stream it to the client.
- The client never sees or handles the underlying Drive URL — they only get the file content.

This means a client cannot forward a link to someone else and have it work. The Drive URL stays hidden inside the app at all times.

### 3. Robustness at Richard's scale

Richard asked whether Google Drive is robust enough and won't become a pain to manage. The honest assessment:

- **At Richard's scale — single agent, dozens of active clients, mostly PDFs and contracts — Google Drive is absolutely the right choice.** Rate limits and permission complexity only become a concern if the portal grows to hundreds of simultaneous users hitting files at the same time. Richard is nowhere near that.
- **It won't be a pain to manage** because Richard never touches Drive permissions at all. The app handles everything — Drive is just the storage cabinet in the background. Richard manages files in Drive as he always has, flips a toggle in the app for what clients can see, and that's it.
- **The one genuine caveat** is a Google service outage making files temporarily unavailable. This is rare (a few times a year at most, usually for less than an hour) and would equally affect any other cloud storage option.

### 4. When to reconsider S3

Google Drive remains the right choice unless one of the following happens:
- The portal expands to serve hundreds of simultaneous clients
- Richard needs file links that automatically expire (e.g. for highly sensitive documents)
- The portal grows into a standalone document management system separate from the main app

None of these apply currently. Migration to S3 at a later date is straightforward if needed.

---

## Note — Google Drive + S3 Sync (2026-05-26)

After reviewing the options, Richard asked whether he could continue using Google Drive as his primary filing system and sync it across to S3 so both run in parallel.

This is technically possible but was set aside for the following reasons:

- **It solves a problem that doesn't exist here.** The two options are separate approaches — you pick one for the portal, not both. Google Drive already does the job cleanly at Richard's scale.
- **Sync adds a failure point.** Files syncing between two systems can arrive late, fail silently, or get out of order — meaning a client might open the portal and see an older version of a document while the up-to-date one is still syncing across.
- **No real benefit over just picking one.** If Google Drive is the source of truth, the portal can read from it directly. There is no advantage to also copying everything to S3.

**Conclusion:** Stay on Option A (Google Drive only). If the portal grows to a scale where S3 becomes necessary, migrating at that point is straightforward.

---

*Prepared: 2026-05-26 | For: Richard (portal storage decision) | Related: [Customer Portal Investigation](../../docs/richard-customer-portal-investigation.md) · [Login Options](customer-portal-login-options.md) (Richard chose Option C — Private Link)*
