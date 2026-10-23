# Panda Realty — business logic

Domain notes for **`panda_realty`** (Supabase). Extend this file as you add entities and workflows.

## Properties (`panda_realty.panda_properties`)

- **`is_favorite`**: boolean flag marking a property as a favorite (not null, default false). Editable via the Favorite toggle in the property form beside the Property Status field. Filterable in the list view via the Favorites / Non-favorites / All segment control, which **defaults to Favorites**.
- **Empty list is filter-aware.** Because the Favorites toggle defaults **on**, a persisted Status selection (or any other filter) can AND-combine with it and match zero of the favorited rows, leaving the list empty. When that happens — i.e. the list is empty **and** the active filters differ from the entity defaults — the footer shows **"No matches for the current filters."** with a **Clear filters** button that **resets to defaults** (Favorites back on, Status/search/etc. cleared) rather than the static "No properties yet." label. At pure defaults with genuinely zero rows, the plain label still shows (nothing to clear). This is generic admin behavior (`adminListFiltersDifferFromSegment` + `resetListFiltersToDefaults` in `@repo/admin`), distinct from the toolbar's own Clear filters, which resets the segment to **All**.
- **Map filter bypasses Favorites + Status.** When a map-area filter (`streetFilter`) is active, the properties list **ignores** both the Favorites/Non-favorites segment and the Status filter server-side, so a polygon returns every matching street regardless of those toolbar filters (which would otherwise silently narrow the result — Favorites defaults on). The side-panel Favorites toggle and Status filter also **visibly drop to their off position** while the map filter is on, so the UI matches the bypassed query instead of looking like it is still narrowing. This mirror is **display-only**: the underlying segment / Status selection (and any per-status star/hide state) are untouched, so **clearing the map filter restores the controls exactly as the user left them**. Wired via the generic `listFiltersBypassedByAppendWhereHint` config on the `properties` entity (resolved client-side in `AdminEntityAdmin` → side panel).
- **Map-results table layout (comparable scan view).** While `streetFilter` is active the list renders a **normal one-line comparable table** (not the quick-card panel and not the compact stacked quick table): each property on a single line (no Street/Suburb 2-line wrap), the **Status column is removed** (Street becomes the first frozen/sticky-left data column after the row-locator icons), and the right-side action area shows **only two controls** — the **per-row hide-from-view tick** (tuck a comparable out of the on-screen list while scanning; the "N removed from view — Reset" header note works as elsewhere), then the **locate-on-map button** (re-open the drawn search area with its pin). **Edit, Delete and the overflow menu are removed in map view** (map view is browse-only — to edit/delete a property, clear the map filter to return to the normal list); the call/email/inbox/reminder/note/meeting cluster is also hidden. Comparable columns (bed/bath/car/building/land/price/sold + trailing sale/contract fields) are retained for scanning sales in the drawn area. Scoped to the map view only: the favourites cards, general search, and bed/bath/type-filtered list keep Status and the full icon cluster (incl edit/delete). Wired via `properties-map-results-view.ts` (`streetFilterSegmentActive` + `PANDA_PROPERTIES_MAP_TABLE_COLUMN_KEYS`) for columns, and `buildPropertyListRowActions` (`property-list-row-actions.tsx`) returning `{ pinned: hide tick + map button, collapsible: [], pinnedOnly: true }` when the map filter is active. The shared `AdminEntityRowActions` honours `pinnedOnly` by rendering only the pinned controls (no Edit/Delete/overflow) — see `resolveRowActionsLayout`.

## Property status (`panda_realty.property_status`)

Lookup table for listing lifecycle / visibility on properties (`panda_properties.property_status_id`).

- **`property_status_code`**: short stable code (unique). Drives generated **`slug`** via `slugify(property_status_code)`.
- **`property_status`**: optional human-readable label (nullable in DB).
- **`is_shown_on_favorite`**: whether this status should appear in “favorites” style UIs (default false).

## Contact categories (`panda_realty.contact_categories`)

Lookup table for classifying contacts / entities (`panda_realty.entities.contact_category_id`, nullable FK).

- **`contact_category_name`**: display name (unique, **citext**). Drives generated **`slug`** via `slugify(contact_category_name)`.
- **`slug`**: generated column; do not hand-edit in app logic—derive from name changes in the DB.

## CRM entities (`panda_realty.entities`)

- **Admin UI — create/edit dialog** (`PandaEntitiesDialogForm`, slug **`entities`**): non-buyer categories use name, entity category, email, phone, address fields, and notes. **Buyer** (`entity_categories` id **`1`**) uses a simplified dialog: **Enquiry Name**, contact number, email, **Buyer Members**, **Meeting** / **Reminder** (when a property link exists — same `property_meetings` flows as the pipeline board), and **Property Connections** from **`/admin/entities`**; the main buyer dialog does not collect notes, address lines, or buyer-status checkboxes (those values remain in Postgres when unchanged). Columns **`website`**, **`contact`**, and free-text **`association`** remain nullable in Postgres but are **not** collected in this dialog. When the row is a **contact** (`entity_categories` id **`4`**), the dialog still shows **Contact category** and **Association** as a **Buyer / Seller** (plus **None**) choice backed by **`association`** text; other categories do not show an association control here.

- **Search includes representatives.** Two search surfaces also match a contact's representatives (`panda_realty.entity_members`: `member_name` / `member_email_address` / `member_phone_number`), not just the entity's own columns:
  - **Properties board general search** (`generalSearch` hint → `pandaPropertiesAppendListWhere`, slug `properties`): a property surfaces when a linked entity's representative matches — e.g. searching "Eugene" returns the property linked to contact "McAuley Law" whose rep is Eugene McAuley.
  - **Contacts page** (slug **`contacts`**, route **`/admin/contacts`**): a Contacts-only view of `entities` locked to `entity_category_id = 4`. Its `generalSearch` matches the contact's own name/email/contact/address **OR** any representative — so a rep name finds the parent contact. Entry point is the sidebar **People → Contacts** link; the dialog reuses `PandaEntitiesDialogForm`.

## Property ↔ entity links (`panda_realty.property_entities`)

Junction between a property (`property_list_id`) and an CRM entity (`entity_id`). From a **favorite** property, saved rows on **Property Buyers**, **Property Contacts**, or **Property Tenants** can open a nested **`property-entities`** dialog. When the linked entity’s category is **buyer** (`entity_categories` id `1`), the dialog is the full **buyer workspace** (related collections). For **tenant**, **contact**, or any other category, the dialog is a **junction-only** form (entity async picker, junction note, original-owner flag) so buyer-only tabs are not shown.

### Edit Buyer → Property Connections (inline link)

- On **`/admin/entities`**, editing a **buyer** shows **Property Connections** plus **Link property**: an async search over listings and a **Link** button (no nested “Add new” dialog for this path). Addresses already linked to that buyer are omitted from the picker results; **Link** is disabled when the selected listing is already linked.
- When **Edit Buyer** opens **nested** from **Properties** (buyers / contacts / tenants row), the link-property combobox is **prefilled with that parent listing** for context (including when that listing is already linked — **Link** stays disabled until another property is chosen or the field is cleared).
- **`POST /api/admin/property-entities`** with `propertyListId` requires the property to exist (**404** if unknown) and rejects a duplicate `(entity_id, property_list_id)` pair (**409**). Any listing may be linked (favorite or not).

Buyer workspace (category buyer) edits:

- **`entity_members`**: members for the underlying entity (`entity_id`), keyed off the parent row’s `entity_id` (not `property_entity_id`). Removing the property link does **not** delete members. At most one row per `entity_id` may have **`is_buyers_representative = true`** (partial unique index on `entity_id` where true); the admin API clears other members when a new representative is saved. **`member_address`** stores the buyer’s postal/home address. **`property_to_sell_address`** stores the address of the property the buyer intends to sell to fund the purchase (used in "subject to sale" contract conditions); it defaults to `member_address` in the edit dialog when not yet set, but is stored and displayed independently.
- **`buyer_offers`**: offers for this link (`property_entity_id`). **Offer history rule:** every final public form submission (non-draft POST to `/api/offer-form/:token`) always INSERTs a new row — it never overwrites an existing row. Draft auto-saves (`?draft=true`) do **not** touch `buyer_offers` at all. This preserves a full history of buyer offer amounts. The admin GET endpoint (`/api/admin/property-entities/:id/buyer-offers`) returns all rows ordered by `dateOffered` descending.
- **`property_entity_files`**: URL/path metadata per link (`file_type`, `file_link` text). Files are keyed by **`property_entity_id`** (buyer / contact / tenant workspace). Uploads use **Google Drive** via a two-phase resumable flow (`google_drive_file_id`, public **`file_link`**): **`POST /api/admin/property-entity-files/initiate-upload`** (server gets a Drive upload URI), client XHR-PUTs the file directly to Drive with byte-level progress, then **`POST /api/admin/property-entity-files/record-upload`** persists the Drive metadata. Max file size: **100 MB** (client-side pre-check). **`DELETE /api/admin/property-entity-files/:id`** accepts an optional **`propertyListId`** query param; when present, the server checks that the file’s **`property_entities`** row belongs to that listing before deleting (used from the property dialog **Files** tab aggregate list). **`source` (citext):** Set to `’google_drive’` when the file was imported via the Drive folder sync route; `null` for manually uploaded files.
- **`property_list_files`**: Same Drive-backed shape as **`property_entity_files`**, but keyed by **`property_list_id`** on **`panda_properties`** — listing-level attachments (not tied to a specific buyer/contact/tenant). **`GET /api/admin/property-list-files?propertyListId=`** returns a merged list of property-level rows plus all **`property_entity_files`** for **`property_entities`** on that listing, with a **`sourceLabel`** on each row (**`Property`** vs **`{Entity category} — {entity name}`**). Uploads use the same two-phase resumable flow: **`POST /api/admin/property-list-files/initiate-upload`** → client XHR PUT to Drive → **`POST /api/admin/property-list-files/record-upload`**. **`DELETE /api/admin/property-list-files/:id`** requires a signed-in admin session. On **Add property** before the row exists, the **Files** tab shows a save-first message (no **`propertyListId`** yet). **Client:** property dialog **Files** tab and **`PropertyEntityFilesPanel`** use **`@/lib/file-input-take-files`** so selected files are copied off the live **`FileList`** before the file input is reset for re-pick. **`source` (citext):** Set to `’google_drive’` when imported via Drive sync; `null` for manual uploads. **Drive folder sync:** **`POST /api/admin/property-list-files/drive-sync`** (body: `{ propertyListId }`) locates the property’s Drive folder under `PANDA_DRIVE_PARENT_FOLDER_ID` using `buildPropertyFolderName(street, suburb, state, postcode)`, lists all files at the root of that folder and in subfolders, deduplicates by `googleDriveFileId`, and routes files as follows — **entity subfolders** (subfolder name matches a linked entity name, case-insensitive) → `property_entity_files`; **owner subfolders** (subfolder name matches `owner1name`, `owner2name`, or `owner3name` on the property, case-insensitive, checked only when no entity match) → `property_list_files` with `ownerNum` set to `1`, `2`, or `3`; **unmatched subfolders** → `property_list_files` with no `ownerNum`. All inserted rows get `source = ‘google_drive’`. When re-syncing, files already in `existingDriveIds` that were found in an owner subfolder have their `owner_num` upserted if it is currently `null` (retroactive self-heal on re-sync). Updates **`panda_properties.last_drive_synced_at`** (timestamptz). Returns `{ added: number, syncedAt: string }`. The UI shows a **Sync from Drive** button and a last-synced timestamp; Drive-imported files display a `[Drive]` badge next to their source label.
- **`property_entity_notes`**: one-to-many notes per link; **`created_by`** may be set from the signed-in user on insert.

