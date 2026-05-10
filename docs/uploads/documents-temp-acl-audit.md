# Write-side audit: `documents/*` and `temp/*` upload prefixes

Follow-up to PR #415 (per-resource ACL for `/uploads/*`). The merged ACL helper
treats `documents/*` and `temp/*` as "uploader OR admin only" because no
owning-entity model with a staff relation was identified for those folders.

This document inventories every code path that *writes* uploads — to determine
whether anything actually lands under `uploads/documents/*` or `uploads/temp/*`
today, and what each writer's logical owner is, so the right ACL model can be
chosen.

**Scope:** investigation only. No code, model, or migration changes.

---

## 1. Mental model

Two things in the codebase share the names `documents` and `temp` and they are
**not the same thing**:

1. **Disk directory** (a.k.a. URL prefix). Selected by the `uploadType` argument
   passed to `FileUploadService.uploadFile(file, uploadType, ...)` /
   `createUploadMiddleware(uploadType, ...)`. Valid values are the keys of
   `UPLOAD_CONFIG.directories` in
   `service.backend/src/services/file-upload.service.ts:32-40`:
   `pets | applications | chat | profiles | documents | temp`. The chosen
   directory becomes the URL prefix served at `/uploads/<dir>/<file>`.
2. **`FileUpload.entity_type`** column. A Postgres enum defined in
   `service.backend/src/models/FileUpload.ts:138`:
   `'chat' | 'message' | 'application' | 'pet' | 'user' | 'rescue'`. **Neither
   `'documents'` nor `'temp'` is a valid `entity_type`** — the database CHECK
   would reject them.

The ACL helper (`service.backend/src/services/upload-acl.service.ts`) keys off
the **URL prefix** (the disk directory), not `entity_type`. So the audit
question is: *what production code paths cause a file to be placed under
`uploads/documents/*` or `uploads/temp/*` at write time?*

---

## 2. Inventory of write sites

### 2.1 Production write sites that hit `FileUploadService.uploadFile`

There are exactly two production callers of `FileUploadService.uploadFile`
(grep `FileUploadService.uploadFile` outside `__tests__/`):

| File:line                                                                      | Caller / endpoint                              | uploadType (disk dir) | entity_type written | entity_id source           | Logical owner                | Recommended ACL                                        |
| ------------------------------------------------------------------------------ | ---------------------------------------------- | --------------------- | ------------------- | -------------------------- | ---------------------------- | ------------------------------------------------------ |
| `service.backend/src/controllers/application.controller.ts:680`                | `addDocument` — `POST /applications/:id/document` | `applications`        | `application`       | `req.params.applicationId` | The application              | Already covered (`applications/*` → owner / staff / admin) |
| `service.backend/src/controllers/chat.controller.ts:1083`                      | chat attachment upload — `POST /chats/:id/attachments` | `chat`         | `chat`              | `req.params.conversationId`| The chat conversation        | Already covered (`chat/*` → participant / admin)        |

**Both production write paths target `applications/` and `chat/` only.** Neither
ever writes to `documents/*` or `temp/*`.

### 2.2 Direct `createUploadMiddleware('documents'|'temp', ...)` usage

`grep "createUploadMiddleware('documents'|createUploadMiddleware('temp'"` →
**zero hits in `service.backend/src`.** Only the four pre-configured
middlewares are exported (`petImageUpload`, `applicationDocumentUpload`,
`chatAttachmentUpload`, `profileImageUpload`) and none of them use
`'documents'` or `'temp'`.

### 2.3 Direct `FileUpload.create(...)` outside the service

