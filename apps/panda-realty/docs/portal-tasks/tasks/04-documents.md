# 04 — Documents Section + "Share with Client" Toggle

Context: Clients see files Richard has explicitly shared with them from the entity and property file libraries. Sharing is controlled by a per-file toggle in the admin panel. Files are served through the app — Drive URLs are never exposed to the client.

Parent: [task-list.md](../task-list.md)

---

## Decisions

- **Toggle columns** — two booleans per file: `sharedWithBuyer` and `sharedWithSeller` (both default false). Buyers see files where `sharedWithBuyer = true`; sellers see files where `sharedWithSeller = true`. *(Phase 1 implemented `sharedWithPortal` as a single toggle — Phase 4 will split this into two columns.)*
- **File proxy** — client requests hit `/api/portal/[token]/files/[fileId]`; the server validates the token and `sharedWithPortal = true` before fetching from Drive and streaming back. Drive URL never leaves the server.
- **File size limit** — 100 MB already enforced in the Drive client. No change needed.
- **Client actions** — View (opens in browser via proxy) and Download only. No upload, no delete.
- **Date added** — show `createdAt` of the file record so clients can see when a document was shared.

---

## Tasks

- [x] Run SQL to add `sharedWithPortal` boolean column (default false) to entity files table
- [x] Run SQL to add `sharedWithPortal` boolean column (default false) to property files table
- [x] Update drizzle schema for both tables to include `sharedWithPortal`
- [x] Add "Share with client" toggle UI to entity files admin panel
- [x] Add "Share with client" toggle UI to property files admin panel
- [x] Create admin API route to patch `sharedWithPortal` on entity and property file records
- [x] Extend portal token GET handler to return files where `sharedWithPortal = true` (from both entity and property file tables, merged and sorted by `createdAt`)
- [x] Create file proxy route `apps/panda-realty/app/api/portal/[token]/files/[kind]/[fileId]/route.ts` — validates token + file belongs to that entity/property + `sharedWithPortal = true`, then streams file from Google Drive
- [x] Build `PortalDocuments` component in `apps/panda-realty/app/portal/[token]/_components/documents.tsx` — list with filename, date added, View and Download buttons
- [x] View button opens proxy URL in new tab; Download button triggers browser download via proxy with `Content-Disposition: attachment`
- [x] Handle empty state: "No documents have been shared yet"
- [x] Run `npm run typecheck -w panda-realty` — exits 0