The legacy single column **`property_entity_note`** on `property_entities` remains for a short junction note; long-form history lives in **`property_entity_notes`**.

### Buyers pipeline stage on the link (`buyer_pipeline_status_id`)

- **Auto “Offer Made”:** When staff enter a **positive** offer amount in **Edit Buyer → Offers** (for that `property_entities` row), the stage moves to **`Offer Made`** (`property_status_code = 'Offer Made'`, `pipeline = 'buyers'`) **without waiting for the main entity Save**, so the Buyers Kanban column updates promptly. The client debounces related-table draft sync (**~400ms**) before issuing that pipeline **PATCH**. When the user later saves the entity, **`buyerOffers`** are still persisted via **`PATCH /api/admin/property-entities/:id`**, which runs the same server guard (`maybeAdvanceBuyerPipelineOnOfferInTx`); if the row is already **Offer Made**, that step is a no-op.
- **Who qualifies:** Only when the current stage is **`null`** or **`Enquiry`**. Other stages (e.g. Contact Made) are **not** auto-bumped when an offer is typed.
- **Amount rule:** At least one offer line must parse to a numeric value **> 0** (same rules as the workspace sync: trim, commas stripped, empty → 0). All-zero drafts do **not** trigger the advance.

## Client portal (`panda_realty.portal_tokens`)

Portal tokens gate buyer access to a read-only client portal (`/portal/<token>`). One token row per buyer–property link (`property_entity_id`), though multiple rows can exist if old ones were revoked and new ones generated.

- **Generate (idempotent):** `POST /api/admin/portal-tokens` with `{ propertyEntityId }`. Server looks up `propertyListId` from the DB; the client passes `propertyListId: 0` as a fallback but it is ignored when the entity exists. Returns the **existing non-revoked token** if one exists, otherwise inserts a new UUID token row.
- **Revoke:** `PATCH /api/admin/portal-tokens/:id` sets `revokedAt = now()`. The portal page returns "This link is no longer active" for revoked tokens. Revocation is permanent; to restore access, generate a new token.
- **Regenerate after revocation:** Same POST as first generation — because the old row now has `revokedAt` set, the idempotency check (`isNull(revokedAt)`) finds no active row and inserts a new one.
- **Last visited:** `lastAccessedAt` is updated each time the client portal page is loaded (via `GET /api/portal/:token`). The admin Portal tab shows a relative time ("3 days ago") or "Never opened" when null.
- **GET (admin):** `GET /api/admin/portal-tokens?propertyEntityId=<id>` returns the **most recent row** (by `portalTokenId DESC`) or `null`. The panel determines state from `revokedAt`: non-null → revoked state; null → active state.
- **Tab visibility:** The Portal tab is present only in the **buyer workspace** dialog (entity category id `1`). Non-buyer property entity dialogs (seller, contact, tenant) do not show it.
- **Portal URL format:** `{origin}/portal/{token}` — constructed client-side using `window.location.origin` so no hardcoded host is needed.
- **Admin entry points (property edit dialog):** The **seller** portal toolbar (Open Portal · Send via email · Revoke · Contract Crash; no raw URL or Copy link) renders under the **Owner information** section, not in the dialog top bar. A **buyer** "Open Portal" button appears only on the **accepted / under-contract** buyer row (the successful-buyer section), not on pending-offer buyer rows; clicking it generates the buyer token if none is active (idempotent generate above) and opens `/portal/{token}` in a new tab.
- **Sale price display (both portals):** The "Sale Price" shown on buyer and seller portal feed cards comes from `buyerOffers.offer` where `isAccepted = true`, **not** from `pandaProperties.salePrice`. The accepted offer amount is the actual sale contract price; the `salePrice` field on the property record may differ. If no accepted offer exists: buyer portal shows "Sale price not yet confirmed" (grey fallback text with testid `portal-buyer-sale-price-pending`); seller portal omits the price element entirely. The property description line (bed/bath/car/type) is not shown on any portal page.

### Portal messages (`panda_realty.portal_messages`)

Two-way message thread between admin (Richard) and the portal client, attached to a portal token.

- **Schema:** `portal_message_id` (PK), `portal_token_id` (FK → `portal_tokens`, CASCADE), `sender_role` CHECK `IN ('agent', 'client')`, `body` NOT NULL, `sent_at` default `now()`, `read_at` nullable. Index on `(portal_token_id, sent_at DESC)`.
- **Public POST** (`/api/portal/[token]/messages`): validates token active (404/410), body non-empty and ≤ 2000 chars, inserts with `senderRole = 'client'`. Triggers a fire-and-forget Gmail notification to `admin@mypandarealty.com.au` with the message and a link to the admin Messages tab.
- **Public GET** (`/api/portal/[token]/messages`): returns thread ordered `sentAt ASC`. Also marks all unread `agent` messages as read (`readAt = now()`) in the same request, and patches those values into the response so the client doesn't need a second fetch to clear unread indicators.
- **Admin GET/POST** (`/api/admin/portal-messages/[portalTokenId]`): session-auth required. GET marks unread `client` messages read (same patch-in-response pattern). **GET `?peek=1`** returns the thread WITHOUT marking client messages read — used to prefetch the unread indicator on the property dialog without clearing it. POST inserts `senderRole = 'agent'` and fires a fire-and-forget `sendAgentMessageNotification` — emails the client at their default address (buyer = entity email; seller = primary owner email) with the message and a button linking to **their** portal (`/portal/<token>` or `/portal/seller/<token>`). No-ops silently if the client has no email on record.
- **Read tracking:** `readAt` is set by the *other* party's GET — agent messages are marked read by the client GET; client messages are marked read by the admin GET. Own messages never receive a `readAt`.
- **Polling:** Both client portal and admin panel poll every 30 s; polling pauses when `document.visibilityState === 'hidden'` and fires immediately on tab return.
- **Character limit:** 2000 characters. Enforced on both client (disabled Send + counter turns red) and server (400 response).
- **Email notification:** On client POST, `sendPortalMessageNotification` sends a Gmail message to `admin@mypandarealty.com.au` (the `AGENT_NOTIFICATION_EMAIL` constant in `lib/agent-notification-email.ts`, sent from the connected Gmail account) with subject `New portal message from {client} — {address}` and a deep link to `/admin/properties?openEdit={propertyListId}&openMessages={role}[&openMessagesEntity={propertyEntityId}]`. `openEdit` (shared admin param) opens the property's Edit dialog; `openMessages` (read by `panda-properties-dialog-form.tsx` via `useSearchParams`) auto-opens the matching `InlinePortalMessages` thread on mount — seller, or the buyer matched by `openMessagesEntity === acceptedOffer.propertyEntityId`. The previous `/admin/property-entities/{id}?tab=messages-tab` link 404'd (no such route). Failure is swallowed — it does not block the API response.
- **Admin UI:** Separate **Messages** tab (`tabValue: "messages-tab"`, `customRelatedPanelKey: "property-entity-messages"`) in the buyer workspace dialog, alongside the existing Portal tab. Revoked tokens show a "revoked" state instead of the compose form.
- **Inline Messages on the property dialog:** A **Messages** button (`InlinePortalMessages`) sits inline with the seller portal buttons (Owner Information) and next to the successful buyer's Open Portal button. It toggles the same `PortalMessageThread` inline, auto-generating the portal token on first open when none exists, and shows an unread dot prefetched via `?peek=1`. This lets the agent message a seller or buyer directly from the property — the seller thread is reachable even when the property has no buyer (the buyer-workspace Messages tab is not).

### Portal file uploads

- **Buyer uploads:** buyers can upload files directly from their portal (`/portal/[token]`, "Your Uploads" card rendered below Documents). Upload flow mirrors the admin two-phase Drive upload: `POST /api/portal/[token]/files/upload/initiate` (server validates token + file size ≤ 100 MB, creates Drive folder, returns `uploadUri`) → client XHR PUT to Drive with byte-level progress → `POST /api/portal/[token]/files/upload/record` (inserts `property_entity_files` row with `source = 'buyer_upload'`). Files are keyed by the buyer's `property_entity_id` from the portal token.
- **Seller uploads:** sellers upload from the **Uploads** tab on their portal (`/portal/seller/[token]`). Same flow: `POST /api/portal/seller/[token]/files/upload/initiate` → Drive PUT → `POST /api/portal/seller/[token]/files/upload/record` (inserts `property_list_files` row with `source = 'seller_upload'`). Files are keyed by `property_list_id`.
- **`source` column values:** `'buyer_upload'` on `property_entity_files`; `'seller_upload'` on `property_list_files`. These distinguish client uploads from admin-uploaded files (`null`) or Drive-synced files (`'google_drive'`).
- **File proxy bypass:** buyer proxy (`/api/portal/[token]/files/entity/[fileId]`) allows access to files where `source = 'buyer_upload'` AND `file.propertyEntityId = token.propertyEntityId` — bypasses the `shared_with_portal` check for the buyer's own uploads. Seller proxy (`/api/portal/seller/[token]/files/property/[fileId]`) allows access to files where `source = 'seller_upload'` — bypasses `shared_with_seller`.
- **No cross-party visibility:** buyer portal never serves `property_list_files`; seller portal never serves `property_entity_files`. Neither party sees the other's uploads.
- **Admin view:** client uploads appear in a **separate "Client uploads" sub-section** in the property dialog Files tab (filtered by `source IN ('buyer_upload', 'seller_upload')`). Shown below the agent-uploaded files section; only when at least one client file exists. Delete button only — no share toggles.
- **Admin-only delete:** no portal-side delete endpoint. Clients use `DELETE /api/admin/property-entity-files/:id` or `DELETE /api/admin/property-list-files/:id` via the admin UI only.
- **Email notification:** `sendPortalUploadNotification` in `lib/portal-notifications.ts` fires fire-and-forget Gmail to `admin@mypandarealty.com.au` on every successful upload. Buyer uploads link to the entity's Files tab; seller uploads link to `/admin/properties`. The admin link base URL is derived from `NEXT_PUBLIC_APP_URL` (if set) or `new URL(request.url).origin` — never a hardcoded localhost. Failure is swallowed and never blocks the API response.
- **Revoked tokens:** initiate routes return 410 for revoked tokens (same as the portal page itself).

## Google Contacts (People API)

Uses the same Google OAuth connection as Gmail / Calendar / Drive (`gmail_oauth_tokens`, scope includes **Contacts**).