| File:line                                                                                  | Context                            | entity_type written | file_path written                                                                  | Reaches `documents/`? |
| ------------------------------------------------------------------------------------------ | ---------------------------------- | ------------------- | ---------------------------------------------------------------------------------- | --------------------- |
| `service.backend/src/seeders/20250111-file-uploads-seeder.ts:5-88`                         | dev seed (4 sample rows)           | `chat`, `pet`, `application` | `/uploads/chat/...`, `/uploads/pets/...`, `/uploads/applications/...`              | No                    |
| `service.backend/src/seeders/18-emily-dog-conversation.ts:294`                             | demo conversation seed             | `chat`              | `uploads/chat/...`                                                                 | No                    |
| `service.backend/src/seeders/19-emily-rabbit-conversation.ts:313`                          | demo conversation seed             | `chat`              | `uploads/chat/...`                                                                 | No                    |
| `service.backend/src/seeders/fixtures/emily-conversation.ts:292`                           | demo conversation seed             | `chat`              | `uploads/chat/...`                                                                 | No                    |
| `service.backend/src/seeders/fixtures/emily-conversation-2.ts:293`                         | demo conversation seed             | `chat`              | `uploads/chat/...`                                                                 | No                    |
| `service.backend/src/seeders/fixtures/emily-attachment-test.ts:405`                        | demo conversation seed (8 attachments) | `chat`          | `uploads/chat/...`                                                                 | No                    |

**No seeder creates a `FileUpload` row whose `file_path`/`url` lives under
`documents/*` or `temp/*`.**

### 2.4 String-only references to `/uploads/documents/*` (no `FileUpload` row)

| File:line                                                       | Context                                                                                       | Logical owner       | Notes |
| --------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | ------------------- | ----- |
| `service.backend/src/seeders/09-applications.ts:616`            | A document URL embedded in `Application.documents` JSON column (`file_url: '/uploads/documents/therapy_certification_doc-0.pdf'`) | The application     | **No matching `FileUpload` row is seeded** — this is dangling demo data. After PR #415, requesting that URL (as anyone) would: pass the auth gate → ACL helper looks up `FileUpload` by `stored_filename: 'therapy_certification_doc-0.pdf'` → not found → **404**. |

The application document feature itself (production code path 2.1, row 1)
writes to `applications/*`, not `documents/*`. Only this one stale seeder string
references the `documents/*` prefix in production source.

### 2.5 Test-only writes to `'documents'`

| File:line                                                                | Context                                                                       |
| ------------------------------------------------------------------------ | ----------------------------------------------------------------------------- |
| `service.backend/src/__tests__/services/file-upload.service.test.ts:205` | unit test exercising "text/plain has no magic bytes" path; passes `'documents'` to `FileUploadService.uploadFile` with no `entityType`, no `entityId`. Filesystem ops are mocked. |
| `service.backend/src/__tests__/services/file-upload.service.test.ts:226` | unit test exercising "text/csv has no magic bytes" path; same shape as above. |

These never hit the real disk and don't create real DB rows; they only prove
the service contract accepts the `'documents'` directory key.

### 2.6 The (apparently) dead `LocalStorageProvider`

`service.backend/src/services/storage/local-storage-provider.ts` defines
`LocalStorageProvider`, an alternative storage class whose `uploadFile`
defaults its `category` argument to `'documents'` (line 37) and whose
`ensureUploadDirectory` creates `documents/` and `temp/` on disk (lines 23-24).

| File:line                                                                       | Behaviour                                                                                                                                                                       |
| ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `service.backend/src/services/storage/local-storage-provider.ts:33-72`          | Writes a buffer to `<uploadDir>/<category>/<uuid><ext>` (default category `'documents'`). **Does not insert a `FileUpload` row, does not record entity\_id/entity\_type, does no audit log.** |

Grep `LocalStorageProvider|local-storage-provider` shows **zero importers**.
Class is exported but never instantiated. It is the only code in the repo that
creates the `documents/` and `temp/` directories on disk and the only code that
defaults to writing into `documents/`. As written, if it were ever wired up, it
would produce files that the upload-ACL helper has no way to authorise (no DB
row → 404 by the helper's fail-closed rule).

---

## 3. Cross-reference: which `entity_type` writes to which prefix?

| Prefix on disk         | `entity_type` values observed in writers                                                  |
| ---------------------- | ----------------------------------------------------------------------------------------- |
| `pets/*`               | `pet` (seeder); production has no real writer beyond pre-configured `petImageUpload` middleware which does not yet appear at any route call site. |
| `applications/*`       | `application` (production: `application.controller.ts:680`; seeder)                       |
| `chat/*`               | `chat` (production: `chat.controller.ts:1083`; multiple seeders)                          |
| `profiles/*`           | none observed in production controllers; pre-configured `profileImageUpload` middleware is exported but not wired to any route. |
| `documents/*`          | **none** in production code. Only: tests with no `entityType`; one stale seeder string in `09-applications.ts:616`; the dead `LocalStorageProvider`. |
| `temp/*`               | **none** in production code at all.                                                       |

There are **no cases of the same `entity_type` writing to multiple prefixes** in
production. `application` only ever writes to `applications/*`, `chat` only ever
writes to `chat/*`.

---

## 4. ACL columns / fields already on `FileUpload`

Per `service.backend/src/models/FileUpload.ts`: no dedicated ACL/visibility/owner
columns beyond what the helper already uses. The full column list is
`upload_id`, `original_filename`, `stored_filename`, `file_path`, `mime_type`,
`file_size`, `url`, `thumbnail_url`, `uploaded_by`, `entity_id`, `entity_type`,
`purpose`, `metadata`, `created_at`, `updated_at`. No `acl`, `access`,
`visibility`, or `owner_user_id` field exists. `metadata` is a free-form
`JsonObject` and could carry extra keys but nothing today reads access info
from it.

---

## 5. Recommended ACL model per write site

Because **no production writer targets `documents/*` or `temp/*`**, the ACL
posture for those prefixes is governed by what *might* land there in the
future, not by what does today. With that in mind:

| Write site                                                            | Recommendation                                                                  | Rationale                                                                                                                                                                                                                                                |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `application.controller.ts:680` (writes `applications/*`, `entity_type=application`) | Keep as-is — `applications/*` ACL already correct.                              | Already routed through PR #415's owner-or-staff-or-admin check.                                                                                                                                                                                          |
| `chat.controller.ts:1083` (writes `chat/*`, `entity_type=chat`)       | Keep as-is — `chat/*` ACL already correct.                                      | Already routed through PR #415's participant-or-admin check.                                                                                                                                                                                              |
| Stale seeder string `09-applications.ts:616` (`/uploads/documents/therapy_certification_doc-0.pdf`) | Move to `applications/*` (rename the path string in the seeder's JSON). | The owning entity is the application this `documents` array is on. Re-categorising the path (and ideally seeding a real `FileUpload` row with `entity_type=application` and `entity_id=<that application>`) would put it under the existing applications ACL. Today the URL 404s for everyone via the helper, so this is a correctness fix, not a security regression. |
| `LocalStorageProvider` (dead, currently unreferenced)                 | No ACL change. Either delete (if confirmed dead) or, before any caller is wired up, decide whether it should write through `FileUploadService` so that uploads gain a `FileUpload` row + entity link. | It bypasses the audit/DB-row pipeline entirely. Writing files without a `FileUpload` row makes them un-authorisable by the current ACL helper (which fails closed → 404). So any future use must either (a) reuse `FileUploadService.uploadFile` and target an existing `entity_type`, or (b) add a per-record ACL column.   |
| Unit tests at `file-upload.service.test.ts:205,226`                   | Keep as-is or change `'documents'` → `'pets'`/`'applications'` for clarity.     | Tests just exercise the magic-byte path; the chosen directory is incidental. Not an ACL question.                                                                                                                                                        |

**Summary by recommendation category** (counting the production-relevant write
sites listed in §2.1, §2.4, §2.6):

- **Move to `applications/*`** — 1 write site (`09-applications.ts:616` seeder string).
- **Keep as-is (already correct under existing prefix ACL)** — 2 write sites
  (`application.controller.ts:680`, `chat.controller.ts:1083`).
- **No ACL change needed (dead code)** — 1 write site (`LocalStorageProvider`).
- **Add per-record ACL column** — 0 write sites today.
- **Keep uploader-only (genuinely private)** — 0 write sites today.

Test-only sites in §2.5 are excluded from these counts.

---

## 6. Migration sketches (descriptive, no SQL)

### 6.1 The stale seeder string

- **Predicate:** the single document object in
  `seeders/09-applications.ts:611-619` whose `file_url` starts with
  `/uploads/documents/`.
- **Action:** in the seeder source, rewrite the URL to live under
  `/uploads/applications/...`. If we want the file to be ACL-resolvable in dev,
  also emit a corresponding `FileUpload` row (mirroring the pattern already
  used by `seeders/20250111-file-uploads-seeder.ts`) with
  `entity_type='application'`, `entity_id=<the seeded application's id>`,
  `purpose='document'`.
- **Runtime data impact:** none in any environment that re-seeds from scratch.
  Long-running databases that ran the existing seeder once would already have
  the stale URL embedded in `Application.documents` JSON for that one demo
  application; the string would need to be rewritten in place, but **only for
  rows where `documents[*].file_url` matches `/uploads/documents/...`**. The
  scope is the demo seed data only — not real adopter uploads.

### 6.2 Other folder-level migrations

There is no production user data sitting in `documents/*` or `temp/*` today
(no `FileUpload` row references those paths, no production controller writes
there, the dead `LocalStorageProvider` is never called). So **no data
migration is required to harden the ACL** at this time. The current
"uploader-or-admin" rule for those prefixes is a safe default for an empty
namespace.

If `LocalStorageProvider` (or any other writer) is later wired up and starts
producing files there, this audit needs to be re-run.

---

## 7. Open questions before any change lands

1. **Is `LocalStorageProvider` dead code or planned-but-unwired?** If dead,
   delete it (separate PR) so the `documents/`/`temp/` directories stop being
   created on disk for no purpose, and so future readers don't assume there's
   a real writer there. If planned, what entity will it be linked to, and does
   that entity have a staff relation we can reuse?
2. **Should `documents/*` and `temp/*` be removed from the
   `UPLOAD_CONFIG.directories` map** in
   `file-upload.service.ts:32-40` if no production caller targets them? Removing
   them eliminates the configuration footgun (a future contributor could pass
   `'documents'` as `uploadType` and end up with files in an under-secured
   directory). This would be a small refactor, not an ACL change.
3. **Are there any out-of-tree consumers** (cron jobs, ops scripts, manually
   uploaded files, S3 sync from a previous deploy) that placed files under
   `uploads/documents/` or `uploads/temp/` in production? If yes, those files
   have no `FileUpload` row and would 404 today via the ACL helper — is that
   the intended outcome, or do those files need a backfill?
4. **For the stale seeder string fix (§6.1):** are the seeded URLs ever sent to
   real clients (e.g. via demo-tenant onboarding emails)? If so, rewriting the
   path may break links in those clients. If purely internal demo data, it's
   safe to rename freely.
5. **Is admin/moderator read-through on `documents/*` and `temp/*` deliberate
   today?** The helper grants admins/moderators 200 on private prefixes
   (`upload-acl.service.ts:134-136`). This is the only read path through those
   folders that exists in production. Confirming that's the desired support
   posture means we don't need to change anything until a real writer appears.

---

## 8. TL;DR

- `FileUpload.entity_type` enum has **no `documents` or `temp` values** —
  these are disk-directory names, not entity types.
- **No production code writes to `uploads/documents/*` or `uploads/temp/*`
  today.** The two production writers go to `applications/*` (entity:
  application) and `chat/*` (entity: chat), both of which are already covered
  by PR #415's per-resource ACL.
- One seeder (`09-applications.ts:616`) embeds a `/uploads/documents/...` URL
  in `Application.documents` JSON without creating a matching `FileUpload`
  row. Recommend moving to `applications/*` and emitting a real row.
- `LocalStorageProvider` is dead code that, if revived, would write into
  `documents/*` without an entity link. Recommend deciding its fate before any
  ACL changes.
- The "uploader-or-admin" fallback for `documents/*` and `temp/*` is safe
  *because nothing real lives there today*. No migration needed; revisit when a
  real writer is added.