- **`entities.contact` (citext):** Nullable free-text field on CRM parties. It is **not** shown on the simplified buyer dialog or the standard non-buyer entity dialog today, but staff and imports may still populate it in Postgres. **Google sync uses `contact` as the only non-email “reachability” column on `entities`** — values are sent to Google **`phoneNumbers`** only when they **normalize as dialable** (7–15 digits); non-phone text is skipped. **`mobile` is not read** for People upsert from entities (the legacy `phone_number` column has been dropped; use **`contact`** or **`email_address`** if you need bulk sync).
- **Triggers (non-blocking):** Successful **`PATCH /api/admin/properties/:id`** (Favorite property dialog save) syncs **owner slots 1–3** when the slot has a **non-empty email** or **dialable `ownerNphone`**, and **every** linked **buyer / contact / tenant** `entity_id` on that property (each row is re-synced from the database so **`contact`** applies even when the list embed omits it). Successful **`POST /api/admin/entities`** (creating a new entity from any admin form — standalone CRUD or the nested "Add new buyer/contact/tenant" toolbar inside the property edit dialog) syncs that newly created entity using just its own fields (name, email, phone) with **no property address context** — the "Enq:" segment is added on the next sync once a property link is established. Successful **`POST /api/admin/property-entities`** (linking a buyer/contact/tenant to a property for the first time — from the card panels) syncs that newly linked `entity_id`. Successful **`PATCH /api/admin/property-entities/:id`** and **`PATCH /api/admin/entities/:id`** sync that **entity** when it has an **email** and/or **dialable `contact`**. **Gmail lead import** calls the same entity sync after creating or re-linking a lead.
- **Display name:** The People client composes a display name **`{entityName} {RoleLabel}: {property context};`** (and optional phone) so listing context is visible. **`RoleLabel`** is **`Enq`** for buyer-category entities, **`Contact`** / **`Tenant`** for those categories (from **`entity_categories.slug`**), **`Seller`** for **`panda_properties`** owner slots **1–3**, and **omitted** (street segment only: **`{entityName} {context};`**) when the entity category slug is unknown — **`is_seller` on `entities` does not override** category for this label. Bulk **`patch-all`** merges use the highest-priority role among contributors: **Seller > Contact > Tenant > Enq**.
- **Multi-property entities:** For **`entities`**, the **property context** is built from **all** `street_address` values on **`panda_properties`** rows linked via **`property_entities`** (deduped, sorted, then truncated to a safe length). **Owners** use **only** that property’s `street_address`.
- **Upsert matching:** People rows are found by **email** when present, else by **normalized phone digits** on dialable numbers. Multiple listings still merge street context into one contact when keyed the same way; the merged display name uses the **dominant role prefix** above.
- **Rate limits:** `searchContacts` / `createContact` / `updateContact` retry on **HTTP 429** with **`Retry-After`** when Google sends it, otherwise exponential backoff (bounded), up to a small max attempt count — reduces bulk **`patch-all`** failures under quota.
- **Same email, entity + owner:** When the same normalized email appears on a **property-linked entity** and an **owner slot**, the **entity’s `entity_name`** wins for the Google display name (owner streets still merge into context).
- **Bulk toolbar:** **`POST /api/admin/google-contacts/patch-all`** upserts every **property-linked** entity with non-empty **`email_address`** or **`contact`** (after trim), **plus** owner slots **1–3** with email and/or dialable owner phone — **deduped by email**, with **phone-only** rows keyed by digits and merged into an email bucket when the email row carries the **same dialable phone**.
- **Dev-only faster patch-all:** In **`NODE_ENV=development`**, set **`PANDA_GOOGLE_CONTACTS_PATCH_ALL_RECENT_HOURS`** to a positive number to **only** load rows where `coalesce(updated_at, created_at)` on **`property_entities`**, **`entities`**, or **`panda_properties`** (entity path) or on **`panda_properties`** alone (owner path) is **≥ now − that many hours**. Prefer **small** values (e.g. **1–6 hours**) for quick checks; large windows (e.g. 7 days) still match many rows. Unset in production (full sync). The JSON response includes **`devRecentFilterHours`** / **`devRecentFilterCutoffIso`** when this hatch is active.
- **Dev-only listing allowlist:** Set **`PANDA_GOOGLE_CONTACTS_PATCH_ALL_PROPERTY_LIST_IDS`** to a comma-separated list of **`panda_properties.property_list_id`** values to restrict **`patch-all`** bulk fetches to **those listings only** (property-linked entities + owner slots). When **`RECENT_HOURS`** is **also** set, **both** filters apply (**AND**). Ignored when **`NODE_ENV` ≠ `development`**. JSON may include **`devPropertyListIdAllowlist`** / **`devPropertyListIdAllowlistCount`** when active.
- **Dev-only patch-all trace file:** When **`NODE_ENV=development`**, each **`POST /api/admin/google-contacts/patch-all`** overwrites **`apps/panda-realty/.scratch/google-contacts-patch-all.log.txt`** (gitignored) with raw entity/owner rows read from the DB, merged aggregates, and each People **`created`** vs **`updated`** outcome (or error). The JSON response may include **`devPatchAllLogRelativePath`** (e.g. `.scratch/google-contacts-patch-all.log.txt`) so you know where to open the file.
- **UX:** When sync cannot run or a row fails, the API may include **`googleContactsWarnings`** on the JSON response; the admin shell shows a **dismissible banner** (does not block save). After **lead-import → Sync contacts**, use **View sync log** to inspect each merge-key upsert (**`results`**): outcome **`created` \| `updated` \| `failed`**, error text when failed, and contributors (`entities.entity_id` and `panda_properties` owner slots). Very large runs may **omit extra rows** from the **`results`** array in JSON — see **`resultsTruncated`** / **`resultsOmitted`** (cap is **`GOOGLE_CONTACTS_PATCH_ALL_RESULTS_MAX`** in code).
- **Audit columns (Postgres):** **`entities`** stores **`google_contacts_synced_at`**, **`google_contacts_last_outcome`**, **`google_contacts_last_error`** (last People attempt, success or failure). **`panda_properties`** has **`ownerN_google_contacts_*`** per owner slot **1–3**. Bulk **`patch-all`** stamps **every contributor row** tied to that merge key with the **same** outcome/error/timestamp for that upsert; incremental **`PATCH`** sync paths update the same columns for the rows they touch.

## Buyer offers (`panda_realty.buyer_offers`)

Rows are keyed by **`property_entity_id`** (the property–entity link). Deleting the parent **`property_entities`** row should remove related **`buyer_offers`** via **`ON DELETE CASCADE`** on that foreign key (see Drizzle migrations under **`apps/panda-realty/drizzle/`**).

- **Admin UI — Edit Buyer → Offers:** The Offers grid is edited under the **`property-entities`** admin shape but uses an **isolated** client registry so **`buyerOffers` are not merged into `PATCH /api/admin/entities`**. After a successful **`PATCH /api/admin/entities`**, the client runs a follow-up **`PATCH /api/admin/property-entities/:propertyEntityId`** with the current **`buyerOffers`** payload for the **selected** property connection (when that inline section has synced offers data). This follow-up applies when editing from **`/admin/entities`** (**`adminEntityEditPatchSuccessFollowup`**) **and** when Edit Buyer opens as the **nested** second-stack dialog from a property (**`adminNestedEntityEditPatchSuccessFollowup`** in **`@repo/admin`**, wired in Panda’s admin client registry). **Save & Close** finishes the dialog; **Save changes** keeps the dialog open but still persists the main entity row and the same follow-up when offers data is present.
- **Admin UI — Edit Buyer → Offers (delete):** Saved rows in the **Offers** inline grid use **immediate** server delete (**`DELETE /api/admin/buyer-offers/:id`**) so removal persists without waiting for the parent **Save**. The engine supports this via **`relatedInlineImmediateDeleteViaChildApi`** on the related collection; failed deletes surface under **`admin-entity-crud-related-inline-delete-error--property-entities--buyerOffers`**. After a successful delete, the app refetches the parent **property_entities** detail so **`listDetailSeed`** (and embedded buyer fields) stay consistent.
- **Google Calendar:** If condition-calendar sync stored Google event IDs on the offer, **`DELETE`** attempts best-effort removal of those events before the row is removed (orphaned calendar entries are avoided when possible).
- **Admin UI — Offers tab → Accept (Buyers pipeline):** Non-accepted offer rows in the **Buyers pipeline → buyer detail panel → Offers tab** show a ghost **"Accept"** button (`offers-row-accept-btn--{buyerOfferId}`, rendered when `!offer.isAccepted`). Clicking calls `PATCH /api/admin/buyer-offers/:id` with body `{ isAccepted: true }`. Accept is **permanent** — no un-accept. If another offer on the same `property_entity_id` already has `isAccepted = true`, the server returns **409** `"Another offer is already accepted"` (application-level guard — no DB unique index on `is_accepted`); the UI shows inline per-row error `offers-row-accept-error--{buyerOfferId}` and the button remains. On success the offer list refreshes and the row renders the green **Accepted** badge.
- **Edit Property dialog — accepted buyer inline section (BUYERS):** When `buyer_offers.is_accepted = true` for any offer on the property, the Edit Property dialog shows a **BUYERS** inline section (`panda-properties-form-section--successful-buyer`) between OWNER INFORMATION and PROPERTY DETAILS. It shows the accepted buyer's Name (clickable — opens full entity profile), Offer Amount, Phone, and Email in a 4-column grid with Call / Email / Notes / Files action buttons. The accepted buyer is **excluded from the Buyers tab pipeline list** (`GET /api/admin/properties/[id]/buyers` applies a `NOT EXISTS` filter on `buyer_offers.is_accepted = true`). The section only appears in `variant="edit"` — not in the Add Property create dialog. `GET /api/admin/properties/[id]/buyer-offers` also returns `phoneNumber` (from `entities.contact`) and `emailAddress` for this section.

## Property meetings & reminders (`panda_realty.property_meetings`)

Agent-facing scheduling records linked to a property, optionally linked to a specific buyer (via `property_entity_id`).

- **`type`**: `'meeting'` or `'reminder'`. Determines UI rendering (meetings show "Add to Calendar"; reminders do not).
- **`title`**: free-form label. When synced to Google Calendar, the event title is auto-composed as `"{title} – {buyerName} @ {propertyAddress}"` using resolved buyer entity name and property address at sync time.
- **`scheduled_at`**: timestamp with timezone (UTC in Postgres). **Form semantics:** date + time from the Add Meeting / Add Reminder dialogs are interpreted as wall-clock in **`Australia/Brisbane`** (see `apps/panda-realty/lib/meeting-scheduled-at.ts`). Times snap to **15-minute** increments on save (client + server); duration snaps to **15-minute** multiples (minimum 15). Reminders with no time use **start of day** in that zone. Meeting cards display date + time formatted in Brisbane.
- **`duration_minutes`**: applicable to meetings only. Defaults to 60 minutes in the Google Calendar sync API when not set.
- **`notes`**: optional free-form internal notes; not synced to Google Calendar event description.
- **`google_calendar_event_id`**: stores the Google Calendar event ID after sync. Populated for both `'meeting'` and `'reminder'` types. After insert, **`addMeetingAction`** attempts Google sync server-side; the Meetings tab may also POST `/api/admin/property-meetings/[id]/calendar-sync` for unsynced rows. Deletion via `DELETE` on the same route removes the Google event and clears this field.
- **Google Calendar color coding**: meetings sync with `colorId "7"` (Peacock blue `#039be5`); reminders sync with `colorId "4"` (Banana yellow `#f6bf26`). The in-app calendar reads the `colorId` back from fetched Google events and applies matching CSS. Events without a `colorId` (created via the Add Calendar Event dialog) fall back to the default blue (`#2563eb`).
- **Immutability**: no cascading rules on `property_entity_id` — deleting a buyer link does not remove its meetings. Deleting a meeting via the UI removes the row (and its calendar event if synced).

## Commission amount calculation

The commission dollar amount displayed in the pipeline property detail panel is:

> **Commission $ = `buyer_offers.offer` (accepted offer) × (`panda_properties.commission_rate` ÷ 100)**

- Base: the accepted buyer offer (`buyer_offers.offer` where `is_accepted = true` for that property).
- Rate: `panda_properties.commission_rate` stored as a decimal percentage (e.g. `1.95` means 1.95%).
- Example: $805,000 × 1.95% = **$15,697.50**.
- If no accepted offer exists but a rate is set, show **"No offer yet"** (cannot compute without a base).
- If no commission rate is set, hide the Commission field entirely.

## Pipeline property detail sheet (sellers Kanban)

The **`sale_price`** column on **`panda_properties`** may still hold a historical listing figure, but the sellers pipeline **property detail** sheet (header metrics and **Summary** tab) does **not** display it as “Asking” — agents rely on appraised value, offers, and contract price instead.

The **Summary** tab's **”Buyer address”** row (`panda-property-summary-row--buyer-address`) shows the accepted buyer's representative member's `member_address`; if the rep has no `member_address`, it falls back to the first member's `member_address`. When no member address is available the row shows **”No address on file”**. This is the buyer's residential address — distinct from `property_to_sell_address` (which is the address of a property the buyer needs to sell). Source: `property-queries.ts` → `memberResidenceAddressById` map → `PropertyDetailBuyer.memberResidenceAddress` → `property-summary-tab.tsx` `staticFields`.

On the **buyers** pipeline **Overview** tab, the embedded property card still surfaces **`sale_price`** when present, with the neutral label **Price** (or **Appraised** when only that amount is available) — not “Asking”.

## Map-area filter results view — historical sale price hidden when a current figure exists

On the properties **map-area filter** results table (active `streetFilter`), each row hides its historical **Last sale price** (`sale_price`) and **Last sale date** (`sale_date`) whenever that property already has a **Contract Price** (derived from the accepted offer) **or** an **Appraised** amount (`appraised_amount`). The comparison then reads off the current figure (Appraised, Contract date, Contract Price) instead of a stale sale. Properties with neither a contract nor an appraised price keep showing their historical sale price and date. The hide is **presentational and scoped to the map view only** — the underlying data, the normal list, exports, and the edit form are unchanged. Mechanism: the shared `listCellHideWhenSiblingPresentKeys` column flag (`@repo/admin`), turned on for `salePrice`/`saleDate` only on the map column set in `panda-properties-quick-table-list-columns.ts`.

## Sales Information fields (property form — Sales tab)

These fields are shown in the **Sales Information** tab of the property edit dialog when the property is marked as a Favorite.

- **Contract Price** — read-only display of `buyer_offers.offer` from the accepted offer row (`is_accepted = true`). Labelled "Contract Price" to distinguish it from speculative bids.
- **Contract Date** — editable field bound to `panda_properties.contract_date` (nullable timestamp). Records the date the contract of sale was exchanged. This is distinct from `buyer_offers.date_offered` (when the buyer submitted their offer). **Auto-set**: when a property card is dragged into the **"Sale Contract Signed"** pipeline column (`property_status_code = 'Sale Contract Signed'`), `contract_date` is set to the current timestamp via `COALESCE(contract_date, NOW())` — meaning it is only written if it was previously null, so a manually entered date is never overwritten. **UTC storage invariant**: `contract_date` must always be stored as **midnight UTC** (e.g. `2026-04-26T00:00:00Z`). The ShadCN Calendar picker returns midnight *local* time, so `offer-conditions-contract-date-field.tsx` normalizes the picked date via `new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))` before storing. All condition due-date arithmetic (`computeConditionDueDate`, `addDays` in pipeline summary) uses `getUTCDate`/`setUTCDate` and `formatAdminEntityTimestampListDmyUtc` renders with `timeZone: "UTC"` — so the displayed calendar date always matches what was picked regardless of server or browser timezone.
- **Latest Buyer Offers table — condition badge suppression rules** (`panda-properties-buyer-offers-section.tsx`): the Finance, Subject to Sale, and Waive Cooling Off badges apply stale-flag guards because `update-offer-conditions-action.ts` writes `is_cash_offer` and `no_conditions` without clearing `is_subject_to_finance`, `is_subject_to_sale`, or `waive_cooling_off`. Rules: Finance badge requires `isSubjectToFinance && !isCashOffer && !noConditions`; Subject to Sale badge requires `isSubjectToSale && !noConditions`; Waive Cooling Off badge requires `waiveCoolingOff && !noConditions`. The `property-summary-tab.tsx` Finance condition row already applies `omit: noConditions || isCashOffer` — the same logic applies here.
- **Contract Conditions** — editable inline panel (`OfferConditionsPanel`) that appears in the Sales tab when an accepted offer exists. Also accessible from the pipeline property Summary tab. Fields: `is_cash_offer`, `no_conditions`, `subject_to_sale_stage` (nullable text; values: “To be listed”, “On the Market”, “Under Contract”, “Unconditional” — null means condition not active), `subject_to_sale_address` (nullable text; the address of the property the buyer intends to sell to fund the purchase — set to null when the “Subject to sale” checkbox is unchecked; when the stored value is null the field pre-fills from the accepted buyer's member data using: rep's `property_to_sell_address` → rep's `member_address` → first member's `property_to_sell_address` → first member's `member_address`; this pre-fill applies in both the pipeline board Summary tab and the Edit Property dialog Sales tab; stored value always wins over pre-fill), `cooling_off_days`, `finance_days`, `building_pest_days`, `due_diligence_days`, `subject_to_sale_days` (settlement timing as **days from contract date** — same role as a fixed settlement date in a contract), `sale_of_property_days` (days from contract date for a subject-to-sale-of-another-property condition), `unconditional_contract_days` (days until the contract goes unconditional), `completion_date_days` (days until completion / settlement date), `deposit_initial`, `deposit_balance`, `other_conditions` (free-text for genuinely ad-hoc items not covered by the structured fields), and `condition_notes` (internal **Condition Notes** — distinct from legal “Other” text). All `*_days` fields are nullable integers; when set they appear as calculated due-date badges in the pipeline Summary tab's **Condition Due Dates** section (`contract_date + N days`). **Dirty indicator**: an amber dot appears beside “Save conditions” whenever any field has unsaved changes; disappears after a successful save. **Auto-save on main form save**: the panel registers its `handleSave` via a `conditionsSaveRef`; `PandaPropertiesDialogForm` watches `isSubmitting` from the TanStack form store and fires `conditionsSaveRef.current()` on the rising edge (false→true) so conditions are written simultaneously with the main property PATCH. **Contract date sync**: every picker change immediately calls `contractDateField.handleChange` so the main form PATCH always carries the latest picked date. **NaN guard**: `update-offer-conditions-action.ts` rejects non-finite `depositInitial`/`depositBalance` values with `{ success: false, error: “Invalid deposit amount” }` rather than writing `”NaN”` to the DB.

## Condition Calendar — Add Event (`/admin/calendar`)

The **Add Calendar Event** button on the calendar page header creates events directly in the **primary Google Calendar** of the connected account (same OAuth token as Gmail/Contacts/Drive: `gmail_oauth_tokens`). No event IDs are stored in Postgres — these are ephemeral user-created calendar events, not property-linked meetings.

- **All-day events** — `POST /api/admin/calendar/events` with `type: "all-day"`, `title`, and `date` (YYYY-MM-DD). Calls `createCalendarEvent` in `lib/google-calendar-client.ts`; end date is the next calendar day (Google Calendar all-day exclusivity).
- **Timed events** — same route with `type: "timed"`, plus `startTime` (HH:MM) and `durationMinutes`. Start time is interpreted as UTC (`Date.UTC(year, month-1, day, hours, minutes)`) — no timezone conversion; keep this in mind if the connected Google account is in a different timezone.
- **Notes** — optional free-text `notes` field maps to Google Calendar event `description`.
- **Google not connected** — the button is disabled when `calendarConnected !== true`. On submit failure, an inline error is shown in the dialog; the save never blocks.
- **Calendar refresh** — after creation, the client increments `refreshKey` which re-triggers the `useEffect` that fetches Google events for the current view range.

## Condition Calendar — Add Task for Agent (`/admin/calendar`)

The **Add Task for Agent** button (outline, left of "Add Calendar Event") creates a task assigned to an agent stored in `panda_realty.agent_tasks`. Tasks appear as amber event pills on the calendar.

- **Storage** — tasks are persisted in `panda_realty.agent_tasks` (`agent_task_id`, `agent_id` FK → `agents`, `title`, `due_date` nullable, `notes` nullable, `created_at`).
- **Calendar display** — tasks fetched via `GET /api/admin/calendar/agent-tasks`; rendered as amber pills labelled `"<agentName>: <title>"`. Tasks with a `due_date` appear on that date; tasks without a due date appear on today's date.
- **Email notification** — on `POST /api/admin/calendar/agent-tasks`, if the agent has an email, the connected Gmail account sends an email with subject `New task assigned: <title>` and body containing title, due date, notes, and sender (the connected Gmail account address retrieved from `gmail.googleapis.com/gmail/v1/users/me/profile`). Email failure is non-fatal — the task is saved regardless.
- **Agent without email** — agents with `email IS NULL` are still selectable; a ⚠ warning "no email — notification won't be sent" is shown in the dialog. Task is saved but no email is sent.
- **Button state** — disabled when `calendarConnected !== true` (same condition as the calendar event button; Gmail is the required integration).
- **`taskRefreshKey`** — after task creation, the client increments `taskRefreshKey` which re-triggers the `useEffect` that fetches agent tasks.

## Property List — Quick-Action Notes

The **Add notes** icon button on each property list row opens a lightweight dialog for creating a note without opening the full property dialog.

- **Storage** — notes are written to `panda_realty.property_list_notes` via the `addPropertyNote` server action (`apps/panda-realty/app/admin/properties/board/add-note-action.ts`). Same table as the full Notes tab inside the property detail panel.
- **Assignment** — optional; the dialog supports assigning to an agent (`agent_id` FK → `agents`) or to a buyer linked to the property (`property_entity_id` FK → `propertyEntities`). Agents are fetched from `GET /api/admin/agents/options`; buyers from `GET /api/admin/properties/{propertyListId}` (extracting `propertyBuyers[]`). No assignment is valid — all three states (`null`/agent/buyer) are accepted.
- **Success behavior** — on success the dialog stays open and shows an inline "Note added" confirmation; does not auto-close. This lets the user add multiple notes in sequence.
- **Revalidation** — `addPropertyNote` calls `revalidatePath` for both `/admin/properties` and `/admin/pipeline` so the Notes tab in any open panel refreshes on next visit.
- **Dialog state reset** — on close, textarea and assignee selection are reset to empty so a re-open always starts blank.

## Property List — Quick-Action Calendar Event

The **Add calendar event** icon button on each property list row opens `AddCalendarEventDialog` (same component as the Condition Calendar page) with the property address pre-filled as the event title.

- **Title pre-fill** — `defaultTitle` prop receives `"<streetAddress> · <suburb>"` (or just `streetAddress` when `suburb` is empty). The user can edit the title freely; on dialog close, re-opening pre-fills it from the property address again.
- **Same dialog, same endpoint** — posts to `POST /api/admin/calendar/events`; identical behavior to the Condition Calendar page button. See **Condition Calendar — Add Event** section above for payload shape and error handling.
- **No calendar connectivity check** — the button is always enabled on the properties list (unlike the calendar page button which disables when `calendarConnected !== true`). If Google Calendar is not connected, the submit will fail with an inline error message.
- **Implementation** — `PropertyListRowExtraActions` (`apps/panda-realty/components/admin/property-list-row-extra-actions.tsx`) wires all quick-action buttons (Call, Email, Inbox, Reminder, Note, Meeting); hooked into the admin registry via `renderAdminEntityListRowExtraActions` in `PandaRealtyAdminClientRegistryProvider`. Call routes to the **primary phone owner** (`primaryPhoneOwnerNum` on the list row; defaults to owner 1 when null). Email/Inbox route to the **primary email owner** (`primaryEmailOwnerNum`; defaults to owner 1 when null). If the designated primary owner has no phone/email, the button is disabled with a named tooltip: "Primary owner ({name}) has no phone number" / "…no email address". "No owner" when owner 1 name is absent entirely. Routing resolution lives in `apps/panda-realty/lib/admin/panda-registry-resolve-owner-contact.ts`.

  **Buyer primary contact** — `panda_properties` also carries two nullable bigint columns: `primary_phone_buyer_property_entity_id` and `primary_email_buyer_property_entity_id`. These store the `property_entity_id` of the buyer designated as the primary phone/email contact. Phone and email primary are tracked independently so different buyers can hold each. When null, the first buyer in the list is treated as primary. The list row shows buyer Call/Email quick-action buttons only when a primary buyer's contact is set. Resolution: `panda-registry-resolve-buyer-contact.ts`. The property edit dialog shows a star icon on each buyer's phone and email input (amber = primary, muted = not primary); clicking a star immediately PATCHes the property to update the primary designation — no explicit form save needed.

## Due-date highlight — green + red + gold (`panda_properties.due_highlight_cleared_at`)

A property is highlighted on the internal admin screens by a three-tier marker on its **next** condition: **green** when a critical date is **due today or overdue** (and not cleared); **red** when the next date is **within 3 Brisbane days**; **gold** when the next date is **more than 3 days out** (uncapped, so every under-contract property with an upcoming condition carries a gold tick). Precedence is **green > red > gold** — a property shows exactly one colour. **A property with no contract is never highlighted.** Client-facing portal is never affected.

- **Requires a contract (revised 2026-05-31)** — every critical date is gated on `panda_properties.contract_date`. If a property has **no contract date**, `buildDueDateCandidates` returns `[]` and the property can never go green — even if it carries a stale imported `settlement_date`. (This reversed the earlier rule that lit settlement-only properties with no accepted offer; imported properties carry a historical last-sale settlement date, which was lighting up ~77.7k no-contract rows.)
- **Critical dates considered (only when under contract)** — cooling off, finance, building & pest, due diligence, sale of property, unconditional contract, completion (subject-to-sale), all derived from the accepted offer's `contract_date + days`; **settlement**; and **custom conditions** (`buyer_offers.custom_conditions[].days`).
- **Settlement source (revised 2026-06-01)** — settlement is read from the **accepted offer** (`buyer_offers.settlement_date`, where it is entered on the offer form), falling back to `panda_properties.settlement_date` only when the property has **no accepted offer**. The property column is polluted with historical RP-import settlement dates (e.g. 2016/2021/2023 last-sale dates) on properties now under contract, so reading it first would fire false overdue greens. To keep the property column usable for the calendar/exports/summary, the accepted offer's settlement is mirrored onto `panda_properties.settlement_date` on **accept** and on **edits to an accepted offer** (`syncPropertySettlementFromAcceptedOffer`, `apps/panda-realty/lib/admin/sync-property-settlement.ts`); existing rows were backfilled (overwrite where the offer has a date, never clearing).
- **Green rule** — a property is green when it has a contract date AND ∃ a critical date `D` with `D ≤ today (Australia/Brisbane) AND (due_highlight_cleared_at IS NULL OR D > due_highlight_cleared_at)`. Single source of truth: `apps/panda-realty/lib/admin/due-highlight.ts` (`computeDueHighlight`, `startOfBrisbaneDayUtc`) fed by `property-due-date-candidates.ts`.
- **Next-in-line marker (revised 2026-05-31)** — when several dates are due/overdue at once, the highlight surfaces only the **single next-in-line milestone** (the earliest by due date that is un-cleared), not every overdue date. As each is cleared, the marker steps forward to the following one (which re-lights when its date is due). `computeDueHighlight` returns that one label in `labels`.
- **Warning tiers — red + gold (added 2026-05-31 as a 3-day yellow tier; split into red/gold and uncapped 2026-06-01)** — when **no** green is active, the **earliest future** critical date `D` (any distance, no cap) flags the property as a passive heads-up. The distance picks the colour: **red ("soon")** when `today < D ≤ today + 3 Brisbane days`, **gold ("upcoming")** otherwise (`WARNING_DAYS = 3` in `due-highlight.ts` is now just the red/gold cutoff). This means every under-contract property with an upcoming condition wears a gold tick until a date lands — the client (Richard) asked for the 3-day limitation to be removed so the next condition always shows. Both tiers **ignore** `due_highlight_cleared_at` (clearing is a green-only action; a future date can't be "dealt with") and have **no clear action** — they turn green on the due day and step forward like green. `computeDueHighlight` returns `warning`, `warningLabels` (raw label), `warningDaysUntil` (≥1, uncapped), and `warningTier` (`"soon"` | `"upcoming"` | `null`); the display string `"<label>, due in N day(s)"` is built by `formatDueWarningLabel`.
- **Clearing** — a per-property clear button (`property-due-highlight-clear--{id}`) stamps `due_highlight_cleared_at = now()`. List clears via `POST /api/admin/properties/[id]/due-highlight-clear` + react-query invalidate; pipeline clears via the `clearDueHighlight` server action + `router.refresh()`. After clearing, a **later** milestone whose due date falls after the clear re-lights the property automatically. Only green is clearable. Green tooltip reads `"<label>, due today. Click to clear."`.
- **Default list ordering by next condition due (added 2026-06-01)** — the properties list **opens** ordered by each property's next condition due, soonest first. The ordering value is materialised on `panda_properties.next_condition_due` (the **earliest *uncleared* candidate** date — same candidate set + `cleared_at` suppression as the green/red/gold marker, so the order always agrees with the tick). It is recomputed by `syncPropertyNextConditionDue` (`apps/panda-realty/lib/admin/sync-property-next-condition-due.ts`) on offer accept, accepted-offer edit, contract/settlement edit, and clear/unclear — **never on a timer** (the value is time-independent: an uncleared overdue date stays the earliest-live date). The list's `listOrderBy` is `next_condition_due ASC, street_address ASC, property_list_id ASC`; Postgres `ASC` sorts NULLs last, so properties with **no live condition** fall into a bottom group ordered alphabetically by street. This is the default only — clicking any column header overrides it for the session, and a fresh visit (no `sortKey`) resets to it. Materialisation is required because the admin list sorts + paginates at the **DB** level, before the JS due-date enrichment runs. Client (Richard) requested it 2026-06-01.
- **Where shown** — **properties list:** the actions column shows a tick where the marker lives — the green clear tick (`property-due-highlight-clear--{id}`, interactive) when due/overdue, or a passive warning tick (`property-due-warning--{id}`, `PropertyDueWarningIndicator`, no clear, carries `data-due-warning-tier`) coloured **red** (`text-red-500 dark:text-red-400`) within 3 days or **gold** (`text-amber-500 dark:text-amber-400`) further out, with a `"<label>, due in N days"` tooltip. Only the **green** tier still tints the row (`bg-green-100 dark:bg-green-950/40` via `listRowHighlight` `field`/`className`); the red/gold rows are **not** tinted. **Pipeline** seller `KanbanCard`: green card + clear button, or a red/gold card (tint + passive `property-due-warning--{id}` `CircleCheck` countdown tooltip, coloured by tier — the warning icon was unified from `Clock` to `CircleCheck` to match the list, 2026-06-01). **Calendar:** condition **event bar** turns green for due/overdue, **red** `#ef4444` within 3 days, **gold** `#f59e0b` beyond (evaluated per event, so each upcoming condition bar carries its own tier colour). Server-computed per request, so "today" follows the server clock interpreted in Brisbane.

## Cooling-off period resolution (added 2026-05-31)

The number of statutory cooling-off **days** is not stored or entered directly — it is **resolved** from the property type plus the single offer-form waive answer. Two contract types share one offer form:

| Property type | Waive cooling off? | Cooling-off days |
| --- | --- | --- |
| `Manufactured Home` | No | **21** |
| `Manufactured Home` | Yes | **7** (buyer may only waive 14 of the 21) |
| anything else (residential) | No | **5** |
| anything else | Yes | **0** |

- **Manufactured homes are flagged by property type only** — set `panda_properties.property_type = "Manufactured Home"` manually (they are added by hand; they do not appear in RP Data). Match is case-insensitive and trimmed. There is **no** separate manufactured-home flag or day-count field, and the public offer form's waiver question is unchanged (single Yes/No).
- **Single source of truth:** `apps/panda-realty/lib/cooling-off-days.ts` — `resolveCoolingOffDays(propertyType, waiveCoolingOff)`, `isManufacturedHome()`, `formatCoolingOffLine(days)` → `"Cooling Off - <days>"`.
- **Where it surfaces:**
  - Admin offer **submission panel** — a `Cooling Off` row showing `<days> Day(s) (<actual date>)` in the value column (`submission-cooling-off-resolved`), resolved in `offer-form-status/route.ts`. For **Manufactured Home** properties, the actual date counts `<days>` calendar days forward from the **disclosure date** (`panda_properties.disclosure_date`) when set — because the statutory cooling-off period for a manufactured home begins when the Buyer receives the Disclosure Statement (which may arrive several days after contract signing). For all other property types (and for manufactured homes where no disclosure date is set), the base is the property's **contract date** (`panda_properties.contract_date`), falling back to the offer **submission date**. Building & Pest, Settlement, and Finance rows always use the contract date (never the disclosure date). The `disclosure_date` field is editable via the Sales Information tab in the Edit Property dialog (visible only for Manufactured Home properties, beside the Contract date field). The day label is singular/plural (`1 Day` / `N Days`); a waived `0 Days` shows no date. (The `Cooling Off - <days>` string from `formatCoolingOffLine` is the contract-clause format, used below — not this panel.)
  - Admin **offer conditions panel** — the editable `cooling_off_days` field now defaults to the resolved value (no longer a hardcoded 5; waiver no longer forces 0 — it forces the type-appropriate 7/0). Still admin-overridable. The saved `buyer_offers.cooling_off_days` feeds due-dates, the Google Calendar deadline, and the contract.
  - **Contract for Sale & Purchase** — a `Cooling Off - <days>` clause is auto-compiled into the Special Conditions (`contract-sp-mapper.ts`), and the page-6 signing caption interpolates the same number instead of the old hardcoded "5 business day".

## Offer form (`panda_realty.offer_form_tokens` + `panda_realty.offer_form_submissions`)

A public, auth-free web form at `/offer-form/[token]` lets buyers self-submit offer details. Tokens are scoped per `property_entity_id` (one stable token per buyer+property). The token is created on first access via `GET /api/admin/property-entities/[id]/offer-form-status` and reused on all subsequent accesses and sends — no expiry.

### Form structure (2026 redesign)

The form has 6 numbered sections rendered at `/offer-form/[token]`:

1. **Property & Buyer Details** — editable property address (pre-filled from `prefillData.propertyAddress`); dynamic multi-buyer cards (each: name, phone, email, current address). Buyer 1 is pre-filled from the DB; additional buyers are added manually. A "Remove" button appears on buyers 2+.
2. **Solicitor Details** — always-visible 2-column grid (name, phone, address, email).
3. **Financial Offer Structuring** — offer amount, total deposit (default 20 000), initial payment (default 2 000), 2nd payment/balance (default 18 000).
4. **Offer Contingencies & Terms** — cash buyer (Yes / No, labels only — no parentheticals); building & pest inspection question (no / 7 days / 14 days); cooling off waiver Y/N; Subject to Sale sub-panel; Subject to Finance sub-panel; settlement period text + date auto-calc.
5. **Multi-Offer Scenario Acknowledgment** — three required checkboxes (highest/best offer, vendor discretion, competing-offer confidentiality). All three must be ticked before the form can be submitted. Checkboxes are disabled in admin view mode.
6. **Special Conditions / Extra Comments** — free-text textarea.
7. **Purchaser Acknowledgements & Signatures** — one canvas signature pad per buyer (Draw / Type modes), sign date. Pads sync with buyer cards (add buyer → add pad; remove buyer → remove pad). **Every pad must be non-empty before submission** — missing signatures show an inline error per pad and a summary error near the Submit button.

Subject to Sale sub-panel (visible when `cashBuyer = No` and `subjectToSale = Yes`) contains:
- Full address of property to be sold (text input)
- **Simultaneous settlement** Y/N radio: if Yes, the settlement block at the bottom of §4 is hidden (settlement is implied); if No, the settlement block moves inside the simultaneous-no container instead.
- Status dropdown: `to_be_listed` / `on_the_market` / `under_contract_conditional` / `under_contract_unconditional`
- **Timeline metrics sub-panel** (shown for `to_be_listed` / `on_the_market`): days before listing live, days to get sale contract, days to get unconditional contract, days to settle existing property. "Days before listing" is hidden for `on_the_market`. Free market appraisal Y/N is shown only for `to_be_listed`.
- **Under Contract (Conditional) sub-panel** (shown for `under_contract_conditional`): unconditional date, settlement date, active conditions checkboxes (finance / building & pest / sale of property / other), other conditions elaboration textarea.
- **Under Contract (Unconditional) sub-panel** (shown for `under_contract_unconditional`): settlement date only — no conditions or unconditional date.
- `saleIsUnconditional` is **derived** from `saleStatus` (true when `under_contract_unconditional`) — it is NOT a user-facing Y/N radio and does NOT exist as a standalone state field.

§5 Multi-Offer Scenario Acknowledgment (always visible, amber container):
- Warning banner explaining competitive multi-offer scenario
- Three required checkboxes (`multiOfferCheckHighest`, `multiOfferCheckDiscretion`, `multiOfferCheckConfidential`); all three must be checked for the form to submit.

Subject to Finance sub-panel (visible when `cashBuyer = No` and `subjectToFinance = Yes`) contains: pre-approved Y/N, approval days select (7/14/21), bank name, bank contact name/phone/email.

### `offer_form_submissions` columns (full set post-2026 migration)

**Backwards-compat (original columns, still populated):**
- `buyer1_name`, `buyer2_name` — populated from `buyers[0].name` and `buyers[1]?.name` respectively (for legacy admin display).
- `buyer_address`, `buyer_phone`, `buyer_email` — **no longer submitted by the 2026 form**; these DB columns remain for existing rows and admin endpoint backwards-compat.
- `offer_amount`, `is_cash_buyer`, `settlement_period`, `settlement_date` (ISO date string from the date picker, e.g. `"2026-08-15"`; stored alongside `settlement_period` which holds the human-readable days count + day name), `is_subject_to_sale`, `sale_property_status`, `sale_settlement_date`, `is_subject_to_finance`, `finance_pre_approved`, `finance_days_to_approve`, `finance_bank`, `finance_bank_phone`, `solicitor_name`, `solicitor_phone`, `solicitor_address`, `solicitor_email`

**New columns added in 2026 migration:**
- `buyers_json` (jsonb) — full buyers array `[{id, name, phone, email, address}]`. Source of truth for the dynamic multi-buyer model.
- `signatures_json` (jsonb) — full signatures array `[{buyerId, buyerName, data, method, signDate}]` where `data` is a base64 PNG from `canvas.toDataURL()` (Draw mode) or empty string (Type mode stores only the text, not rendered).
- `building_pest_inspection` (citext) — `"no"` / `"7_days"` / `"14_days"`.
- `waive_cooling_off` (boolean) — whether buyer waived the statutory cooling-off period. The **number of days** is resolved from this flag plus the property type, see **Cooling-off period resolution** below.
- `total_deposit`, `initial_payment`, `second_payment` (citext) — deposit split amounts as entered.
- `extra_comments` (text) — Section 6 free-text (renumbered from §5 in 2026 redesign; §5 is now multi-offer).
- `multi_offer_check_highest`, `multi_offer_check_discretion`, `multi_offer_check_confidential` (boolean, default false) — the three required §5 multi-offer acknowledgment checkboxes; all must be true for submission.
- `sale_property_address` (text) — address of property to be sold.
- `sale_days_before_listing_live`, `sale_days_to_get_sale_contract`, `sale_days_to_get_unconditional_contract`, `sale_days_to_settle_existing_property` (integer) — timeline metrics.
- `sale_is_unconditional` (boolean) — whether the buyer's existing sale contract is already unconditional.
- `sale_unconditional_date`, `sale_buyer_settlement_date` (citext) — date strings for the sale under-contract sub-panel.
- `sale_active_conditions` (text[]) — active conditions on the buyer's existing contract (values: `"finance"`, `"building_pest"`, `"sale_of_property"`, `"other"`).
- `sale_conditions_elaboration` (text) — elaboration on "other" conditions.
- `sale_free_appraisal` (boolean) — whether buyer wants a free market appraisal from My Panda Realty.
- `finance_bank_contact_name`, `finance_bank_contact_email` (citext) — bank contact details (phone is stored in `finance_bank_phone`, already existed).

### On submission (`POST /api/offer-form/[token]`)

1. **Raw submission stored** — `offer_form_submissions` row is upserted (DELETE old + INSERT new) keyed by `offer_form_token_id`. Latest submission always wins.
2. **Entity record updated** — `entities.entity_name`, `contact`, `email_address`, `address` are patched with submitted values from `buyers[0]` (only non-empty fields overwrite).
3. **Buyer offer upserted** — `buyer_offers` row for the `property_entity_id` is updated (or created) with `offer`, `is_cash_offer`, `finance_days`, `subject_to_sale_days`, `subject_to_sale_stage`.
4. **Pipeline auto-advance** — calls `maybeAdvanceBuyerPipelineOnOfferInTx`; advances to "Offer Made" only when offer amount parses to a positive number AND current stage is `null` or "Enquiry".
5. **PDF generation** — `generateAndUploadOfferFormPdf` fills the Pro Forma Contract 2026 PDF template (Drive file ID from `property_forms`), uploads the filled copy to Google Drive under `Property Offers/{propertyListId}/`, and returns the `webViewLink`.
6. **Agent notification** — fire-and-forget Gmail to `admin@mypandarealty.com.au` (`AGENT_NOTIFICATION_EMAIL`) notifying buyer name + offer amount + property + Drive PDF link.

### Buyer 2 prefill

The offer form GET prefills `buyer2Name` from `entity_members.member_name` (the `memberName` column) where `entity_members.entity_id = entities.entity_id`. **Do not JOIN `entity_members → entities`** on `entity_members.entity_id = entities.entity_id` and then select `entities.entity_name` — that returns the parent entity name (= Buyer 1). Select `entity_members.member_name` directly from `entity_members` filtered by `entityId`.

### Successful Buyer rows = one per member

In the property Edit dialog, the **SUCCESSFUL BUYER** section renders one editable row per `entity_members` row of the accepted buyer entity (Name/Address/Phone/Email), mirroring the OWNER INFORMATION (seller) rows — not a single entity-level row. Member field edits save to `entity_members` (not `entities`). A buyer with zero members falls back to an editable enquiry-name row backed by the entity.

Which member is the **primary phone / primary email** contact is stored on the buyer entity via `entities.primary_phone_member_id` and `entities.primary_email_member_id` (bigint FK → `entity_members.entity_member_id`, `ON DELETE SET NULL`). These are independent (phone and email can point to different members). When unset, the UI defaults the highlight to the buyer's representative member (`is_buyers_representative`), else the first member. They are written through the dedicated `app/api/admin/entities/[id]/primary-member` route — **not** the generic entities PATCH, which only accepts `formColumnOrder` columns.

**Successful Buyer edits forward-sync into the offer submission.** Editing a Successful Buyer member field (Name/Address/Phone/Email) writes `entity_members` **and** pushes the value into the latest submitted `offer_form_submissions` row, so the read-only "Offer Form Submission" panel stays consistent. The member row PATCHes the dedicated `app/api/admin/properties/[id]/successful-buyer-member/[memberId]` route (not the generic `entity-members` PATCH used by the Buyers tab / Contacts dialogs). Mapping: non-rep `entity_members` map 1:1 by `entity_member_id` order to `buyers_json[]`; member[0] also mirrors top-level `buyer1_name`/`buyer_email`/`buyer_phone`/`buyer_address`, member[1]'s name → `buyer2_name`. Buyer's-representative members have no `buyers_json` entry and are not synced. The sync direction is one-way (Successful Buyer → submission); the original submitted values are overwritten. Pure mapping logic: `lib/admin/successful-buyer-offer-sync.ts`. **Known gap:** the zero-member entity-level fallback row does not forward-sync (rare edge case).

### Form URL generation

Both `GET /api/admin/property-entities/[id]/offer-form-status` and `POST /api/admin/property-entities/[id]/offer-form-send` build the absolute URL using `process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin`. The local dev fallback derives the origin from the incoming request automatically; set `NEXT_PUBLIC_APP_URL` in production if you want an explicit value.

Token lookup is shared via `apps/panda-realty/lib/offer-form-token.server.ts` (`getOrCreateOfferFormToken`) — finds the existing token for the buyer+property pair or inserts a new one.

## Admin native view — buyer offer form (`BuyerOfferNativeView`)

Admins can expand a read-only inline panel below any buyer offer row in the Sales tab of the property dialog. The panel (`BuyerOfferNativeView`, rendered by `buyer-offer-native-view.tsx`) mirrors the public offer form layout but is presented inside the admin shell.

### Section 2 — Solicitor Details

Section 2 shows **two sub-groups** side by side:

1. **Buyer's Solicitor** — editable fields (name, phone, legal practice address, email). Values come from `offer_form_submissions.solicitor_name/phone/address/email`; the admin can edit and save these.
2. **Seller's Solicitor** — read-only display fields (name, phone, legal practice address, email). Values come from `panda_realty.entities` linked to the property via `property_entities` WHERE `entity_category_id = 4` (Contact) AND `contact_category_id = 1` (Solicitor) **AND `association = 'Seller'`** — a property can hold both the buyer's and the seller's solicitor under the same Solicitor category, distinguished by `entities.association` (the "Seller"/"Buyer" tag shown in the Contacts tab). The lookup is centralised in `lib/admin/seller-solicitor.server.ts` (`fetchSellerSolicitorContact`); it returns null when no seller-tagged solicitor exists and never falls back to another solicitor. These are never editable from this view because they are stored in the entity system, not in the offer submission. The Offer Form Submission summary panel (`buyer-offer-submission-panel.tsx`) also shows this as a "Seller's Solicitor" block, separate from the "Buyer's Solicitor" block (the latter sourced from `offer_form_submissions`).

### `isNotNull(submittedAt)` rule — all admin reads/writes must filter to submitted rows

`offer_form_submissions` can hold multiple rows per property: one **submitted** row (`submitted_at IS NOT NULL`, populated by the buyer's final public form POST) and potentially one or more **draft** rows (`submitted_at IS NULL`, created by draft auto-saves). The highest `offer_form_submission_id` is often the draft.

**Every admin-side read and write on `offer_form_submissions` MUST add `isNotNull(offerFormSubmissions.submittedAt)` to its WHERE clause:**

| Route | Why |
|---|---|
| `GET /api/admin/property-entities/[id]/offer-form-status` | Display panel; must read the submitted row |
| `GET /api/admin/buyer-offers/[id]/form-view` | Native view prefill for admin; must read from submitted row |
| `PATCH /api/admin/buyer-offers/[id]/form-data` | Solicitor + multi-offer UPDATE; must write to submitted row |
| `GET /api/offer-form/[token]` when `viewMode=true` | Token-based admin prefill; add filter only when `viewMode === true` |

**Public form** (`GET /api/offer-form/[token]` when `viewMode=false`): do NOT add the filter — buyer drafts must prefill from the latest row regardless of `submittedAt`.

If no submitted row exists yet and solicitor data arrives via the admin PATCH, the route creates a minimal row with `submittedAt: new Date()` (1B path) so `offer-form-status` can find it.

### Prefill data sources

Two API routes serve the native view prefill:

- **Token-based** (`GET /api/offer-form/[token]?view=1` via `offer-form-get-handler.ts`) — used when a public form token exists.
- **Admin-only** (`GET /api/admin/buyer-offers/[id]/form-view`) — used when accessing via the property dialog Sales tab.

Both routes populate `sellerSolicitorName/Phone/Address/Email` on the returned `PrefillData` object via the shared `fetchSellerSolicitorContact(propertyListId)` helper (`lib/admin/seller-solicitor.server.ts`), which filters the Solicitor contact by `association = 'Seller'`. The Contract for Sale & Purchase prefill (`contract-sale-purchase-prefill.ts`) applies the same `association = 'Seller'` filter for its `sellerSolicitor` (its `buyerSolicitor` comes from the offer submission). The proforma default-strategy `solicitor` in `prefill-data/route.ts` is intentionally NOT seller-filtered — it prefills the buyer-facing offer form's own solicitor field.

### Entity category constants

Shared constants are defined in `apps/panda-realty/lib/admin/entity-category-ids.ts`:
- `ENTITY_CATEGORY_BUYER = 1`
- `ENTITY_CATEGORY_CONTACT = 4`
- `CONTACT_CATEGORY_SOLICITOR = 1`

These constants are imported by `offer-form-get-handler.ts`, `buyer-offers/[id]/form-view/route.ts`, and `property-forms/prefill-data/route.ts`. Do not redeclare them inline in individual files.

## Agents (`panda_realty.agents`)

Agents represent staff members who act as licensees on Form 6 appointments and recipients of agent tasks. Used in admin calendar, property forms prefill, and agent task notifications.

- **`agent_id`** — primary key.
- **`agent_name`** — display name.
- **`email`** — contact email (nullable); also the Gmail notification target for agent tasks.
- **`phone`** — primary contact phone (citext, nullable).
- **`trading_name`** — licensee trading name used in Form 6 Part 2.
- **`licence_number`** — real estate licence number (citext, nullable).
- **`abn`** — Australian Business Number (citext, nullable).
- **`acn`** — Australian Company Number (citext, nullable); optional, not all agents have one.
- **`fax`** — fax number (citext, nullable).
- **`mobile`** — mobile number separate from `phone` (citext, nullable).
- **`address`** — street address of licensee (citext, nullable).
- **`suburb`** / **`state`** / **`postcode`** — licensee address components (citext, nullable).
- **`licence_expiry`** — date the licence expires (date, nullable).
- **`licensee_type`** — citext enum-like value describing the agent type: `"real-estate-agent"`, `"resident-letting-agent"`, `"property-auctioneer"`. Used to pre-check the Part 2 licensee-type checkboxes in the Form 6 fill modal.

`GET /api/admin/agents/options` returns all agents with all columns as a flat array (for dropdowns and prefill). The Form 6 Part 2 agent picker auto-selects the first agent and merges its data into the prefill values on dialog open.

- **Phone → mobile fallback:** when an agent's `mobile` is null or empty, the Form 6 fill modal copies `phone` into the mobile field automatically (in `handleAgentChange` inside `use-property-form-prefill.ts`).

## Property owner extended fields (`panda_properties`)

In addition to `owner{N}name/address/phone/email/mobile/abn`, `panda_properties` stores five additional citext nullable columns per owner slot (owners 1, 2, 3):

| Column pattern | DB column example | Description |
|---|---|---|
| `owner{N}nameline2` | `owner1nameline2` | Second line of owner name (trading-as, company alias, etc.) |
| `owner{N}acn` | `owner1acn` | Australian Company Number |
| `owner{N}gstregistered` | `owner1gstregistered` | "Yes" / "No" / null — whether owner is GST registered |
| `owner{N}address2` | `owner1address2` | Second address line (unit, suite, level) |
| `owner{N}fax` | `owner1fax` | Fax number |

These fields are shown in the **Owner extra-info dialog** for each owner row (`property-owner-more-info--{N}` button). The dialog also shows `mobile` and `abn` for all three owners (owner 1/2/3 are treated identically — no column is owner-1-only).

## Form 6 fill modal — prefill data source (`panda_properties`)

`GET /api/admin/property-forms/prefill-data?prefillStrategy=form-6` reads directly from `panda_properties`:

- **Seller suburb/state/postcode** — copied from `suburb`, `state`, `postcode` on the property record and mapped to both Client 1 and Client 2 in Tab 1 (not parsed from the owner address string, which has no separate columns).
- **Seller mobile** — `owner1mobile` maps directly to `seller1Mobile` with no fallback. If `owner1mobile` is null, the Mobile field opens blank (the phone → mobile fallback that previously existed was removed 2026-05-26). Same for owner 2.
- **RPD → Lot + Plan** — `rpd` (citext) is parsed by `parseRpd()` in the route: slash format (`"30/SP276523"` → lot `"30"`, plan `"SP276523"`), L-prefix (`"L17 RP153495"` → lot `"17"`, plan `"RP153495"`), plan-only (`"SP239098"` → lot `""`, plan `"SP239098"`). Properties where `rpd IS NULL` (e.g. strata units imported without RPD data) have blank Lot/Plan; agents must fill manually.
- **Description 1 (Tab 3)** — pre-filled as `"Sale of {property_type}"` (e.g. `"Sale of House"`, `"Sale of House: Duplex"`). `property_type` is `citext NOT NULL` — always populated from Excel import. Colons and other punctuation in the type are preserved as-is. The PDF "Description 1" AcroForm field receives this value; the PDF "Description 2" field is left blank (the suburb field was removed from both the UI and PDF prefill).
- **`owner{N}abn`** — returned from the API on each seller object, but **not prefilled** into the Form 6 ABN field on open (removed 2026-05-26). The field opens blank so the agent must enter any ABN manually; the sync-back path will still persist whatever value the agent types.
- **Extended fields** — `owner{N}gstregistered` → `sellerNGstRegistered` (pre-filled, stored as `"Yes"/"No"`); `owner{N}address2` → `sellerNAddress2` (pre-filled); `owner{N}fax` → `sellerNFax` (pre-filled). **Not pre-filled (blank on open):** `owner{N}nameline2` → `sellerNNameLine2`; `owner{N}acn` → `sellerNAcn` (both removed from prefill 2026-05-26 — agents must enter these manually).
- **Address (line 1) suburb stripping** — `owner{N}address` is passed through `stripSuburbSuffix(address, resolvedSuburb)` before prefilling. The strip anchor is a **per-seller suburb resolved via `panda_suburbs` table lookup** (2026-05-27): suffix candidates (last 1–4 words of each address) are queried against `panda_suburbs` with `ilike`; `extractSuburbFromAddress` end-matches to find the suburb. If no match is found, falls back to `data.propertySuburb`. `stripSuburbSuffix` uses `lastIndexOf` so suburb-named streets (e.g. `"1 Brisbane Road Brisbane QLD 4000"`) strip correctly. Postcode is extracted via `/\b(\d{4})\b/` last match from the address string. Suburb/state/postcode for the dedicated Tab 1 fields still come from the property record (not from the per-seller lookup). E.g. `"205/46 Amy Street Morayfield, Qld. 4506."` → `"205/46 Amy Street"`. See `form6-prefill.ts` and `prefill-mappers.ts`.
- **`appraised_amount`** — maps to Tab 4 Section 3 `$ amount`, formatted as `980,000.00`; auto-ticks the "List" checkbox when present. When `appraised_amount` is null, `$ amount` opens blank and "List" is unchecked — there is no fallback to `sale_price`. Updated 2026-05-27.
- **Part 6 client/agent name** — `part6ClientName`, `part6ClientName2`, `part6ClientName3` map to `sellers[0..2].entityName` (owners 1–3); all three slots are always shown in the UI as separate editable inputs with AND labels between them. The PDF "Client" AcroForm field receives all non-empty names joined with `" AND "` (e.g. `"JOHN SMITH AND JANE SMITH AND BOB JONES"`). `part6AgentName` maps to the selected agent's `agentName` and updates automatically when the agent is changed in Tab 2 via `handleAgentChange`.
- **Part 9 signature blocks** — `client1FullName1` maps to `sellers[0].entityName` (owner 1); `client2FullName1` maps to `sellers[1].entityName` (owner 2, blank when absent); `agentFullName1` maps to the selected agent's `agentName` and updates with `handleAgentChange`. Line-2 fields (`client1FullName2`, `client2FullName2`, `agentFullName2`) are always blank on open.

## Property form sends — `prefill_values` persistence

`panda_realty.property_form_sends` stores a filled form's prefill data alongside the Drive file link so that history entries can be re-edited later.

- **`prefill_values` (jsonb, nullable):** the key-value map used to generate the filled PDF — same shape as the `prefillValues` body sent to `POST /api/admin/property-forms/send`. Persisted on both the email-send and save-to-drive paths. `null` for rows created before 2026-05-27 (legacy rows cannot be re-edited).
- **Edit in-place:** `PATCH /api/admin/property-form-sends/:id` accepts a new `prefillValues` map, generates a fresh Drive PDF with `fillAndUploadToDrive` (shared from `lib/pdf-fill-and-upload.ts`), and overwrites `drive_file_link` + `prefill_values` on the existing row. The old Drive file is **not** deleted — it remains in Google Drive but is dereferenced from the DB row.
- **Send from history:** `POST /api/admin/property-form-sends/:id/resend` emails the existing `drive_file_link` to arbitrary addresses (not limited to original recipients). Does not create a new row.
- **Edit button visibility rules:** shown only when `hasPrefillFillStep(prefillStrategy)` is true (strategies `form-6` or `contract-sale-purchase-1`) AND `prefill_values IS NOT NULL`. Rows with null values show a UX note ("ⓘ No saved values — this entry cannot be re-edited.") but no Edit button.
- **Save-to-Drive refresh:** after a "Save to Drive" action, `handleSaveToDrive()` calls `onSent()` to refresh the send history list immediately (without closing the dialog).

## Form 6 → `panda_properties` sync-back

After a successful Form 6 **Send** (`POST /api/admin/property-forms/send`) or **Save as Template** (`POST /api/admin/property-forms/template`) with `prefillStrategy = "form-6"`, the server writes non-empty `prefillValues` fields back to `panda_properties`:

- Seller 1 fields (`seller1Name`, `seller1NameLine2`, `seller1Abn`, `seller1Acn`, `seller1GstRegistered`, `seller1Address`, `seller1Address2`, `seller1Phone`, `seller1Mobile`, `seller1Email`, `seller1Fax`) map to `owner1name`, `owner1nameline2`, `owner1abn`, `owner1acn`, `owner1gstregistered`, `owner1address`, `owner1address2`, `owner1phone`, `owner1mobile`, `owner1email`, `owner1fax`.
- Same mapping for Seller 2 → `owner2*` columns.
- **Non-empty only**: a blank value in Form 6 (e.g. the agent left ACN empty) does **not** overwrite an existing DB value. This prevents accidental data loss when the field was pre-filled from the DB and the agent didn't type over it.
- **Template path**: the template POST body must include `propertyListId` and `prefillStrategy` for sync to run; older clients that omit these fields are silently skipped.
- **Sync helper**: `buildOwnerSyncSetFromPrefillValues()` in `send/route.ts` and `template/route.ts` filters the flat `prefillValues` record down to non-falsy owner key-value pairs.

## Agent notes

**Buyer offers (admin):** deleting a saved offer calls `DELETE /api/admin/buyer-offers/:id` (`relatedInlineImmediateDeleteViaChildApi`). Saving offer rows triggers a follow-up `PATCH /api/admin/property-entities/:id` (`buyerOffers`): `adminEntityEditPatchSuccessFollowup` when editing from `/admin/entities`, `adminNestedEntityEditPatchSuccessFollowup` when Edit Buyer opens nested from a property row (`apps/panda-realty/lib/admin/admin-client-registry-provider.tsx`).

**Google Contacts create trigger:** `POST /api/admin/entities` fires `syncEntityToGoogleContacts` for the newly created row. Client-side warning emission uses `adminEntityCreateSuccessFollowup` (in `AdminClientRegistryValue`, `packages/admin/admin-client-registry-context.tsx`) — registered in `apps/panda-realty/lib/admin/admin-client-registry-provider.tsx` to call `emitGoogleContactsPatchWarnings`. Both standalone create (`use-admin-entity-admin.ts`) and nested create (`admin-nested-entity-crud.tsx`) invoke this callback.

**Playwright:** `apps/panda-realty/e2e/global-setup.ts` runs `e2e/scripts/seed-sellers-pipeline-accepted-offer.mjs` when `DATABASE_URL` is set — see `apps/panda-realty/.env.example` and `docs/CI.md`. Properties map filter — leaflet.draw polygon flow (mocked `GET /api/streets`): dialog/cancel/clear tests in `e2e/property-map-filter.spec.ts`; full 11-test leaflet.draw suite in `e2e/property-map-filter-draw.spec.ts`; map interaction helpers in `e2e/helpers/map-filter-draw.ts`; stable selectors `property-map-filter-*`. Sellers property sheet → admin edit (new tab): `e2e/pipeline-property-panel-address-open-edit.spec.ts`, selector `property-detail-panel-address-open-edit`.

## Seller portal — access rules

The seller portal (`/portal/seller/[token]`) gives the property seller a read-only view of their deal. Key visibility rules:

- **Sale price**: `panda_properties.sale_price` is shown to sellers (formatted as AUD currency). It is **not** shown to buyers on the buyer portal. Hiding this from buyers is intentional — the sale price reflects the final negotiated price which sellers need to track but buyers should not see in the portal context.
- **Offer history**: sellers see all-time buyer offers for their property (buyer name, amount, date, cash/conditions, accepted indicator). Buyers do not see this list.
- **Conditions timeline**: sellers see the accepted buyer's condition due-dates (same data as the buyer sees). The timeline reads the current deal's accepted offer, ordered `isAccepted DESC, dateOffered DESC`. Events are generated by `computeConditionEvents` in `admin/properties/board/compute-condition-events.ts` from a `ConditionOfferFields` object. **When adding a new `buyer_offers` column to the timeline**, update `ConditionOfferFields`, emit the event in `computeConditionEvents`, and add the column to the `buyerOffers` SELECT in: `portal/[token]/page.tsx`, `portal/seller/[token]/page.tsx` + its `conditionOffer` literal, `portal/seller/[token]/_components/seller-tabs-client.tsx` (`ConditionOffer` type), and `admin/calendar/queries.ts`. See `discoveries/panda-condition-offer-fields-extension-pattern.md`.
- **Documents**: each file (`property_list_files`, `property_entity_files`) has two independent boolean flags: `shared_with_portal` (for buyers) and `shared_with_seller` (for sellers). Toggling one has no effect on the other. Admin sets each flag separately via the two-switch file row UI.
- **Messages**: seller and buyer messaging threads are completely independent. Both use the same messages API (`/api/portal/[token]/messages`), which is role-agnostic and scopes the thread to the token UUID. Richard sees both threads in admin under separate tabs.
- **File proxy**: the seller file proxy (`/api/portal/seller/[token]/files/[kind]/[fileId]`) guards files by `sharedWithSeller`. The buyer proxy (`/api/portal/[token]/files/[kind]/[fileId]`) guards by `sharedWithPortal`. A file shared only with the seller cannot be accessed via the buyer proxy URL, and vice versa.

### Seller portal tokens

Seller portal tokens (`portal_tokens` where `role = 'seller'`, keyed by `property_list_id`) share the same table and revocation mechanism as buyer tokens. Key differences:

- **Generate (idempotent):** `POST /api/admin/portal-tokens/seller` with `{ propertyListId }`. Returns the existing non-revoked seller token if one exists; otherwise inserts a new UUID token row.
- **Read (admin):** `GET /api/admin/portal-tokens/seller?propertyListId=<id>` returns the most recent seller token row or `null`. Panel state is derived from `revokedAt`.
- **Revoke:** same `PATCH /api/admin/portal-tokens/:id` as buyer tokens.

### Contract Crash

**`POST /api/admin/properties/[id]/contract-crash`** — atomically resets a property when a deal falls over. All 9 steps execute inside a single DB transaction; any failure rolls back all changes.

1. Find the currently accepted `buyerOffer` for the property — return **409** if none exists.
2. Set `buyerOffers.isAccepted = false` (un-accept the offer so a new one can be accepted immediately).
3. Set `panda_properties.deal_stage_status_id = null` (reset the deal pipeline stepper to clean state).
4. Set `portal_tokens.revoked_at = now()` for the buyer's token (`role = 'buyer'`, `property_entity_id` matches the crashed offer's buyer).
5. Set `property_entity_files.shared_with_portal = false` for all files belonging to the crashed buyer's `property_entity_id`.
6. Set `property_list_files.shared_with_portal = false` for all files belonging to the property (`property_list_id`).
7. Set `portal_tokens.revoked_at = now()` for the current seller token (`role = 'seller'`, `property_list_id` matches, `revoked_at IS NULL`).
8. Insert a new seller portal token (fresh UUID, `role = 'seller'`, `property_list_id` matches).
9. Return `{ sellerToken }` — the UI updates the panel link immediately.

**Key rules:**
- `shared_with_seller` flags are **not** reset — seller file visibility is preserved.
- If no active buyer token exists, steps 4–5 are skipped silently (no error).
- If no active seller token exists, step 7 is skipped silently.
- Triggered from the **Seller portal access panel** in the Owners tab (not the deal stepper).
- Admin UI: `portal-seller-crash-btn` opens a confirmation dialog listing all 6 actions before executing.

## Adobe Sign — e-signature workflow (`panda_realty.portal_file_sign_requests`)

Richard can send any "shared with portal" file for e-signature from the buyer's Portal tab in the admin panel. The signing workflow is implemented as a distinct lifecycle tracked in `portal_file_sign_requests`.

### `portal_file_sign_requests` columns

| Column | Type | Notes |
|---|---|---|
| `id` | bigint PK | Row ID, used as `requestId` in remind/cancel API routes |
| `portal_token_id` | bigint FK | Links to the buyer's portal token (and thus their property) |
| `file_id` | text | Google Drive file ID (same value as in `property_list_files`/`property_entity_files`) |
| `adobe_sign_agreement_id` | text | Agreement ID returned by Adobe Sign at creation time |
| `signature_status` | text | `'pending'` → `'signed'` or `'cancelled'` (DB check constraint) |
| `signer_email` | text | Buyer's email address at time of sending (snapshot — not updated if email changes) |
| `created_at` | timestamptz | When the sign request was created |
| `signed_at` | timestamptz | Set by webhook or sign-status fallback when Adobe Sign reports SIGNED |
| `cancelled_at` | timestamptz | Set when admin cancels or webhook reports DECLINED / RECALLED |

### Status lifecycle

```
(file shared, no sign request) → Send for signature → pending
    pending → signed       (via webhook AGREEMENT_ACTION_COMPLETED or sign-status fallback)
    pending → cancelled    (via webhook AGREEMENT_ACTION_DECLINED/RECALLED, or admin Cancel button)
```

- A file can have **multiple** sign request rows over time (if resent after cancellation). The latest row (highest `id`) for a `(portal_token_id, file_id)` pair is authoritative for the UI.
- `signature_status` is constrained to `('pending', 'signed', 'cancelled')` — declined and recalled are both mapped to `'cancelled'` for simplicity.

### Status reconciliation — two delivery paths

1. **Webhook (primary)** — Adobe Sign POSTs to `POST /api/webhooks/adobe-sign` on each status change. The handler matches the agreement ID, updates `signature_status` + timestamps, and downloads the signed PDF to Google Drive on completion. Always returns 200 to Adobe Sign (idempotent; no-op for unknown agreement IDs).
2. **sign-status fallback (secondary)** — `GET /api/admin/portal-tokens/[id]/sign-status` is called fire-and-forget on every component mount. It polls `GET /agreements/{id}` for each pending sign request and reconciles the DB if the webhook was missed. Non-fatal: errors per-agreement are logged and skipped.

### Key rules

- **Mock mode** (`ADOBE_SIGN_TEST_MODE=true`): all client functions return deterministic fake responses without touching Richard's Adobe Sign account. Must short-circuit before any network call.
- **Auth**: IMS implicit flow with `ADOBE_SIGN_IMS_SID` cookie. Token cached 55 minutes in the module-level `cachedToken` variable (Next.js server process scope). When the IMS session expires (typically weeks), refresh by re-running the Playwright setup against acrobat.adobe.com.
- **One active agreement per file**: the UI shows the latest sign request per file. Richard can re-send a previously-cancelled file, creating a new `portal_file_sign_requests` row.
- **Reminder**: `POST /api/admin/sign-requests/[requestId]/remind` — only valid for `pending` agreements. Returns 422 if already signed/cancelled.
- **Cancel**: `DELETE /api/admin/sign-requests/[requestId]` — only valid for `pending` agreements. Calls Adobe Sign first, then updates DB (Adobe Sign state is authoritative if DB update fails).
- **Admin panel location**: buyer entity dialog → Portal tab → Shared documents section (`portal-shared-documents-section` component, rendered outside the portal-access-panel).

### Portal client UI (Phase 3g)

The buyer portal page (`/portal/[token]`) shows sign status directly on document rows:

- **Pending**: "Sign required" badge + "Sign document" button. Clicking calls `GET /api/portal/[token]/sign-url/[driveFileId]` which validates the token, finds the latest `pending` sign request for that Drive file, calls `getSigningUrl(agreementId)`, and returns `{ url }`. The client opens the URL in a new tab. Adobe Sign handles the signing UX.
- **Signed**: Green "Signed" badge + `signedAt` date (en-AU format). No action button.
- **Cancelled**: "Signing cancelled — contact your agent". No action button.
- **No sign request**: No badge, just View/Download as usual.

After signing, the buyer must reload the portal page to see the Signed badge (server-rendered RSC — no real-time update).

`GET /api/portal/[token]/sign-url/[driveFileId]` — public (token-based auth only, no admin session). Returns 403 for revoked token, 404 for unknown token or no pending sign request.
